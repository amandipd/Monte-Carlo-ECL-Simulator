"""
Producer: pushes simulation jobs to Redis. Workers (consumers) process them.
After pushing, waits for all results and prints the total defaults.
"""
from config import N_LOANS, N_JOBS, REDIS_HOST, REDIS_PORT
import json
import sys
import time
from pathlib import Path
import redis

_src = Path(__file__).resolve().parent.parent
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

QUEUE_JOBS = "simulation_jobs"
QUEUE_RESULTS = "simulation_results"


def main():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
    chunk_size = N_LOANS // N_JOBS

    # Pushing N_JOBS onto redis list
    print(f"Pushing {N_JOBS} jobs (chunk size = {chunk_size:,} loans each)...")
    for i in range(1, N_JOBS + 1):
        job = {"id": i, "load": chunk_size}
        r.rpush(QUEUE_JOBS, json.dumps(job))
        print(f"  Pushed job {i}: load={chunk_size:,}")
