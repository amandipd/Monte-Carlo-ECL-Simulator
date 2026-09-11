# Monte Carlo Expected Credit Loss Simulator

Forecasts **Expected Credit Loss (ECL)** on a loan portfolio under macroeconomic stress (unemployment, interest rates, housing prices) using Monte Carlo default simulation. The same simulation is implemented four ways — naive Python, vectorized NumPy, multi-core, and Redis-distributed — to compare execution speed at scale.

## Install

```bash
poetry install
cp .env.example .env
```

## Run

```bash
poetry run python -m risk_engine.monte_carlo.vectorized_calc --n-loans 1000000
```

Other methods: `risk_engine.monte_carlo.loop_calc`, `.multicore_calc`, `.run_all` (runs all three), and the Redis-distributed pair `risk_engine.queue.producer` / `.consumer`. Results are written to `results/*.txt`.

## Benchmark

Same 100,000,000-loan portfolio, same machine, one run each:

| Method | Time | Speedup vs. naive |
|---|---|---|
| Naive Python loop | 3.68 s | 1.0× |
| NumPy vectorized | 0.47 s | 7.8× |
| Multicore (ProcessPoolExecutor) | 0.67 s | 5.5× |
| Redis-distributed (8 workers) | 0.75 s | 4.9× |

Vectorized NumPy wins outright at this scale — multicore and Redis pay process/IPC overhead that only pays off on even larger portfolios or when work is spread across machines.
