"""Tests for the Redis simulation-results cache."""

from risk_engine.api.cache import ECLCache
from risk_engine.testing.fakes import FakeRedis

def test_cache_get_json_miss_when_empty():
    cache = ECLCache(enabled=True, ttl_seconds=3600, redis_client=FakeRedis())
    assert cache.get_json("sim_result:missing") is None

def test_cache_set_and_get_json_round_trip():
    fake = FakeRedis()
    cache = ECLCache(enabled=True, ttl_seconds=86400, redis_client=fake)

    payload = {"job_id": "abc123", "ecl": 4_307_526_656.0}
    cache.set_json("sim_result:abc123", payload)

    assert cache.get_json("sim_result:abc123") == payload
    assert fake.ttl["sim_result:abc123"] == 86400

def test_cache_disabled_skips_reads_and_writes():
    fake = FakeRedis()
    cache = ECLCache(enabled=False, ttl_seconds=86400, redis_client=fake)

    cache.set_json("sim_result:abc123", {"ecl": 1.0})
    assert cache.get_json("sim_result:abc123") is None
    assert fake.store == {}
