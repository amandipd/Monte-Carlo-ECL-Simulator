# Phase 2 Quick Reference Guide

## 🐳 Docker Commands

### Basic Docker Operations
```bash
# Check if Docker is running
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop redis-stack

# Remove a container
docker rm redis-stack

# View container logs
docker logs redis-stack
docker logs -f redis-stack  # Follow logs (like tail -f)

# Build an image
docker build -t risk-engine-worker .

# Run a container from an image
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
```

### Docker Compose Commands
```bash
# Start all services
docker-compose up

# Start in background (detached)
docker-compose up -d

# Rebuild images before starting
docker-compose up --build

# Scale a service
docker-compose up --scale worker=3

# Stop all services
docker-compose down

# View logs
docker-compose logs
docker-compose logs worker  # Just worker logs
docker-compose logs -f worker  # Follow worker logs

# Execute command in running container
docker-compose exec worker python src/producer.py
```

---

## 🔴 Redis Commands (via redis-cli)

### Connect to Redis
```bash
# If Redis is running in Docker
docker exec -it redis-stack redis-cli

# If Redis is installed locally
redis-cli
```

### Basic Redis Operations (in redis-cli)
```bash
# Check if Redis is alive
PING  # Should return PONG

# View all keys
KEYS *

# View a list
LRANGE simulation_jobs 0 -1  # View all items in list

# Get list length
LLEN simulation_jobs

# Clear a key
DEL simulation_jobs

# Monitor commands in real-time
MONITOR
```

---

## 🐍 Python Redis Client Examples

### Basic Connection
```python
import redis

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)

# Test connection
r.ping()  # Returns True if connected
```

### List Operations (for Job Queue)
```python
# Push to list (right side)
r.rpush('simulation_jobs', '{"id": 1, "load": 100000}')

# Push to list (left side)
r.lpush('simulation_jobs', '{"id": 1, "load": 100000}')

# Pop from list (left side, non-blocking)
job = r.lpop('simulation_jobs')  # Returns None if empty

# Pop from list (left side, blocking - waits for item)
job = r.blpop('simulation_jobs', timeout=1)  
# Returns (list_name, value) tuple or None if timeout

# Get list length
length = r.llen('simulation_jobs')

# Get all items (careful with large lists!)
all_jobs = r.lrange('simulation_jobs', 0, -1)
```

### Working with JSON
```python
import json

# Convert dict to JSON string
job = {"id": 1, "load": 100000}
job_json = json.dumps(job)

# Push JSON string
r.rpush('simulation_jobs', job_json)

# Pop and parse
result = r.blpop('simulation_jobs', timeout=1)
if result:
    list_name, job_json = result
    job = json.loads(job_json)
```

---

## 🔍 Debugging Commands

### Check if Redis is accessible
```bash
# From your machine
telnet localhost 6379
# Or
nc -zv localhost 6379
```

### Check what's in Redis
```bash
# Via Docker
docker exec -it redis-stack redis-cli
> KEYS *
> LLEN simulation_jobs
> LRANGE simulation_jobs 0 -1
```

### View Docker container network
```bash
docker network ls
docker network inspect <network_name>
```

### Check environment variables in container
```bash
docker-compose exec worker env
```

---

## 📝 Common Patterns

### Retry Connection Pattern
```python
import redis
import time

def connect_with_retry(host='localhost', port=6379, max_retries=5):
    for attempt in range(max_retries):
        try:
            r = redis.Redis(host=host, port=port, db=0)
            r.ping()  # Test connection
            return r
        except redis.ConnectionError:
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise
```

### Consumer Loop Pattern
```python
import redis
import json

r = redis.Redis(host='localhost', port=6379)

while True:
    result = r.blpop('simulation_jobs', timeout=1)
    if result:
        list_name, job_json = result
        job = json.loads(job_json)
        # Process job here
        process_job(job)
```

### Producer Pattern
```python
import redis
import json

r = redis.Redis(host='localhost', port=6379)

job = {"id": 1, "load": 100000}
r.rpush('simulation_jobs', json.dumps(job))
```

---

## 🎯 Testing Your Setup

### Test 1: Redis is running
```bash
docker ps | grep redis
# Should show redis-stack container
```

### Test 2: Redis is accessible
```bash
docker exec -it redis-stack redis-cli PING
# Should return: PONG
```

### Test 3: Producer works
```bash
poetry run python src/producer.py
# Should print: "Pushed job X"
```

### Test 4: Consumer receives jobs
```bash
# Terminal 1
poetry run python src/consumer.py

# Terminal 2
poetry run python src/producer.py

# Terminal 1 should show: "Received job!"
```

### Test 5: Docker Compose works
```bash
docker-compose up --build
# Should see all services start
```

---

## 🆘 Troubleshooting Checklist

- [ ] Is Docker Desktop running?
- [ ] Is Redis container running? (`docker ps`)
- [ ] Can you access RedisInsight? (`http://localhost:8001`)
- [ ] Are ports 6379 and 8001 free?
- [ ] Did you add `redis` package? (`poetry add redis`)
- [ ] Are you using the correct host? (`localhost` for local, `redis` for Docker Compose)
- [ ] Did you implement retry logic?
- [ ] Are environment variables set correctly?

---

## 📚 File Structure After Phase 2

```
project-root/
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── poetry.lock
├── src/
│   ├── __init__.py
│   ├── producer.py        # NEW
│   ├── consumer.py        # NEW
│   ├── main_naive.py
│   ├── main_multi.py
│   └── math_vectorized.py
└── tests/
    └── test_math.py
```
