import argparse
import multiprocessing
import os
import threading
import time
from concurrent.futures import ProcessPoolExecutor

import numpy as np
import psutil

from risk_engine.config import N_LOANS, RESULTS_DIR
from risk_engine.monte_carlo.ecl_engine import (
    MAX_BATCH_LOANS,
    pd_from_macro_inputs,
    portfolio_ecl_from_defaults,
    resolve_macro_inputs,
)

N_CORES = multiprocessing.cpu_count()

def simulation_chunk(
    n_sims: int,
    unemployment: float | None = None,
    interest_rate: float | None = None,
    hpi: float | None = None,
    batch_size: int = MAX_BATCH_LOANS,
) -> int:
    """
    Run a smaller chunk of simulations using NumPy.
    This function will run on a separate CPU core (or Redis worker).

    Streams through fixed-size batches so a single chunk_size that is
    itself huge (e.g. a 100B-loan job split across few workers) doesn't
    allocate one giant array per worker.
    """
    pd = pd_from_macro_inputs(unemployment, interest_rate, hpi)

    defaults = 0
    remaining = n_sims
    while remaining > 0:
        batch = min(batch_size, remaining)
        random_rolls = np.random.random(batch)
        defaults += int(np.count_nonzero(random_rolls < pd))
        remaining -= batch
    return defaults

def run_parallel(
    unemployment: float | None = None,
    interest_rate: float | None = None,
    hpi: float | None = None,
    n_loans: int | None = None,
):
    n_loans = N_LOANS if n_loans is None else n_loans
    unemployment, interest_rate, hpi = resolve_macro_inputs(
        unemployment, interest_rate, hpi
    )

    start_time = time.time()
    print(f"Starting simulation for {n_loans:,} loans ...")
    print(
        f"Macro scenario: unemployment={unemployment:.2f}%, "
        f"interest={interest_rate:.2f}%, hpi={hpi:.2f}"
    )

    chunk_size = n_loans // N_CORES
    chunks = [chunk_size] * N_CORES

    main_proc = psutil.Process(os.getpid())
    peak_rss_bytes = main_proc.memory_info().rss
    stop_polling = threading.Event()

    def _total_rss() -> int:
        total = main_proc.memory_info().rss
        for child in main_proc.children(recursive=True):
            try:
                total += child.memory_info().rss
            except psutil.NoSuchProcess:
                pass
        return total

    def _poll_peak_rss():
        nonlocal peak_rss_bytes
        while not stop_polling.is_set():
            peak_rss_bytes = max(peak_rss_bytes, _total_rss())
            stop_polling.wait(0.05)

    poller = threading.Thread(target=_poll_peak_rss, daemon=True)
    poller.start()
    try:
        with ProcessPoolExecutor(max_workers=N_CORES) as executor:
            results = list(
                executor.map(
                    simulation_chunk,
                    chunks,
                    [unemployment] * N_CORES,
                    [interest_rate] * N_CORES,
                    [hpi] * N_CORES,
                )
            )
    finally:
        stop_polling.set()
        poller.join()
    peak_rss_bytes = max(peak_rss_bytes, _total_rss())

    total_defaults = sum(results)
    ecl = portfolio_ecl_from_defaults(total_defaults)
    elapsed_time = time.time() - start_time
    default_rate = total_defaults / n_loans
    peak_rss_mb = peak_rss_bytes / (1024 ** 2)
    throughput = n_loans / elapsed_time if elapsed_time > 0 else float("inf")

    results_dict = {
        "defaults": total_defaults,
        "total_loans": n_loans,
        "default_rate": default_rate,
        "expected_credit_loss": ecl,
        "time_taken_seconds": elapsed_time,
        "peak_memory_mb": peak_rss_mb,
        "throughput_loans_per_second": throughput,
        "method": "Multicore (ProcessPoolExecutor)",
    }

    print(f"Results: {total_defaults:,} defaults / {n_loans:,} total.")
    print(f"Expected Credit Loss: ${ecl:,.2f}")
    print(f"Time Taken: {elapsed_time:.4f} seconds (Multicore)")
    print(f"Peak Memory (main + workers): {peak_rss_mb:,.1f} MB")
    print(f"Throughput: {throughput:,.0f} loans/second")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_file = RESULTS_DIR / "multicore_results.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("Simulation Results\n")
        f.write("=" * 50 + "\n")
        f.write(f"Total Loans: {n_loans:,}\n")
        f.write(f"Defaults: {total_defaults:,}\n")
        f.write(
            f"Default Rate: {default_rate:.6f} ({default_rate * 100:.4f}%)\n"
        )
        f.write(f"Expected Credit Loss: ${ecl:,.2f}\n")
        f.write(f"Time Taken: {elapsed_time:.4f} seconds\n")
        f.write(f"Peak Memory (main + workers): {peak_rss_mb:,.1f} MB\n")
        f.write(f"Throughput: {throughput:,.0f} loans/second\n")
        f.write(f"Method: {results_dict['method']}\n")
        f.write(
            f"Macro Scenario: unemployment={unemployment:.2f}%, "
            f"interest={interest_rate:.2f}%, hpi={hpi:.2f}\n"
        )

    print(f"\nResults saved to {output_file}")
    return results_dict

def _parse_args():
    parser = argparse.ArgumentParser(description="Run multicore Monte Carlo ECL simulation.")
    parser.add_argument("--unemployment", type=float, default=None, help="Unemployment rate (%).")
    parser.add_argument("--interest", type=float, default=None, help="Interest rate (%).")
    parser.add_argument("--hpi", type=float, default=None, help="Housing price index.")
    parser.add_argument("--n-loans", type=int, default=None, help="Override N_LOANS from config.")
    return parser.parse_args()

if __name__ == "__main__":
    args = _parse_args()
    run_parallel(
        unemployment=args.unemployment,
        interest_rate=args.interest,
        hpi=args.hpi,
        n_loans=args.n_loans,
    )
