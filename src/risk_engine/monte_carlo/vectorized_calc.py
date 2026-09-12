import argparse
import os
import threading
import time

import psutil

from risk_engine.config import N_LOANS, RESULTS_DIR
from risk_engine.monte_carlo.ecl_engine import (
    portfolio_ecl_from_defaults,
    resolve_macro_inputs,
    simulate_defaults,
)

def run_simulation(
    unemployment: float | None = None,
    interest_rate: float | None = None,
    hpi: float | None = None,
    n_loans: int | None = None,
    seed: int | None = None,
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

    proc = psutil.Process(os.getpid())
    peak_rss_bytes = proc.memory_info().rss
    stop_polling = threading.Event()

    def _poll_peak_rss():
        nonlocal peak_rss_bytes
        while not stop_polling.is_set():
            peak_rss_bytes = max(peak_rss_bytes, proc.memory_info().rss)
            stop_polling.wait(0.05)

    poller = threading.Thread(target=_poll_peak_rss, daemon=True)
    poller.start()
    try:
        defaults = simulate_defaults(
            n_loans,
            unemployment=unemployment,
            interest_rate=interest_rate,
            hpi=hpi,
            seed=seed,
        )
    finally:
        stop_polling.set()
        poller.join()
    peak_rss_bytes = max(peak_rss_bytes, proc.memory_info().rss)

    ecl = portfolio_ecl_from_defaults(defaults)

    elapsed_time = time.time() - start_time
    default_rate = defaults / n_loans
    peak_rss_mb = peak_rss_bytes / (1024 ** 2)
    throughput = n_loans / elapsed_time if elapsed_time > 0 else float("inf")

    results = {
        "defaults": defaults,
        "total_loans": n_loans,
        "default_rate": default_rate,
        "expected_credit_loss": ecl,
        "time_taken_seconds": elapsed_time,
        "peak_memory_mb": peak_rss_mb,
        "throughput_loans_per_second": throughput,
        "method": "NumPy Vectorization",
    }

    print(f"Results: {defaults:,} defaults / {n_loans:,} total.")
    print(f"Expected Credit Loss: ${ecl:,.2f}")
    print(f"Time Taken: {elapsed_time:.4f} seconds (NumPy Vectorization)")
    print(f"Peak Memory: {peak_rss_mb:,.1f} MB")
    print(f"Throughput: {throughput:,.0f} loans/second")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_file = RESULTS_DIR / "vectorized_results.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("Simulation Results\n")
        f.write("=" * 50 + "\n")
        f.write(f"Total Loans: {n_loans:,}\n")
        f.write(f"Defaults: {defaults:,}\n")
        f.write(
            f"Default Rate: {default_rate:.6f} ({default_rate * 100:.4f}%)\n"
        )
        f.write(f"Expected Credit Loss: ${ecl:,.2f}\n")
        f.write(f"Time Taken: {elapsed_time:.4f} seconds\n")
        f.write(f"Peak Memory: {peak_rss_mb:,.1f} MB\n")
        f.write(f"Throughput: {throughput:,.0f} loans/second\n")
        f.write(f"Method: {results['method']}\n")
        f.write(
            f"Macro Scenario: unemployment={unemployment:.2f}%, "
            f"interest={interest_rate:.2f}%, hpi={hpi:.2f}\n"
        )

    print(f"\nResults saved to {output_file}")
    return results

def _parse_args():
    parser = argparse.ArgumentParser(description="Run vectorized Monte Carlo ECL simulation.")
    parser.add_argument("--unemployment", type=float, default=None, help="Unemployment rate (%).")
    parser.add_argument("--interest", type=float, default=None, help="Interest rate (%).")
    parser.add_argument("--hpi", type=float, default=None, help="Housing price index.")
    parser.add_argument("--n-loans", type=int, default=None, help="Override N_LOANS from config.")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility.")
    return parser.parse_args()

if __name__ == "__main__":
    args = _parse_args()
    run_simulation(
        unemployment=args.unemployment,
        interest_rate=args.interest,
        hpi=args.hpi,
        n_loans=args.n_loans,
        seed=args.seed,
    )
