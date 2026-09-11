"""Pydantic schemas for the v3 dashboard API."""
from pydantic import BaseModel, Field


class MacroCoordinates(BaseModel):
    unemployment_rate: float
    interest_rate: float
    housing_price_index: float


class SimulationSubmitRequest(BaseModel):
    unemployment_rate: float = Field(..., ge=2.0, le=15.0)
    interest_rate: float = Field(..., ge=0.0, le=12.0)
    housing_price_index: float = Field(..., ge=70.0, le=130.0)
    n_loans: int = Field(default=1_000_000, ge=1000, le=100_000_000)
    method: str = Field(default="vectorized", pattern="^(vectorized|multicore)$")


class SimulationSubmitResponse(BaseModel):
    job_id: str
    status: str  # "queued" | "completed"
    ws_url: str | None = None


class SimulationResults(BaseModel):
    job_id: str
    status: str  # "completed" | "running" | "failed"
    macro_inputs: MacroCoordinates  # reuse from existing schemas.py
    n_loans: int
    method: str
    defaults: int
    default_rate: float
    ecl: float
    hazard_rate: float
    pd: float
    elapsed_ms: float
    cached: bool = False
    # Distribution data (for charts — run multiple seeds)
    ecl_distribution: list[float] | None = None  # 100 ECL samples from different seeds
    percentiles: dict[str, float] | None = None   # p5, p25, p50, p75, p95
