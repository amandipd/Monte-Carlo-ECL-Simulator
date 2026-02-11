# Distributed Monte Carlo Risk Engine
A quantitative risk system designed to execute Monte Carlo simulations on 10M+ loan portfolios to forecast Expected Credit loss under volatile economic conditions.

## Setup (Poetry)

**Prerequisites:** Python 3.13+, [Poetry](https://python-poetry.org/docs/#installation).

Install dependencies and create the virtual environment:

```bash
poetry install
```

(Optional) Activate the environment so you can run `python` directly:

```bash
poetry shell
```

## Running the simulations

From the project root, run any of these with Poetry so the correct env is used:

```bash
# Naive loop (slow baseline) — writes results/naive_results.txt
poetry run python src/main_naive.py

# Vectorized NumPy (fast single-process) — writes results/vectorized_results.txt
poetry run python src/math_vectorized.py

# Multi-core parallel (uses all CPU cores)
poetry run python src/main_multi.py

# Run both naive and vectorized in sequence
poetry run python src/run_all_simulations.py
```

If you’re already in `poetry shell`, you can drop the `poetry run` prefix and use e.g. `python src/main_naive.py`.

## Architecture & Roadmap (v2 Python Migration)
The initial prototype I created was in TypeScript (archived in branch v1-typescript-prototype), where I validated the core PD/LGD algorithms used to calculate ECL. In this main branch, I plan to implement a distributed architecture using Python, Numpy, and Redis. Instead of using the Node.js event loop, I plan to use vectorized multiprocessing to split the simulation tasks across CPU cores in hopes of significantly reducing calculation time.
