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

System specs: Intel Core Ultra 9 185H (16 cores / 22 threads), 16 GB RAM, Windows 11, Python 3.12, NumPy 2.5.1. One run each, `--seed 42` where supported. Each cell is **time · peak memory (RSS) · throughput**; peak memory for multicore is main process + all workers combined. All three strategies stream through fixed 50M-loan batches internally (`ecl_engine.MAX_BATCH_LOANS`), so per-run memory stays bounded instead of scaling with `n_loans`.

| Loans | Naive Loop | NumPy Vectorized | Multicore (22 workers) |
|---|---|---|---|
| 100,000,000 | 3.48 s · 31 MB · 28.7M/s | 0.51 s · 675 MB · 196.0M/s | 0.72 s · 520 MB · 138.8M/s |
| 1,000,000,000 | 37.34 s · 31 MB · 26.8M/s | 5.93 s · 796 MB · 168.8M/s | 5.80 s · 4,253 MB · 172.3M/s |
| 10,000,000,000 | 765.83 s (12.8 min) · 31 MB · 13.1M/s | 67.44 s · 796 MB · 148.3M/s | 68.01 s · 8,271 MB · 147.0M/s |

Vectorized and multicore stay neck-and-neck at scale — multicore's per-worker batching keeps memory bounded, but with 22 workers in flight its peak RSS still climbs into multi-GB territory (~8.3 GB at 10B loans), unlike vectorized's single flat ~0.8 GB. The naive loop has the smallest memory footprint by far (no array allocation at all) but is 10-50× slower.

A 100B-loan run was also attempted on this machine and failed: with only ~16 GB of RAM and other processes already using several GB, multicore's ~8+ GB working set left too little headroom and worker processes were killed with `ArrayMemoryError` / `BrokenProcessPool`, while the naive loop's projected runtime (~2+ hours) made it impractical to complete. Vectorized NumPy remains the only strategy with genuinely flat, scale-independent memory (previously measured at ~798 MB even at 100B loans) and is the recommended method for portfolios beyond what this table covers.

Redis-distributed execution (`risk_engine.queue.producer`/`.consumer`, 8 workers) was benchmarked separately at 100M loans: 0.75 s, about on par with multicore — process/IPC overhead only pays off once work is spread across machines rather than cores on one box.

Throughput and peak RSS are measured live during each run (`loop_calc.py`, `vectorized_calc.py`, and `multicore_calc.py` all poll `psutil.Process().memory_info().rss` on a background thread) and written to `results/*_results.txt` alongside the existing default-rate/ECL output.
