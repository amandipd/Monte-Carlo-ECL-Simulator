"""
Runner script to execute all simulation variants:
- Naive loop implementation
- NumPy vectorized implementation
- Multicore / ProcessPoolExecutor implementation
"""
from pathlib import Path

from loop_calc import run_simulation as run_naive_simulation
from vectorized_calc import run_simulation as run_vectorized_simulation
from multicore_calc import run_parallel as run_multicore_simulation


def main():
    """Run all simulations (naive, vectorized, multicore)."""

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
    print()
    print("=" * 70)
    print("RUNNING MULTICORE SIMULATION")
    print("=" * 70)
    print()
    run_multicore_simulation()

    print()
    print("=" * 70)
    print("ALL SIMULATIONS COMPLETE")
    print("=" * 70)

    # Aggregate individual result files into a single summary file
    _results_dir = Path(__file__).resolve().parent.parent.parent / "results"
    result_files = [
        (_results_dir / "naive_results.txt", "NAIVE SIMULATION RESULTS"),
        (_results_dir / "vectorized_results.txt", "VECTORIZED SIMULATION RESULTS"),
        (_results_dir / "multicore_results.txt", "MULTICORE SIMULATION RESULTS"),
    ]
    all_results_path = _results_dir / "all_results.txt"
    try:
        with open(all_results_path, "w", encoding="utf-8") as out:
            for path, heading in result_files:
                out.write(f"{heading}\n")
                out.write("-" * len(heading) + "\n")
                try:
                    with open(path, "r", encoding="utf-8") as infile:
                        out.write(infile.read().rstrip())
                except FileNotFoundError:
                    out.write(f"(Missing file: {path})")
                out.write("\n\n")

        print(f"\nCombined results written to {all_results_path}")
    except OSError as e:
        print(f"\nFailed to write combined results file: {e}")


if __name__ == "__main__":
    main()
