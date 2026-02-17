import sys
import time
from pathlib import Path

import numpy as np

_src = Path(__file__).resolve().parent.parent
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from config import HAZARD_RATE, N_LOANS, RESULTS_DIR, TIME_HORIZON


def run_simulation():
    start_time = time.time()

    print(f"Starting simulation for {N_LOANS} loans ...")

    # Generates NumPy array of random values between 0 and 1 of length N_LOANS.
    random_rolls = np.random.random(N_LOANS)

    # Formula for probability of default
    PD = 1 - np.exp(-HAZARD_RATE * TIME_HORIZON)

    defaults = np.count_nonzero(random_rolls < PD)

    end_time = time.time()
    elapsed_time = end_time - start_time

    results = {
        "defaults": defaults,
        "total_loans": N_LOANS,
        "default_rate": defaults / N_LOANS,
        "time_taken_seconds": elapsed_time,
        "method": "NumPy Vectorization"
    }

    print(f"Results: {defaults} defaults / {N_LOANS} total.")
    print(f"Time Taken: {elapsed_time:.4f} seconds (NumPy Vectorization)")

    # Save results to file
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_file = RESULTS_DIR / "vectorized_results.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("Simulation Results\n")
        f.write("=" * 50 + "\n")
        f.write(f"Total Loans: {N_LOANS:,}\n")
        f.write(f"Defaults: {defaults:,}\n")
        f.write(
            f"Default Rate: {results['default_rate']:.6f} ({results['default_rate']*100:.4f}%)\n")
        f.write(f"Time Taken: {elapsed_time:.4f} seconds\n")
        f.write(f"Method: {results['method']}\n")

    print(f"\nResults saved to {output_file}")


if __name__ == "__main__":
    run_simulation()
