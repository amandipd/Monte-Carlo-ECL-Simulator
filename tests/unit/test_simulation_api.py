"""Tests for the v3 simulation API (submit + results).

Reuses the ``api_client`` fixture from ``tests/conftest.py`` (TestClient with a
freshly trained surrogate and an in-memory ``FakeRedis`` cache).
"""


def _submit_payload(**overrides) -> dict:
    payload = {
        "unemployment_rate": 6.5,
        "interest_rate": 5.25,
        "housing_price_index": 95.0,
        "n_loans": 10_000,
        "method": "vectorized",
    }
    payload.update(overrides)
    return payload


def test_submit_vectorized_returns_completed(api_client):
    response = api_client.post(
        "/api/v3/simulations/submit", json=_submit_payload()
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["job_id"]


def test_submit_and_fetch_results(api_client):
    # Submit (integration pattern from section 7 of CURSOR_PROMPT.md).
    r = api_client.post("/api/v3/simulations/submit", json=_submit_payload())
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    # Fetch results.
    r = api_client.get(f"/api/v3/simulations/{job_id}/results")
    assert r.status_code == 200
    results = r.json()
    assert results["ecl"] > 0
    assert results["default_rate"] > 0
    assert results["cached"] is True


def test_results_include_hazard_and_pd(api_client):
    r = api_client.post("/api/v3/simulations/submit", json=_submit_payload())
    job_id = r.json()["job_id"]

    results = api_client.get(
        f"/api/v3/simulations/{job_id}/results"
    ).json()
    assert results["hazard_rate"] > 0
    assert results["pd"] > 0
    assert results["method"] == "vectorized"
    assert results["n_loans"] == 10_000
    assert results["macro_inputs"]["unemployment_rate"] == 6.5


def test_results_not_found_returns_404(api_client):
    response = api_client.get("/api/v3/simulations/does-not-exist/results")
    assert response.status_code == 404


def test_submit_validation_error(api_client):
    response = api_client.post(
        "/api/v3/simulations/submit",
        json=_submit_payload(unemployment_rate=1.0),  # below ge=2.0
    )
    assert response.status_code == 422
