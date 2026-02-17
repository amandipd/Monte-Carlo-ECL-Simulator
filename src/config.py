"""
Load simulation settings from environment / .env.
Edit .env in the project root to change N_LOANS, HAZARD_RATE, TIME_HORIZON, Redis, etc.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (parent of src/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# Project root and results directory
PROJECT_ROOT = _env_path.parent
RESULTS_DIR = PROJECT_ROOT / "results"

# Number of loans to simulate (default 100M if not set)
N_LOANS = int(os.getenv("N_LOANS", "100000000"))

# Simulation model parameters (PD = 1 - exp(-HAZARD_RATE * TIME_HORIZON))
HAZARD_RATE = float(os.getenv("HAZARD_RATE", "0.05"))  # default 5% chance of default per year
TIME_HORIZON = float(os.getenv("TIME_HORIZON", "1.0"))  # default 1 year

# Redis for distributed job queue
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

# How many jobs to split work into (more jobs = more workers can run in parallel)
N_JOBS = int(os.getenv("N_JOBS", "10"))

