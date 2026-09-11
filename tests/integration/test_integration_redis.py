"""Optional integration tests that require a live Redis instance."""
from uuid import uuid4

import pytest

from risk_engine.api.cache import ECLCache

pytestmark = pytest.mark.integration

def _redis_available() -> bool:
    cache = ECLCache.connect()
    return cache.available

@pytest.mark.skipif(not _redis_available(), reason="Redis is not running")
def test_ecl_cache_round_trip_against_live_redis():
    cache = ECLCache.connect()
    key = f"sim_result:{uuid4().hex}"

    assert cache.get_json(key) is None
    cache.set_json(key, {"ecl": 1_234_567.89})
    assert cache.get_json(key) == {"ecl": 1_234_567.89}
