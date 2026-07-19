"""Tests for the v3 chat API.

Uses ``LLM_MOCK=true`` (keyword-free deterministic mock) instead of mocking
Ollama directly, per section 7 of CURSOR_PROMPT.md. Reuses the ``api_client``
fixture (TestClient + in-memory ``FakeRedis`` cache) from ``tests/conftest.py``.
"""


def _submit_simulation(api_client) -> str:
    """Submit a small vectorized sim and return its job_id."""
    response = api_client.post(
        "/api/v3/simulations/submit",
        json={
            "unemployment_rate": 6.5,
            "interest_rate": 5.25,
            "housing_price_index": 95.0,
            "n_loans": 10_000,
            "method": "vectorized",
        },
    )
    assert response.status_code == 200
    return response.json()["job_id"]


def test_chat_returns_response_with_mock(api_client, monkeypatch):
    monkeypatch.setenv("LLM_MOCK", "true")
    job_id = _submit_simulation(api_client)

    response = api_client.post(
        "/api/v3/chat/query",
        json={
            "job_id": job_id,
            "query": "What does this ECL mean for the portfolio?",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["response"]
    assert body["cached"] is False


def test_chat_caches_repeat_query(api_client, monkeypatch):
    monkeypatch.setenv("LLM_MOCK", "true")
    job_id = _submit_simulation(api_client)

    payload = {"job_id": job_id, "query": "Is this hazard rate realistic?"}
    first = api_client.post("/api/v3/chat/query", json=payload)
    second = api_client.post("/api/v3/chat/query", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["cached"] is False
    assert second.json()["cached"] is True
    assert first.json()["response"] == second.json()["response"]


def test_chat_job_not_found_returns_404(api_client, monkeypatch):
    monkeypatch.setenv("LLM_MOCK", "true")

    response = api_client.post(
        "/api/v3/chat/query",
        json={"job_id": "does-not-exist", "query": "hello"},
    )
    assert response.status_code == 404
