"""Redis cache for simulation results (separate from Redis-distributed job queues)."""
import json

import redis

from risk_engine.config import ECL_CACHE_ENABLED, ECL_CACHE_TTL, REDIS_HOST, REDIS_PORT

class ECLCache:
    """Optional Redis cache for predicted ECL values."""

    def __init__(
        self,
        *,
        enabled: bool | None = None,
        ttl_seconds: int | None = None,
        redis_client: redis.Redis | None = None,
    ) -> None:
        self.enabled = ECL_CACHE_ENABLED if enabled is None else enabled
        self.ttl_seconds = ECL_CACHE_TTL if ttl_seconds is None else ttl_seconds
        self._client = redis_client
        self._available = redis_client is not None

    @classmethod
    def connect(cls, **kwargs) -> "ECLCache":
        """Create a cache instance and probe Redis when enabled."""
        cache = cls(**kwargs)
        if cache.enabled and cache._client is None:
            try:
                client = redis.Redis(
                    host=REDIS_HOST,
                    port=REDIS_PORT,
                    db=0,
                    decode_responses=True,
                    socket_connect_timeout=2,
                )
                client.ping()
                cache._client = client
                cache._available = True
            except redis.RedisError:
                cache._available = False
        return cache

    @property
    def available(self) -> bool:
        return self.enabled and self._available and self._client is not None

    def get_json(self, key: str) -> dict | None:
        """Fetch and decode a JSON payload stored under an arbitrary key.

        Used for entries such as ``sim_result:{job_id}``. Degrades gracefully
        when Redis is unavailable.
        """
        if not self.available:
            return None

        try:
            raw = self._client.get(key)
        except redis.RedisError:
            self._available = False
            return None

        if raw is None:
            return None

        try:
            return json.loads(raw)
        except (TypeError, ValueError, json.JSONDecodeError):
            return None

    def set_json(
        self,
        key: str,
        payload: dict,
        ttl_seconds: int | None = None,
    ) -> None:
        """Store a JSON-serializable payload under an arbitrary key.

        Falls back to the cache's default TTL when ``ttl_seconds`` is omitted.
        Degrades gracefully when Redis is unavailable.
        """
        if not self.available:
            return

        ttl = self.ttl_seconds if ttl_seconds is None else ttl_seconds
        try:
            self._client.setex(key, ttl, json.dumps(payload))
        except (redis.RedisError, TypeError, ValueError):
            self._available = False
