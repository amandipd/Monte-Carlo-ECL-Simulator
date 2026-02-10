import time
import random
import math

from config import N_LOANS

# Constants
HAZARD_RATE = 0.05  # 5% change of default per year


def calculate_single_default_prob(hazard_rate: float, time_horizon: float) -> bool:
    """
    Returns the probability a loan defaults with a given time horizon

    Params
    time_horizon: Time horizon in years
    """

    # Formula for probability of default
    PD = 1 - math.exp(-hazard_rate * time_horizon)

    # Generates float between 0.0 and 1.0
    random_roll = random.random()

    if random_roll < PD:
        return True  # Default occurred
    else:
        return False  # Loan survived


def run_simulation():
    start_time = time.time()
    defaults = 0

    # Bottleneck: Python For-Loop
    print(f"Starting simulation for {N_LOANS} loans ...")
    for _ in range(N_LOANS):

        pd = calculate_single_default_prob(HAZARD_RATE, 1.0)

        if pd:  # If default occurred
            defaults += 1

    end_time = time.time()
    elapsed_time = end_time - start_time

    results = {
        "defaults": defaults,
        "total_loans": N_LOANS,
        "default_rate": defaults / N_LOANS,
        "time_taken_seconds": elapsed_time,
        "method": "Naive Loop"
    }

    print(f"Results: {defaults} defaults / {N_LOANS} total.")
    print(f"Time Taken: {elapsed_time:.4f} seconds (Naive Loop)")

    # Save results to file
    output_file = "../results/naive_results.txt"
    with open(output_file, "w") as f:
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
