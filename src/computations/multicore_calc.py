from config import N_LOANS
import sys
import multiprocessing
import time
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from pathlib import Path

_src = Path(__file__).resolve().parent.parent
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

N_CORES = multiprocessing.cpu_count()
HAZARD_RATE = 0.05  # 5% change of default per year
TIME_HORIZON = 1.0


def simulation_chunk(n_sims):
    """
    Runs a smaller chunk of simulations using NumPy.
    This function will run on a separate CPU core.
    """
    random_rolls = np.random.random(n_sims)

    # Formula for probability of default
    PD = 1 - np.exp(-HAZARD_RATE * TIME_HORIZON)

    defaults = np.count_nonzero(random_rolls < PD)

    return defaults


def run_parallel():
    start_time = time.time()

    print(f"Starting simulation for {N_LOANS} loans ...")

    # Split the work
    chunk_size = N_LOANS // N_CORES
    chunks = [chunk_size] * N_CORES

    with ProcessPoolExecutor(max_workers=N_CORES) as executor:
        results = list(executor.map(simulation_chunk, chunks))

    total_defaults = sum(results)
    end_time = time.time()
    elapsed_time = end_time - start_time

    default_rate = total_defaults / N_LOANS
    results_dict = {
        "defaults": total_defaults,
        "total_loans": N_LOANS,
        "default_rate": default_rate,
        "time_taken_seconds": elapsed_time,
        "method": "Multicore (ProcessPoolExecutor)",
    }

    print(f"Results: {total_defaults} defaults / {N_LOANS} total.")
    print(f"Time Taken: {elapsed_time:.4f} seconds (Multicore)")

    # Save results to file (project root / results)
    _results_dir = Path(__file__).resolve().parent.parent.parent / "results"
    output_file = _results_dir / "multicore_results.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("Simulation Results\n")
        f.write("=" * 50 + "\n")
        f.write(f"Total Loans: {N_LOANS:,}\n")
        f.write(f"Defaults: {total_defaults:,}\n")
        f.write(
            f"Default Rate: {results_dict['default_rate']:.6f} ({results_dict['default_rate']*100:.4f}%)\n"
        )
        f.write(f"Time Taken: {elapsed_time:.4f} seconds\n")
        f.write(f"Method: {results_dict['method']}\n")

    print(f"\nResults saved to {output_file}")


if __name__ == '__main__':
    run_parallel()
