import json
import sys
import time
from pathlib import Path
import redis

_src = Path(__file__).resolve().parent.parent
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from config import REDIS_HOST, REDIS_PORT
from computations.multicore_calc import simulation_chunk

QUEUE_JOBS = "simulation_jobs"
QUEUE_RESULTS = "simulation_results"
POP_TIMEOUT = 1 # in seconds;l short so we can react to shutdown

def main():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
    print("Connected to Redis. Waiting for jobs...")

    while True:
        raw = r.blpop(QUEUE_JOBS, timeout=POP_TIMEOUT)
        if raw is None:
            continue
        _, job_json = raw
        job = json.loads(job_json)
        job_id = job["id"]
        load = job["load"]

        defaults = simulation_chunk(load)
        result = {"id": job_id, "defaults": int(defaults)}
        r.rpush(QUEUE_RESULTS, json.dumps(result))
        print(f"  Job {job_id} done: {defaults:,} defaults (load={load:,})")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nConsumer stopped.")


