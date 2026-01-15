"""
Runner script to execute both naive and vectorized simulations.
"""

from main_naive import run_simulation as run_naive_simulation
from math_vectorized import run_simulation as run_vectorized_simulation


def main():
    """Run all simulations."""

    print("=" * 70)
    print("RUNNING NAIVE SIMULATION")
    print("=" * 70)
    print()
    run_naive_simulation()

    print()
    print()
    print("=" * 70)
    print("RUNNING VECTORIZED SIMULATION")
    print("=" * 70)
    print()
    run_vectorized_simulation()

    print()
    print("=" * 70)
    print("ALL SIMULATIONS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
