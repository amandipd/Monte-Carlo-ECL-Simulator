import time
import random
import math

# Constants
HAZARD_RATE = 0.05  # 5% change of default per year
N_LOANS = 10_000_000  # Number of loans


def calculate_single_default_prob(time_horizon: float) -> bool:
    """
    Returns the probability a loan defaults with a given time horizon

    Params
    time_horizon: Time horizon in years
    """

    # Formula for probability of default
    PD = 1 - math.exp(-HAZARD_RATE * time_horizon)

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

        pd = calculate_single_default_prob(1.0)

        if pd:  # If default occurred
            defaults += 1

    end_time = time.time()
    print(f"Results: {defaults} defaults / {N_LOANS} total.")
    print(f"Time Taken: {end_time - start_time:.4f} seconds (Naive Loop)")


if __name__ == "__main__":
    run_simulation()
