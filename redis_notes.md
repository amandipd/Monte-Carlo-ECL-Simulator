producer: splits work into jobs and pushes them into redis list
consumer: pulls jobs, runs simulation_chunk(load), pushes results back
start 1 + consumers then run producer