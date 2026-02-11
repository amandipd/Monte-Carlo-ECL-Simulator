# Phase 2 Implementation Plan: The Architecture

## 🎯 What You're Building

You're moving from a **single-machine, multi-core** system to a **distributed system** where:
- **Producer**: Creates simulation jobs and puts them in a queue
- **Redis**: Acts as a message broker (the queue)
- **Workers**: Multiple containers that pull jobs and process them
- **Docker**: Packages everything so it runs the same way everywhere

**Key Concept**: Instead of splitting work across CPU cores on one machine, you're splitting work across multiple machines/containers.

---

## 📅 Week 5: The Broker (Redis)

### Understanding Redis (Quick Primer)

**Redis** is an in-memory database that can act as a message queue. Think of it like a shared mailbox:
- **Producer** puts messages (jobs) into the mailbox
- **Workers** take messages from the mailbox and process them
- **`rpush`**: Adds an item to the right end of a list (like putting mail in the box)
- **`blpop`**: Blocks and waits until an item appears, then removes it (like checking mail)

### Step 1: Install Docker & Run Redis

**Your Challenge**: Install Docker Desktop if you haven't already.

**Windows Instructions**:
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install and restart your computer if needed
3. Open Docker Desktop and wait for it to start (whale icon in system tray)

**Then run this command**:
```bash
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

**What this does**:
- `-d`: Run in detached mode (background)
- `--name redis-stack`: Give it a friendly name
- `-p 6379:6379`: Map port 6379 (Redis default) to your machine
- `-p 8001:8001`: Map port 8001 (RedisInsight UI) to your machine
- `redis/redis-stack:latest`: The image to use

**Verify it's running**:
```bash
docker ps
```
You should see `redis-stack` in the list.

**Check the UI**: Open `http://localhost:8001` in your browser. You should see RedisInsight.

**Your Problem to Solve**: What happens if you try to run the command again? (It will fail - why?) How do you fix it?

---

### Step 2: Add Redis Python Client

```bash
poetry add redis
```

This adds the `redis` Python package to your dependencies.

---

### Step 3: Create the Producer (`src/producer.py`)

**Your Challenge**: Create this file and implement the TODOs.

**Skeleton Code**:
```python
import redis
import json

# Connect to Redis
# TODO: Create a Redis client connection
# Hint: redis.Redis(host='localhost', port=6379, db=0)
# Store it in a variable called 'r'

def create_job(job_id: int, load: int) -> dict:
    """Creates a job dictionary."""
    return {
        "id": job_id,
        "load": load
    }

def push_job(job: dict):
    """Pushes a job to the Redis queue."""
    # TODO: Convert the job dict to JSON string
    # TODO: Use r.rpush('simulation_jobs', json_string)
    # Hint: json.dumps() converts dict to string
    pass

if __name__ == "__main__":
    # Test: Push 3 jobs
    for i in range(1, 4):
        job = create_job(i, 100000)
        push_job(job)
        print(f"Pushed job {i}: {job}")
```

**Your Problem to Solve**:
1. What happens if Redis isn't running? (Try it!)
2. How would you handle that error gracefully?

**Checkpoint**: Run `poetry run python src/producer.py`. It should print 3 jobs being pushed.

**Verify in RedisInsight**:
1. Go to `http://localhost:8001`
2. Click "Browser" in the left sidebar
3. Find the key `simulation_jobs`
4. You should see 3 items in the list!

---

### Step 4: Create the Consumer (`src/consumer.py`)

**Your Challenge**: Create this file and implement the TODOs.

**Skeleton Code**:
```python
import redis
import json
import time

# TODO: Connect to Redis (same as producer)
# Store connection in variable 'r'

def process_job(job_data: dict):
    """
    Processes a single job.
    For now, just print it. Later, we'll run the actual simulation.
    """
    print(f"Received job! ID: {job_data['id']}, Load: {job_data['load']}")

def consume_jobs():
    """
    Main loop: Waits for jobs and processes them.
    """
    print("Consumer started. Waiting for jobs...")
    
    while True:
        # TODO: Use r.blpop('simulation_jobs', timeout=1)
        # blpop returns (list_name, value) or None if timeout
        # If you get a job:
        #   1. Parse the JSON string (json.loads())
        #   2. Call process_job() with the parsed dict
        # If timeout (None), just continue the loop
        pass

if __name__ == "__main__":
    try:
        consume_jobs()
    except KeyboardInterrupt:
        print("\nConsumer stopped.")
```

**Your Problem to Solve**:
1. What does `blpop` do differently than `lpop`? (Hint: the 'b' stands for "blocking")
2. Why do we need a timeout? What happens if we set it to 0?

**Checkpoint**:
1. Open **two terminals**
2. In Terminal 1: Run `poetry run python src/consumer.py`
3. In Terminal 2: Run `poetry run python src/producer.py`
4. You should see "Received job!" messages appear in Terminal 1!

**Your Problem to Solve**: What happens if you run the producer multiple times? Do the jobs queue up?

---

## 📅 Week 6 & 7: Containerization

### Understanding Docker (Quick Primer)

**Docker** packages your application and its dependencies into a "container" - like a shipping container that works the same way on any machine.

**Key Concepts**:
- **Dockerfile**: Recipe for building your container image
- **Image**: The built package (like a class in programming)
- **Container**: A running instance of an image (like an object)
- **Docker Compose**: Orchestrates multiple containers working together

**Layer Caching**: Docker builds images in layers. If a layer hasn't changed, Docker reuses it. That's why you copy dependencies first, then code - code changes more often!

---

### Step 1: Create the Dockerfile

**Your Challenge**: Create `Dockerfile` in the root directory.

**Skeleton**:
```dockerfile
# Base image
FROM python:3.10-slim

# Set working directory inside container
WORKDIR /app

# TODO: Copy dependency files first (for layer caching!)
# Copy pyproject.toml and poetry.lock

# TODO: Install Poetry
# Hint: pip install poetry

# TODO: Configure Poetry (don't create virtual env - we're in a container!)
# Hint: poetry config virtualenvs.create false

# TODO: Install dependencies
# Hint: poetry install --no-interaction --no-root

# TODO: Copy the rest of your code
# Copy src/ directory

# TODO: Set the default command
# Hint: CMD ["python", "src/consumer.py"]
```

**Your Problem to Solve**:
1. Why do we use `python:3.10-slim` instead of `python:3.10`?
2. What happens if you put `COPY src/` before `COPY pyproject.toml`? (Try it and see how long it takes to rebuild!)

**Test the Dockerfile**:
```bash
docker build -t risk-engine-worker .
```

This builds an image named `risk-engine-worker`.

**Your Problem to Solve**: What does the `-t` flag do? What does the `.` at the end mean?

---

### Step 2: Create docker-compose.yml

**Your Challenge**: Create `docker-compose.yml` in the root directory.

**Skeleton**:
```yaml
version: '3.8'

services:
  redis:
    image: redis/redis-stack:latest
    ports:
      - "6379:6379"
      - "8001:8001"
    # TODO: Add a healthcheck
    # Hint: Use 'redis-cli ping' command

  worker:
    build: .
    depends_on:
      - redis
    # TODO: Set environment variable for Redis host
    # In Docker Compose, services can talk using service names!
    # Hint: environment: REDIS_HOST=redis
    # TODO: Make sure your Python code uses this env var instead of 'localhost'
    command: python src/consumer.py
    # TODO: Scale this to 3 instances (hint: use docker-compose up --scale)

  api:
    build: .
    depends_on:
      - redis
    # TODO: This will be your entry point later
    # For now, just make it run producer.py
    command: python src/producer.py
```

**Your Problem to Solve**:
1. Why can't the worker use `host='localhost'` in Docker Compose?
2. What's the difference between `depends_on` and actually waiting for Redis to be ready?

---

### Step 3: Fix the Connection Retry Problem

**The Problem**: Your worker will try to connect to Redis immediately, but Redis might not be ready yet. This causes crashes.

**Your Challenge**: Modify `src/consumer.py` to retry the connection.

**Skeleton for retry logic**:
```python
import redis
import time

def connect_with_retry(host='localhost', port=6379, max_retries=5, retry_delay=2):
    """
    Attempts to connect to Redis with retries.
    
    Your Challenge: Implement this!
    - Try to create a Redis connection
    - If it fails (ConnectionError), wait and retry
    - Print a message each retry attempt
    - After max_retries, raise the error
    """
    for attempt in range(max_retries):
        try:
            # TODO: Try to create connection
            # TODO: Test it with r.ping()
            # TODO: If successful, return the connection
            pass
        except (redis.ConnectionError, redis.TimeoutError) as e:
            if attempt < max_retries - 1:
                print(f"Connection failed (attempt {attempt + 1}/{max_retries}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached. Exiting.")
                raise
```

**Your Problem to Solve**:
1. What other errors might occur? Should you catch them all?
2. How would you make the retry delay increase with each attempt? (Exponential backoff)

**Update your consumer**:
```python
# At the top of consumer.py
import os

# Get Redis host from environment variable (defaults to localhost)
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
r = connect_with_retry(host=REDIS_HOST)
```

---

### Step 4: Test Everything

**Build and run**:
```bash
docker-compose up --build
```

**Your Problem to Solve**: What does `--build` do? When would you skip it?

**Scale workers**:
```bash
docker-compose up --scale worker=3
```

**Checkpoint**: You should see:
```
worker-1 | Connected to Redis... Waiting for jobs.
worker-2 | Connected to Redis... Waiting for jobs.
worker-3 | Connected to Redis... Waiting for jobs.
```

**Your Problem to Solve**:
1. How can you verify all 3 workers are actually running? (Hint: `docker ps`)
2. What happens if you push 10 jobs? Do all workers get jobs?

---

## 🎓 Learning Resources

### Docker
- **Docker Docs**: https://docs.docker.com/get-started/
- **Layer Caching**: https://docs.docker.com/build/cache/
- **Docker Compose**: https://docs.docker.com/compose/

### Redis
- **Redis Python Client**: https://redis-py.readthedocs.io/
- **Redis Lists**: https://redis.io/docs/data-types/lists/
- **BLPOP Command**: https://redis.io/commands/blpop/

### Concepts
- **Producer-Consumer Pattern**: https://en.wikipedia.org/wiki/Producer%E2%80%93consumer_problem
- **Message Queues**: Think of Redis as a simple message queue (like RabbitMQ or Kafka, but simpler)

---

## ✅ Progress Checklist

### Week 5
- [ ] Docker installed and Redis container running
- [ ] Can access RedisInsight at localhost:8001
- [ ] `redis` package added via Poetry
- [ ] `producer.py` created and pushes jobs to Redis
- [ ] `consumer.py` created and pulls jobs from Redis
- [ ] Can see jobs flow from producer to consumer

### Week 6-7
- [ ] `Dockerfile` created and builds successfully
- [ ] `docker-compose.yml` created with 3 services
- [ ] Connection retry logic implemented
- [ ] Can run `docker-compose up` successfully
- [ ] Can scale workers to 3 instances
- [ ] All workers connect and wait for jobs

---

## 🐛 Common Issues & Solutions

### "Connection refused" when connecting to Redis
- **Problem**: Redis isn't ready yet
- **Solution**: Implement retry logic (Step 3 above)

### "Module not found" in Docker container
- **Problem**: Dependencies not installed
- **Solution**: Check your Dockerfile - did you run `poetry install`?

### "Address already in use" when starting Redis
- **Problem**: Port 6379 or 8001 already in use
- **Solution**: Stop existing Redis container: `docker stop redis-stack`

### Workers don't get jobs
- **Problem**: Jobs might be going to one worker only
- **Solution**: This is actually correct! `blpop` distributes jobs. Push more jobs to see all workers active.

---

## 🚀 Next Steps After Phase 2

Once you complete this phase, you'll have:
- A distributed system that can scale horizontally
- Jobs queued in Redis
- Multiple worker containers processing jobs
- Everything containerized and portable

**Next**: In Phase 3, you'll add:
- Proper logging (not just print statements)
- Metrics and observability
- Better error handling
- Results storage

---

## 💡 Tips for Problem Solving

1. **Read error messages carefully** - They usually tell you exactly what's wrong
2. **Test incrementally** - Don't build everything at once. Test each piece
3. **Use Docker logs** - `docker logs <container-name>` shows what's happening inside
4. **Check RedisInsight** - Visual feedback is your friend
5. **Google is your friend** - But try to understand, don't just copy

Good luck! 🎉
