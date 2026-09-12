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

### Scaling to 10B and 100B loans (NumPy vectorized)

System specs: Intel Core Ultra 9 185H (16 cores / 22 threads), 16 GB RAM, Windows 11, Python 3.12, NumPy 2.5.1.

The original implementation generated one `rng.random(n_loans)` array per run — fine at 100M loans (~0.8 GB) but infeasible past that: a 10B-loan array needs ~80 GB and a 100B-loan array needs ~800 GB, far beyond this machine's 16 GB of RAM. `simulate_defaults` (`src/risk_engine/monte_carlo/ecl_engine.py`) now streams through fixed 50M-loan batches, so peak memory stays roughly constant regardless of portfolio size. One run each, `--seed 42`:

| Loans | Time | Peak Memory | Throughput |
|---|---|---|---|
| 100,000,000 | 0.73 s | 716 MB | 136M loans/s |
| 10,000,000,000 | 84.4 s | 797 MB | 118M loans/s |
| 100,000,000,000 | 590.4 s (9.8 min) | 798 MB | 169M loans/s |

Peak memory is flat (~0.8 GB) across three orders of magnitude in portfolio size — a direct result of the batching. Time scales roughly linearly with `n_loans`, as expected for an embarrassingly parallel per-loan draw with no cross-loan dependence. Throughput and peak RSS are measured live during each run (`vectorized_calc.py` polls `psutil.Process().memory_info().rss` on a background thread) and written to `results/vectorized_results.txt` alongside the existing default-rate/ECL output.
