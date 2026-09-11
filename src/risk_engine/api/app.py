"""FastAPI gateway for the v3 simulation dashboard API."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from risk_engine.api.cache import ECLCache
from risk_engine.api.simulations import router as simulations_router
from risk_engine.api.ws import router as ws_router
from risk_engine.config import PROJECT_TITLE

APP_TITLE = PROJECT_TITLE

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ecl_cache = ECLCache.connect()
    yield

app = FastAPI(title=APP_TITLE, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulations_router, prefix="/api/v3")
app.include_router(ws_router, prefix="/api/v3")

@app.get("/health")
async def health(request: Request) -> dict[str, str | bool]:
    cache: ECLCache = request.app.state.ecl_cache
    return {
        "status": "ok",
        "cache_enabled": cache.enabled,
        "cache_available": cache.available,
    }
