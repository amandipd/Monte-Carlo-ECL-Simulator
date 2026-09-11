"""v3 simulation routes.

Mounted at ``/api/v3/simulations`` in the main app.

Endpoints:
- ``POST /submit``  — run a simulation and cache the results
- ``GET  /{job_id}/results`` — fetch cached results

Method dispatch:
- ``vectorized`` → ``simulate_defaults()`` (synchronous)
- ``multicore``  → ``simulation_chunk()`` fanned out over cores in a
  ``BackgroundTasks`` job; results are written to the cache when done.

Results are cached in Redis via ``ECLCache`` under the key ``sim_result:{job_id}``.
"""
import time
import uuid
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse

from risk_engine.monte_carlo.ecl_engine import (
    clip_macro_inputs,
    compute_ecl,
    macro_to_hazard_rate,
    portfolio_ecl_from_defaults,
    probability_of_default,
    simulate_defaults,
)
from risk_engine.monte_carlo.multicore_calc import N_CORES, simulation_chunk
from risk_engine.api.cache import ECLCache
from risk_engine.api.schemas import (
    SimulationResults,
    SimulationSubmitRequest,
    SimulationSubmitResponse,
)

router = APIRouter(prefix="/simulations", tags=["simulations"])

RESULT_KEY_PREFIX = "sim_result"

# Distribution sampling controls. The distribution runs ``compute_ecl`` once per
# seed, so we bound the total simulated loans to keep ``/submit`` responsive.
DISTRIBUTION_SAMPLES = 100
DISTRIBUTION_LOAN_BUDGET = 100_000_000

_PERCENTILE_POINTS = (5, 25, 50, 75, 95)


def _result_key(job_id: str) -> str:
    return f"{RESULT_KEY_PREFIX}:{job_id}"


def compute_ecl_distribution(
    unemployment: float,
    interest_rate: float,
    hpi: float,
    n_loans: int,
    n_samples: int = 100,
) -> list[float]:
    """Run ``compute_ecl`` with different seeds to get an ECL distribution.

    ``compute_ecl`` is deterministic for a given seed, so varying the seed
    produces the sampling variation used to build distribution charts.
    """
    return [
        compute_ecl(
            unemployment=unemployment,
            interest_rate=interest_rate,
            hpi=hpi,
            n_loans=n_loans,
            seed=i,
        )
        for i in range(n_samples)
    ]


def _percentiles(values: list[float]) -> dict[str, float]:
    """Return p5/p25/p50/p75/p95 for a list of ECL samples."""
    arr = np.asarray(values, dtype=float)
    quantiles = np.percentile(arr, _PERCENTILE_POINTS)
    return {f"p{p}": float(q) for p, q in zip(_PERCENTILE_POINTS, quantiles)}


def _distribution_sample_count(n_loans: int) -> int:
    """Pick a sample count that keeps total simulated loans within budget."""
    if n_loans <= 0:
        return 0
    budget = max(1, DISTRIBUTION_LOAN_BUDGET // n_loans)
    return int(max(1, min(DISTRIBUTION_SAMPLES, budget)))


def _build_payload(
    *,
    job_id: str,
    method: str,
    unemployment: float,
    interest_rate: float,
    hpi: float,
    n_loans: int,
    defaults: int,
    ecl: float,
    elapsed_ms: float,
    ecl_distribution: list[float] | None = None,
) -> dict:
    """Assemble a ``SimulationResults``-shaped dict for caching."""
    hazard_rate = macro_to_hazard_rate(unemployment, interest_rate, hpi)
    pd = probability_of_default(hazard_rate)
    default_rate = defaults / n_loans if n_loans else 0.0
    percentiles = _percentiles(ecl_distribution) if ecl_distribution else None

    return {
        "job_id": job_id,
        "status": "completed",
        "macro_inputs": {
            "unemployment_rate": unemployment,
            "interest_rate": interest_rate,
            "housing_price_index": hpi,
        },
        "n_loans": n_loans,
        "method": method,
        "defaults": int(defaults),
        "default_rate": float(default_rate),
        "ecl": float(ecl),
        "hazard_rate": float(hazard_rate),
        "pd": float(pd),
        "elapsed_ms": float(elapsed_ms),
        "cached": False,
        "ecl_distribution": ecl_distribution,
        "percentiles": percentiles,
    }


def _run_vectorized(
    job_id: str,
    unemployment: float,
    interest_rate: float,
    hpi: float,
    n_loans: int,
) -> dict:
    start = time.perf_counter()
    defaults = simulate_defaults(
        n_loans,
        unemployment=unemployment,
        interest_rate=interest_rate,
        hpi=hpi,
        seed=0,
    )
    ecl = portfolio_ecl_from_defaults(defaults)
    elapsed_ms = (time.perf_counter() - start) * 1000

    distribution = compute_ecl_distribution(
        unemployment,
        interest_rate,
        hpi,
        n_loans,
        n_samples=_distribution_sample_count(n_loans),
    )
    return _build_payload(
        job_id=job_id,
        method="vectorized",
        unemployment=unemployment,
        interest_rate=interest_rate,
        hpi=hpi,
        n_loans=n_loans,
        defaults=defaults,
        ecl=ecl,
        elapsed_ms=elapsed_ms,
        ecl_distribution=distribution,
    )


def _run_multicore_job(
    cache: ECLCache,
    job_id: str,
    unemployment: float,
    interest_rate: float,
    hpi: float,
    n_loans: int,
) -> None:
    """Background task: fan chunks across cores, then cache the final result."""
    try:
        start = time.perf_counter()
        chunk_size = max(1, n_loans // N_CORES)
        chunks = [chunk_size] * N_CORES
        chunks[-1] += n_loans - chunk_size * N_CORES  # absorb the remainder

        with ProcessPoolExecutor(max_workers=N_CORES) as executor:
            per_chunk = list(
                executor.map(
                    simulation_chunk,
                    chunks,
                    [unemployment] * N_CORES,
                    [interest_rate] * N_CORES,
                    [hpi] * N_CORES,
                )
            )

        defaults = int(sum(per_chunk))
        ecl = portfolio_ecl_from_defaults(defaults)
        elapsed_ms = (time.perf_counter() - start) * 1000

        distribution = compute_ecl_distribution(
            unemployment,
            interest_rate,
            hpi,
            n_loans,
            n_samples=_distribution_sample_count(n_loans),
        )
        payload = _build_payload(
            job_id=job_id,
            method="multicore",
            unemployment=unemployment,
            interest_rate=interest_rate,
            hpi=hpi,
            n_loans=n_loans,
            defaults=defaults,
            ecl=ecl,
            elapsed_ms=elapsed_ms,
            ecl_distribution=distribution,
        )
    except Exception as exc:  # noqa: BLE001 - persist failure for the results endpoint
        payload = {
            "job_id": job_id,
            "status": "failed",
            "macro_inputs": {
                "unemployment_rate": unemployment,
                "interest_rate": interest_rate,
                "housing_price_index": hpi,
            },
            "n_loans": n_loans,
            "method": "multicore",
            "defaults": 0,
            "default_rate": 0.0,
            "ecl": 0.0,
            "hazard_rate": macro_to_hazard_rate(unemployment, interest_rate, hpi),
            "pd": probability_of_default(
                macro_to_hazard_rate(unemployment, interest_rate, hpi)
            ),
            "elapsed_ms": 0.0,
            "cached": False,
            "ecl_distribution": None,
            "percentiles": None,
            "error": str(exc),
        }

    cache.set_json(_result_key(job_id), payload)


@router.post("/submit", response_model=SimulationSubmitResponse)
async def submit_simulation(
    request_body: SimulationSubmitRequest,
    request: Request,
    background_tasks: BackgroundTasks,
) -> SimulationSubmitResponse:
    cache: ECLCache = request.app.state.ecl_cache

    unemployment, interest_rate, hpi = clip_macro_inputs(
        request_body.unemployment_rate,
        request_body.interest_rate,
        request_body.housing_price_index,
    )
    job_id = uuid.uuid4().hex
    key = _result_key(job_id)

    if request_body.method == "vectorized":
        try:
            payload = _run_vectorized(
                job_id, unemployment, interest_rate, hpi, request_body.n_loans
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=500, detail=f"Simulation failed: {exc}"
            ) from exc
        cache.set_json(key, payload)
        return SimulationSubmitResponse(job_id=job_id, status="completed")

    # method == "multicore": run asynchronously and stream/poll for results.
    running_placeholder = {
        "job_id": job_id,
        "status": "running",
        "macro_inputs": {
            "unemployment_rate": unemployment,
            "interest_rate": interest_rate,
            "housing_price_index": hpi,
        },
        "n_loans": request_body.n_loans,
        "method": "multicore",
        "defaults": 0,
        "default_rate": 0.0,
        "ecl": 0.0,
        "hazard_rate": macro_to_hazard_rate(unemployment, interest_rate, hpi),
        "pd": probability_of_default(
            macro_to_hazard_rate(unemployment, interest_rate, hpi)
        ),
        "elapsed_ms": 0.0,
        "cached": False,
        "ecl_distribution": None,
        "percentiles": None,
    }
    cache.set_json(key, running_placeholder)
    background_tasks.add_task(
        _run_multicore_job,
        cache,
        job_id,
        unemployment,
        interest_rate,
        hpi,
        request_body.n_loans,
    )
    return SimulationSubmitResponse(
        job_id=job_id,
        status="queued",
        ws_url=f"/api/v3/ws/simulations/{job_id}",
    )


@router.get("/{job_id}/results", response_model=SimulationResults)
async def get_results(job_id: str, request: Request):
    cache: ECLCache = request.app.state.ecl_cache
    payload = cache.get_json(_result_key(job_id))

    if payload is None:
        raise HTTPException(
            status_code=404, detail=f"Simulation {job_id} not found"
        )

    status = payload.get("status")
    if status == "running":
        return JSONResponse(
            status_code=202,
            content={"job_id": job_id, "status": "running", "progress_pct": 0.0},
        )

    payload["cached"] = True
    return SimulationResults(**payload)
