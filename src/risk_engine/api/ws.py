"""v3 WebSocket routes for streaming simulation progress.

Mounted at ``/api/v3/ws`` in the main app, so the endpoint URL is
``/api/v3/ws/simulations/{job_id}`` (see section 2.2 of CURSOR_PROMPT.md).

For ``multicore`` jobs this endpoint drives the computation itself: it fans
``simulation_chunk()`` out across cores and streams a ``progress`` +
``intermediate`` event as each chunk finishes, then a ``final`` event with the
complete results. The completed result is also written to the cache under
``sim_result:{job_id}`` so ``GET /simulations/{job_id}/results`` stays in sync.

Event JSON format (one message per event):

    {"type": "progress", "completed": 5000000, "total": 50000000, "elapsed_ms": 45}
    {"type": "intermediate", "defaults_so_far": 243000, "current_ecl": 27337500000}
    {"type": "final", "ecl": 5487562500, "defaults": 4878500, "default_rate": 0.04878, "elapsed_ms": 182}
"""
import asyncio
import time
from concurrent.futures import ProcessPoolExecutor

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from risk_engine.monte_carlo.ecl_engine import portfolio_ecl_from_defaults
from risk_engine.monte_carlo.multicore_calc import N_CORES, simulation_chunk
from risk_engine.surrogate.cache import ECLCache
from risk_engine.api.simulations import (
    _build_payload,
    _distribution_sample_count,
    _result_key,
    compute_ecl_distribution,
)

router = APIRouter(prefix="/ws", tags=["ws"])


def _final_event(payload: dict) -> dict:
    """Build a ``final`` event from a completed results payload."""
    return {
        "type": "final",
        "ecl": payload.get("ecl", 0.0),
        "defaults": payload.get("defaults", 0),
        "default_rate": payload.get("default_rate", 0.0),
        "elapsed_ms": payload.get("elapsed_ms", 0.0),
    }


async def _stream_multicore(
    websocket: WebSocket,
    cache: ECLCache,
    job_id: str,
    unemployment: float,
    interest_rate: float,
    hpi: float,
    n_loans: int,
) -> None:
    """Run the multicore simulation, streaming per-chunk progress events."""
    loop = asyncio.get_running_loop()

    chunk_size = max(1, n_loans // N_CORES)
    chunks = [chunk_size] * N_CORES
    chunks[-1] += n_loans - chunk_size * N_CORES  # absorb the remainder

    completed = 0
    defaults_so_far = 0
    start = time.perf_counter()

    with ProcessPoolExecutor(max_workers=N_CORES) as executor:

        async def _run_chunk(size: int) -> tuple[int, int]:
            chunk_defaults = await loop.run_in_executor(
                executor, simulation_chunk, size, unemployment, interest_rate, hpi
            )
            return size, chunk_defaults

        tasks = [asyncio.create_task(_run_chunk(size)) for size in chunks]

        for coro in asyncio.as_completed(tasks):
            size, chunk_defaults = await coro
            completed += size
            defaults_so_far += chunk_defaults
            elapsed_ms = (time.perf_counter() - start) * 1000

            await websocket.send_json(
                {
                    "type": "progress",
                    "completed": completed,
                    "total": n_loans,
                    "elapsed_ms": elapsed_ms,
                }
            )
            await websocket.send_json(
                {
                    "type": "intermediate",
                    "defaults_so_far": defaults_so_far,
                    "current_ecl": portfolio_ecl_from_defaults(defaults_so_far),
                }
            )

    sim_elapsed_ms = (time.perf_counter() - start) * 1000
    defaults = int(defaults_so_far)
    ecl = portfolio_ecl_from_defaults(defaults)

    # Distribution is CPU-bound (numpy); offload so the event loop stays free.
    distribution = await loop.run_in_executor(
        None,
        compute_ecl_distribution,
        unemployment,
        interest_rate,
        hpi,
        n_loans,
        _distribution_sample_count(n_loans),
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
        elapsed_ms=sim_elapsed_ms,
        ecl_distribution=distribution,
    )
    # Persist the finished result before signalling completion so a client that
    # immediately polls GET /results sees the completed payload.
    cache.set_json(_result_key(job_id), payload)

    await websocket.send_json(_final_event(payload))


@router.websocket("/simulations/{job_id}")
async def simulation_progress(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()
    cache: ECLCache = websocket.app.state.ecl_cache

    payload = cache.get_json(_result_key(job_id))
    if payload is None:
        await websocket.send_json(
            {"type": "error", "detail": f"Simulation {job_id} not found"}
        )
        await websocket.close()
        return

    status = payload.get("status")

    # Synchronous methods (surrogate/vectorized) are already done at submit time,
    # and a failed job has nothing to stream — emit the final/error and close.
    if status == "completed":
        await websocket.send_json(_final_event(payload))
        await websocket.close()
        return
    if status == "failed":
        await websocket.send_json(
            {"type": "error", "detail": payload.get("error", "Simulation failed")}
        )
        await websocket.close()
        return

    macro = payload.get("macro_inputs", {})
    try:
        await _stream_multicore(
            websocket,
            cache,
            job_id,
            unemployment=macro["unemployment_rate"],
            interest_rate=macro["interest_rate"],
            hpi=macro["housing_price_index"],
            n_loans=payload["n_loans"],
        )
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001 - surface failures to the client
        try:
            await websocket.send_json({"type": "error", "detail": str(exc)})
        except (WebSocketDisconnect, RuntimeError):
            return

    await websocket.close()
