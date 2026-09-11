"""Shared pytest fixtures for the v3 simulation API."""

import pytest
from fastapi.testclient import TestClient

from risk_engine.api.app import app
from risk_engine.api.cache import ECLCache
from risk_engine.testing.fakes import FakeRedis


@pytest.fixture
def api_client(monkeypatch):
    """FastAPI TestClient with an in-memory (fake) Redis cache."""
    fake_cache = ECLCache(enabled=True, ttl_seconds=86400, redis_client=FakeRedis())
    monkeypatch.setattr(
        "risk_engine.api.app.ECLCache.connect",
        lambda: fake_cache,
    )

    with TestClient(app) as client:
        yield client
