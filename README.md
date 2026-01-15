# Distributed Monte Carlo Risk Engine
A quantitative risk system designed to execute Monte Carlo simulations on 10M+ loan portfolios to forecast Expected Credit loss under volatile economic conditions.

## Architecture & Roadmap (v2 Python Migration)
The initial prototype I created was in TypeScript (archived in branch v1-typescript-prototype), where I validated the core PD/LGD algorithms used to calculate ECL. In this main branch, I plan to implement a distributed architecture using Python, Numpy, and Redis. Instead of using the Node.js event loop, I plan to use vectorized multiprocessing to split the simulation tasks across CPU cores in hopes of significantly reducing calculation time.
