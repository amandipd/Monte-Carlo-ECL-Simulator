"""
Load simulation settings from environment / .env.
Edit .env in the project root to change N_LOANS (and compare runtimes).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (parent of src/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# Number of loans to simulate (default 100M if not set)
N_LOANS = int(os.getenv("N_LOANS", "100000000"))

# Redis for distributed job queue
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

# How many jobs to split work into (more jobs = more workers can run in parallel)
N_JOBS = int(os.getenv("N_JOBS", "10"))
