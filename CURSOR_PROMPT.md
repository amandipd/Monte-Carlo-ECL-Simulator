# Quant-as-a-Service Dashboard: Full-Stack Implementation

**Branch:** `feature/quant-dashboard` (do not commit to main)
**Codebase root:** `archive/quant/monte-carlo-risk-engine/`

---

## Getting Started (Copy-Paste These Commands First)

### Step 0: Create the branch
```bash
cd archive/quant/monte-carlo-risk-engine

# Initialize git if not already
git init

# Create and checkout the feature branch
git checkout -b feature/quant-dashboard

# Verify you're on the branch
git branch
# Output should show: * feature/quant-dashboard
```

### Step 1: Set up Ollama (required for chat)
```bash
# Install Ollama from https://ollama.com
# Then in a dedicated terminal, keep this running:
ollama serve

# In another terminal, pull the model (one-time):
ollama pull llama3.2
```

### Step 2: Open this file in Cursor

Open `CURSOR_PROMPT.md` in Cursor so it's in your context. Then open `CURSOR_PROMPTS.md` (the separate file with the 10 prompts).

### Step 3: Feed prompts to Cursor

Copy each prompt from `CURSOR_PROMPTS.md` and paste into Cursor's chat. Wait for each to complete before moving to the next.

---

## 0. Codebase Context (READ FIRST)

This project is a working Monte Carlo ECL (Expected Credit Loss) simulator. Before writing any code, understand the existing architecture by reading these files:

| What | File | Key exports |
|------|------|-------------|
| **Central config** | `src/risk_engine/config.py` | `N_LOANS`, `MACRO_BOUNDS`, `REDIS_HOST`, `ECL_CACHE_*`, `LLM_MOCK`, all `.env` values |
| **Core ECL math** | `src/risk_engine/monte_carlo/ecl_engine.py` | `compute_ecl()`, `macro_to_hazard_rate()`, `probability_of_default()`, `simulate_defaults()`, `clip_macro_inputs()`, `default_macro_inputs()` |
| **Simulation runners** | `src/risk_engine/monte_carlo/loop_calc.py`, `vectorized_calc.py`, `multicore_calc.py` | `run_simulation()` / `run_parallel()` — naive, NumPy, ProcessPoolExecutor |
| **Redis job queue** | `src/risk_engine/queue/producer.py`, `consumer.py` | Producer pushes N_JOBS chunks to `simulation_jobs` list, consumer pops + runs `simulation_chunk()` |
| **Surrogate model** | `src/risk_engine/surrogate/model.py` | `ECLSurrogate` — MLP `3 → 64 → 32 → 1` with ReLU |
| **Inference** | `src/risk_engine/surrogate/inference.py` | `SurrogatePredictor.predict_ecl(unemployment, interest_rate, hpi)` — loads `models/surrogate_v1.pt` + `models/scaler_v1.pkl`, clips inputs, scales, forward pass, inverse-scales |
| **Existing API** | `src/risk_engine/surrogate/app.py` | FastAPI app with `GET /health`, `POST /api/v2/predict`, `POST /api/v2/predict_shock` |
| **API schemas** | `src/risk_engine/surrogate/schemas.py` | `PredictRequest`, `PredictResponse`, `PredictShockRequest`, `PredictShockResponse`, `MacroCoordinates` |
| **Redis cache** | `src/risk_engine/surrogate/cache.py` | `ECLCache` — keys `ecl_cache:{u}:{i}:{hpi}`, 24h TTL, graceful degradation |
| **LLM client** | `src/risk_engine/surrogate/llm_client.py` | `OllamaClient.chat()`, `.chat_json()` — wraps Ollama `/api/chat` |
| **Scenario translator** | `src/risk_engine/surrogate/agentic_translator.py` | `translate_scenario(text)` → `(unemployment, interest_rate, hpi)` via Ollama or mock |
| **Report writer** | `src/risk_engine/surrogate/report_synthesizer.py` | `synthesize_report(scenario, u, i, hpi, ecl)` → markdown executive summary |
| **LLM prompts** | `src/risk_engine/surrogate/prompts.py` | `TRANSLATION_SYSTEM_PROMPT`, `REPORT_SYSTEM_PROMPT`, `REPORT_USER_PROMPT` |
| **Sampling** | `src/risk_engine/surrogate/sampling.py` | `sample_macro_scenarios(n, rng, method="latin_hypercube")` via SciPy LHS |
| **Training** | `src/risk_engine/surrogate/train.py` | `train_model(TrainConfig)` — early stopping, saves best checkpoint |
| **Evaluation** | `src/risk_engine/surrogate/evaluate.py` | `evaluate_model()` — MAE ratio < 5% gate, spot-checks < 10% error |
| **Test doubles** | `src/risk_engine/testing/fakes.py` | `FakeRedis` — in-memory `.get()`, `.setex()`, `.ping()` |
| **Test fixtures** | `tests/conftest.py` | `trained_artifacts` (tiny model in tmp_path), `api_client` (TestClient + FakeRedis) |
| **Docker** | `docker-compose.yml` | 4 services: `redis` (6379/8001), `worker`, `api` (producer), `surrogate-api` (8080) |
| **Dependencies** | `pyproject.toml` | Poetry, Python >=3.13, torch, fastapi, uvicorn, redis, numpy, pandas, scikit-learn, requests |

### How the math works

```
macro inputs (unemployment_rate, interest_rate, housing_price_index)
  → hazard_rate = BASE_HAZARD * (1 + 0.5*(u - u_ref)/u_ref)
                              * (1 + 0.25*(i - i_ref)/i_ref)
                              * (1 + 0.5*(hpi_ref - hpi)/hpi_ref)
  → PD = 1 - exp(-hazard_rate * TIME_HORIZON)
  → defaults = count(random_rolls < PD)  [vectorized Bernoulli over n_loans]
  → ECL = defaults * AVG_EXPOSURE * LGD
```

Defaults: `u_ref=4.0%`, `i_ref=3.0%`, `hpi_ref=100.0`, `BASE_HAZARD=0.05`, `AVG_EXPOSURE=$250K`, `LGD=0.45`.

At baseline macros → hazard=5% → PD≈4.88% → ECL on 100M loans ≈ $5.5B.

### Existing benchmark numbers (verified in `results/benchmark_metrics.json`)

| Metric | Value |
|--------|-------|
| Surrogate inference median | 0.43 ms |
| Surrogate vs 50M Monte Carlo | ~770x faster |
| Validation MAE ratio | 0.45% |
| `/api/v2/predict` median | 2.6 ms |
| Ollama live E2E | ~21s |

---

## 1. Project Vision

Transform this ECL simulator into a "Quant-as-a-Service" dashboard with:

- Real-time simulation visualization (ECL distributions, loss evolution, risk metrics)
- Interactive macro parameter tuning (sliders for unemployment, interest, HPI; shock scenarios)
- "Chat with your Data" LLM interface (natural language queries against simulation results)
- API-driven backend decoupled from the frontend

### Stack

```
Frontend (Next.js 15 + TypeScript + Tailwind + Recharts)
    ↓ (REST + WebSocket)
API Layer (FastAPI — extend existing app in src/risk_engine/surrogate/app.py)
    ↓
Simulation Engine (existing ecl_engine.py, vectorized_calc, multicore_calc, surrogate inference)
    ↓
LLM Integration (Ollama — FREE, runs locally, no API key required)
```

**LLM Choice:** Ollama + llama3.2 (already in your codebase!)
- Free, runs on your machine
- No API keys, no rate limits, no cost
- Reuses existing `OllamaClient` from `src/risk_engine/surrogate/llm_client.py`
- Same `.chat()` and `.chat_json()` methods as the existing shock endpoint

---

## 2. Phase 1: API Layer — Extend the Existing FastAPI App

### IMPORTANT: Do NOT rewrite `src/risk_engine/surrogate/app.py` from scratch.

The existing app has working endpoints (`/health`, `/api/v2/predict`, `/api/v2/predict_shock`) with lifespan-managed model loading and a functioning cache. Extend it by adding new route modules.

### 2.1 New file: `src/risk_engine/api/simulations.py`

**Router** mounted at `/api/v3/simulations` in the main app.

Endpoints:

```
POST /api/v3/simulations/submit
  Request: { unemployment_rate, interest_rate, housing_price_index, n_loans, method }
  method: "vectorized" | "multicore" | "surrogate"
  Response: { job_id, ws_url, status: "queued" }

GET /api/v3/simulations/{job_id}/status
  Response: { job_id, status, progress_pct, created_at, estimated_ms }

GET /api/v3/simulations/{job_id}/results
  Response: SimulationResults (see schema below)
```

Implementation notes:
- For `method: "surrogate"`, call `SurrogatePredictor.predict_ecl()` from `src/risk_engine/surrogate/inference.py` directly — it completes in <1ms, so no async job needed. Return immediately.
- For `method: "vectorized"`, call `simulate_defaults()` from `src/risk_engine/monte_carlo/ecl_engine.py` with the given `n_loans`. For n_loans < 10M this completes in <200ms, so it can be synchronous.
- For `method: "multicore"`, use `simulation_chunk()` from `src/risk_engine/monte_carlo/multicore_calc.py` in a background task. This is the only one that actually needs the job queue pattern.
- Reuse `clip_macro_inputs()` from `ecl_engine.py` for input validation (it already clamps to `MACRO_BOUNDS`).
- Reuse `ECLCache` from `src/risk_engine/surrogate/cache.py` for result caching — extend the key pattern to `sim_result:{job_id}`.

### 2.2 New file: `src/risk_engine/api/ws.py`

WebSocket endpoint for streaming simulation progress.

```
WS /api/v3/ws/simulations/{job_id}
```

Stream events (JSON lines):
```json
{"type": "progress", "completed": 5000000, "total": 50000000, "elapsed_ms": 45}
{"type": "intermediate", "defaults_so_far": 243000, "current_ecl": 27337500000}
{"type": "final", "ecl": 5487562500, "defaults": 4878500, "default_rate": 0.04878, "elapsed_ms": 182}
```

For multicore sims: each `simulation_chunk()` result updates the progress. The chunk returns `int` (defaults count) — accumulate and broadcast partial ECL after each chunk completes.

### 2.3 New file: `src/risk_engine/api/chat.py`

Chat endpoint using **Ollama** (free, local, already in your codebase).

```
POST /api/v3/chat/query
  Request: { job_id, query, conversation_history: [...] }
  Response: { response, model, elapsed_ms }
```

Workflow:
1. Fetch cached simulation results from Redis via `ECLCache` (key: `sim_result:{job_id}`)
2. Build context from results + existing macro config from `config.py`
3. Call Ollama via `OllamaClient()` (reuse from `src/risk_engine/surrogate/llm_client.py`) with system prompt + results context + user query
4. Cache response: `chat:{job_id}:{hash(query)}` for 1 hour TTL
5. Return response with elapsed time

System prompt — grounded in what this engine actually computes:
```python
CHAT_SYSTEM_PROMPT = """You are an expert credit risk analyst with access to Monte Carlo ECL simulation results.

This system models Expected Credit Loss on loan portfolios using:
- Macro inputs: unemployment_rate (%), interest_rate (%), housing_price_index (index, baseline=100)
- Hazard rate model: base hazard (5%) scaled by macro stress factors
- PD = 1 - exp(-hazard_rate * time_horizon)
- ECL = simulated_defaults * avg_exposure ($250K) * LGD (45%)

Answer questions about the simulation results precisely. Cite specific numbers.
When asked "what if" questions, explain how changing macro inputs would affect the hazard rate and ECL.
Do not invent metrics that aren't in the results (no Sharpe ratio, no Greeks — this is credit risk, not market risk).

Be concise. Answer in 1-3 sentences."""
```

### 2.4 New file: `src/risk_engine/api/schemas.py`

Extend (do not replace) the existing `src/risk_engine/surrogate/schemas.py`.

```python
from pydantic import BaseModel, Field
from risk_engine.config import MACRO_BOUNDS

class SimulationSubmitRequest(BaseModel):
    unemployment_rate: float = Field(..., ge=2.0, le=15.0)
    interest_rate: float = Field(..., ge=0.0, le=12.0)
    housing_price_index: float = Field(..., ge=70.0, le=130.0)
    n_loans: int = Field(default=1_000_000, ge=1000, le=100_000_000)
    method: str = Field(default="vectorized", pattern="^(vectorized|multicore|surrogate)$")

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

class ChatRequest(BaseModel):
    job_id: str
    query: str = Field(..., min_length=1, max_length=2000)
    conversation_history: list[dict] = Field(default_factory=list)

class ChatResponse(BaseModel):
    response: str
    cached: bool = False
```

### 2.5 Wire new routes into the existing app

In `src/risk_engine/surrogate/app.py`, add:

```python
from risk_engine.api.simulations import router as simulations_router
from risk_engine.api.chat import router as chat_router

app.include_router(simulations_router, prefix="/api/v3")
app.include_router(chat_router, prefix="/api/v3")
```

Keep all existing `/api/v2/*` endpoints untouched.

### 2.6 Add CORS middleware

The frontend (Next.js on port 3000) needs to reach the backend (port 8080):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2.7 No new dependencies needed

Ollama support is **already in `pyproject.toml`** (`requests` for HTTP calls). No new Python packages to add.

**Setup required (one-time):**
1. Install Ollama: https://ollama.com
2. Pull the model: `ollama pull llama3.2` (or try mistral for speed)
3. Run the server: `ollama serve` (runs on `http://localhost:11434` by default)

The backend will use the existing `OllamaClient` from `src/risk_engine/surrogate/llm_client.py`, which already reads `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `LLM_MOCK` from `.env`.

---

## 3. Phase 2: Frontend (Next.js 15)

### 3.1 Project location

```
frontend/     ← new directory at project root (sibling of src/, tests/, scripts/)
```

### 3.2 Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout, font loading, global providers
│   ├── page.tsx                # Landing: project title, quick-start form
│   └── dashboard/
│       └── [jobId]/
│           └── page.tsx        # Results dashboard for a specific simulation
├── components/
│   ├── SimulationForm.tsx      # Macro input sliders + method picker + submit
│   ├── ResultsPanel.tsx        # Container for charts + metrics + chat
│   ├── ChatInterface.tsx       # Message list + query input + suggested queries
│   └── charts/
│       ├── ECLDistribution.tsx # Histogram of ECL samples with percentile overlays
│       ├── HazardSurface.tsx   # Heatmap: unemployment x interest → hazard rate
│       ├── MetricsCard.tsx     # Card showing ECL, defaults, PD, hazard, elapsed
│       └── SensitivityBar.tsx  # Tornado chart: which macro input moves ECL most
├── hooks/
│   ├── useSimulation.ts        # Submit + poll + fetch results
│   ├── useWebSocket.ts         # Connect to WS, parse events, update state
│   └── useChat.ts              # Send queries, manage conversation history
├── lib/
│   ├── api.ts                  # Fetch wrapper, base URL (http://localhost:8080)
│   ├── types.ts                # TS interfaces mirroring backend Pydantic models
│   └── utils.ts                # Number formatting ($5.49B), color scales
└── styles/
    └── globals.css             # Tailwind directives
```

### 3.3 TypeScript interfaces (`frontend/lib/types.ts`)

These must mirror the Pydantic models exactly:

```typescript
export interface MacroCoordinates {
  unemployment_rate: number;
  interest_rate: number;
  housing_price_index: number;
}

export interface SimulationSubmitRequest {
  unemployment_rate: number;   // 2.0 – 15.0
  interest_rate: number;       // 0.0 – 12.0
  housing_price_index: number; // 70.0 – 130.0
  n_loans: number;             // 1,000 – 100,000,000
  method: "vectorized" | "multicore" | "surrogate";
}

export interface SimulationResults {
  job_id: string;
  status: "completed" | "running" | "failed";
  macro_inputs: MacroCoordinates;
  n_loans: number;
  method: string;
  defaults: number;
  default_rate: number;
  ecl: number;                 // in dollars (e.g. 5_487_562_500)
  hazard_rate: number;         // e.g. 0.05
  pd: number;                  // e.g. 0.0488
  elapsed_ms: number;
  cached: boolean;
  ecl_distribution: number[] | null;
  percentiles: Record<string, number> | null;
}

export interface WSEvent {
  type: "progress" | "intermediate" | "final";
  completed?: number;
  total?: number;
  elapsed_ms?: number;
  defaults_so_far?: number;
  current_ecl?: number;
  ecl?: number;
  defaults?: number;
  default_rate?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

### 3.4 Key components

**SimulationForm.tsx** — sliders with real bounds from the engine:

| Input | Min | Max | Default | Step |
|-------|-----|-----|---------|------|
| `unemployment_rate` | 2.0 | 15.0 | 4.0 (baseline) | 0.1 |
| `interest_rate` | 0.0 | 12.0 | 3.0 (baseline) | 0.25 |
| `housing_price_index` | 70.0 | 130.0 | 100.0 (baseline) | 1.0 |
| `n_loans` | 1,000 | 100,000,000 | 1,000,000 | log scale |
| `method` | — | — | "vectorized" | radio group |

These bounds come directly from `MACRO_BOUNDS` in `config.py`. The baselines come from `MACRO_BASELINE_UNEMPLOYMENT=4.0`, `MACRO_BASELINE_INTEREST=3.0`, `MACRO_BASELINE_HPI=100.0`.

Include a "Preset Scenarios" dropdown:
- **Baseline** (4.0%, 3.0%, 100.0) — neutral, hazard multipliers = 1.0
- **Mild Recession** (7.0%, 5.0%, 90.0)
- **Severe Recession** (12.0%, 8.0%, 75.0)
- **Housing Crash** (6.0%, 4.0%, 72.0)
- **Rate Spike** (5.0%, 11.0%, 95.0)

On submit: `POST /api/v3/simulations/submit` → get `job_id` → navigate to `/dashboard/{job_id}`.

**ECLDistribution.tsx** — Recharts histogram:
- X-axis: ECL values (in billions, formatted as "$5.2B")
- Y-axis: frequency count
- Vertical lines: p5, p50, p95 from `percentiles`
- VaR overlay: p5 is the "worst 5% scenario"

**HazardSurface.tsx** — heatmap showing how ECL changes across the macro space:
- Precompute a grid: unemployment (2–15, step 1) x interest_rate (0–12, step 1) → hazard rate
- Use the formula from `ecl_engine.py:macro_to_hazard_rate()` client-side for instant rendering
- Color scale: green (low hazard) → red (high hazard)
- Show current simulation point as a marker

**MetricsCard.tsx** — display key results:
```
ECL:           $5,487,562,500
Defaults:      4,878,500 / 100,000,000
Default Rate:  4.88%
Hazard Rate:   5.00%
PD:            4.88%
Method:        Vectorized NumPy
Compute Time:  182 ms
```

**ChatInterface.tsx** — suggested queries specific to ECL:
- "What does this ECL mean for the portfolio?"
- "How would ECL change if unemployment hit 10%?"
- "Compare this scenario to baseline conditions"
- "What's driving the loss — unemployment, rates, or housing?"
- "Is this hazard rate realistic for a recession?"

### 3.5 WebSocket hook (`frontend/hooks/useWebSocket.ts`)

```typescript
import { useState, useEffect, useCallback } from "react";
import type { WSEvent } from "@/lib/types";

export function useWebSocket(jobId: string | null) {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "closed" | "error">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!jobId) return;

    const ws = new WebSocket(`ws://localhost:8080/api/v3/ws/simulations/${jobId}`);
    setStatus("connecting");

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (event) => {
      const parsed: WSEvent = JSON.parse(event.data);
      setEvents((prev) => [...prev, parsed]);

      if (parsed.type === "progress" && parsed.total) {
        setProgress((parsed.completed ?? 0) / parsed.total);
      }
      if (parsed.type === "final") {
        setStatus("closed");
      }
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => {
      if (status !== "error") setStatus("closed");
    };

    return () => ws.close();
  }, [jobId]);

  return { events, status, progress };
}
```

### 3.6 State management

Use React Context + `useReducer` — no Redux. The state shape:

```typescript
interface DashboardState {
  jobId: string | null;
  results: SimulationResults | null;
  chatMessages: ChatMessage[];
  isSimulating: boolean;
  wsProgress: number;
  error: string | null;
}
```

---

## 4. Phase 3: LLM Chat Integration (Ollama)

### 4.1 Backend: Ollama call

In `src/risk_engine/api/chat.py`, reuse the existing `OllamaClient`:

```python
from risk_engine.surrogate.llm_client import OllamaClient

def build_context(results: dict) -> str:
    return f"""Simulation Results:
- Macro Inputs: unemployment={results['macro_inputs']['unemployment_rate']:.1f}%, interest={results['macro_inputs']['interest_rate']:.1f}%, HPI={results['macro_inputs']['housing_price_index']:.1f}
- Portfolio: {results['n_loans']:,} loans, avg exposure $250,000, LGD 45%
- Hazard Rate: {results['hazard_rate']:.4f} (baseline: 0.05)
- Probability of Default: {results['pd']:.4f} ({results['pd']*100:.2f}%)
- Simulated Defaults: {results['defaults']:,} out of {results['n_loans']:,}
- Expected Credit Loss: ${results['ecl']:,.0f}
- Default Rate: {results['default_rate']:.4f} ({results['default_rate']*100:.2f}%)
- Method: {results['method']}, computed in {results['elapsed_ms']:.1f}ms
- Baseline ECL (neutral macros): ~$5.5B on 100M loans"""

def query_ollama(system_prompt: str, context: str, query: str, history: list[dict]) -> str:
    """Call Ollama with simulation context + conversation history."""
    client = OllamaClient()  # reads OLLAMA_BASE_URL, OLLAMA_MODEL from config
    
    # Build user message: context + query
    full_query = f"{context}\n\nUser question: {query}"
    
    # For simplicity, send only the last exchange to avoid token limits
    # (Ollama on consumer hardware has smaller context windows)
    response = client.chat(
        system_prompt=system_prompt,
        user_prompt=full_query,
    )
    return response
```

**Notes:**
- `OllamaClient` is already in `src/risk_engine/surrogate/llm_client.py` — just reuse it
- No authentication, no API keys, no rate limits
- First call to Ollama takes ~2-5 seconds (model loads into memory)
- Subsequent calls are <1 second
- For faster responses on slower hardware, try `mistral` model: `ollama pull mistral`

### 4.2 Frontend: chat hook

```typescript
// frontend/hooks/useChat.ts
export function useChat(jobId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendQuery = useCallback(async (query: string) => {
    const userMsg: ChatMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8080/api/v3/chat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, query, conversation_history: messages }),
      });

      if (!res.ok) {
        if (res.status === 503) {
          setError("Ollama is not running. Start it with: ollama serve");
        } else {
          setError(`Error: ${res.statusText}`);
        }
        setMessages((prev) => prev.slice(0, -1)); // remove user message on error
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, messages]);

  return { messages, sendQuery, isLoading, error };
}
```

**Note:** If Ollama is not running, the backend returns 503. The frontend shows a helpful error message.

---

## 5. Phase 4: Distribution Data (for charts)

The existing `compute_ecl()` is deterministic with a given seed. To generate distribution data for charts, run it with multiple seeds:

New function in `src/risk_engine/api/simulations.py`:

```python
from risk_engine.monte_carlo.ecl_engine import compute_ecl

def compute_ecl_distribution(
    unemployment: float,
    interest_rate: float,
    hpi: float,
    n_loans: int,
    n_samples: int = 100,
) -> list[float]:
    """Run compute_ecl with different seeds to get ECL distribution."""
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
```

For the surrogate path: the surrogate is deterministic (no seed), so distribution data comes only from Monte Carlo runs. When `method="surrogate"`, skip the distribution chart or show a single-point estimate with a note.

---

## 6. Development Setup

### Prerequisites (one-time)

**Ollama (for chat endpoint):**
```bash
# Install from https://ollama.com
# Then pull a model (llama3.2 is good, or try mistral for speed)
ollama pull llama3.2

# Keep this running in a terminal (serves on http://localhost:11434)
ollama serve
```

### Backend (extend existing)

```bash
cd archive/quant/monte-carlo-risk-engine

# Existing Poetry env (no new dependencies)
poetry install

# Run backend (same as before, port 8080)
poetry run uvicorn risk_engine.surrogate.app:app --app-dir src --reload --port 8080
```

### Frontend (new)

```bash
cd archive/quant/monte-carlo-risk-engine

# Initialize Next.js
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

cd frontend
npm install recharts
npm install -D @types/react @types/node
```

### Running all three

```bash
# Terminal 1: Ollama (required for chat)
ollama serve

# Terminal 2: Backend
cd archive/quant/monte-carlo-risk-engine
poetry run uvicorn risk_engine.surrogate.app:app --app-dir src --reload --port 8080

# Terminal 3: Redis (for result caching)
docker compose up -d redis

# Terminal 4: Frontend
cd archive/quant/monte-carlo-risk-engine/frontend
npm run dev
# → http://localhost:3000
```

---

## 7. Testing

### Backend tests

Add to `tests/unit/`:
- `test_simulation_api.py` — test submit + results endpoints with FastAPI TestClient
- `test_chat_api.py` — test chat endpoint (use `LLM_MOCK=true` in monkeypatch to skip Ollama)

Reuse existing patterns from `tests/conftest.py`:
- `trained_artifacts` fixture for surrogate method tests
- `FakeRedis` from `src/risk_engine/testing/fakes.py` for cache tests
- `monkeypatch` for swapping model paths, setting `LLM_MOCK=true`, or mocking `OllamaClient.chat()`

### Integration test pattern

```python
def test_submit_and_fetch(api_client):
    # Submit
    r = api_client.post("/api/v3/simulations/submit", json={
        "unemployment_rate": 6.5,
        "interest_rate": 5.25,
        "housing_price_index": 95.0,
        "n_loans": 10_000,
        "method": "vectorized",
    })
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    # Fetch results
    r = api_client.get(f"/api/v3/simulations/{job_id}/results")
    assert r.status_code == 200
    results = r.json()
    assert results["ecl"] > 0
    assert results["default_rate"] > 0
```

---

## 8. Error Handling

| Scenario | HTTP Code | Detail |
|----------|-----------|--------|
| Job not found | 404 | `"Simulation {job_id} not found"` |
| Job still running | 202 | `{"status": "running", "progress_pct": 0.45}` |
| Macro inputs out of range | 422 | Pydantic validation (existing behavior) |
| Surrogate artifacts missing | 500 | `"Surrogate model artifacts not found. Train the model first."` (existing error) |
| Ollama not running | 503 | `"Ollama unreachable. Run: ollama serve"` (caught from `llm_client.py`) |
| Redis down | 200 | Degrade gracefully (existing pattern in `ECLCache`) |

---

## 9. Implementation Checklist

### Backend (extend `src/risk_engine/`)

- [ ] Create `src/risk_engine/api/` package (`__init__.py`, `simulations.py`, `chat.py`, `ws.py`, `schemas.py`)
- [ ] Implement `POST /api/v3/simulations/submit` — calls `compute_ecl()` or `predict_ecl()` based on method
- [ ] Implement `GET /api/v3/simulations/{job_id}/results` — fetch from Redis cache
- [ ] Implement `WS /api/v3/ws/simulations/{job_id}` — stream multicore chunk progress
- [ ] Implement `POST /api/v3/chat/query` — Claude API with simulation context
- [ ] Add `anthropic` to `pyproject.toml` dependencies
- [ ] Add `ANTHROPIC_API_KEY`, `CHAT_MODEL` to `config.py` and `.env.example`
- [ ] Add CORS middleware to `app.py`
- [ ] Wire new routers into existing `app.py` via `include_router()`
- [ ] Write tests in `tests/unit/` for new endpoints
- [ ] Keep all existing `/api/v2/*` endpoints and `/health` working

### Frontend (new `frontend/` directory)

- [ ] Initialize Next.js 15 + TypeScript + Tailwind
- [ ] Build `SimulationForm.tsx` with macro sliders (bounds from config) + preset scenarios
- [ ] Build `MetricsCard.tsx` displaying ECL, defaults, PD, hazard, compute time
- [ ] Build `ECLDistribution.tsx` histogram with Recharts
- [ ] Build `HazardSurface.tsx` heatmap (client-side hazard calculation)
- [ ] Build `ChatInterface.tsx` with message history + suggested queries
- [ ] Implement `useSimulation.ts`, `useWebSocket.ts`, `useChat.ts` hooks
- [ ] Create TypeScript interfaces matching backend Pydantic models
- [ ] Add loading states, error boundaries, responsive layout
- [ ] Dark mode via Tailwind `dark:` classes

### Docker (extend `docker-compose.yml`)

- [ ] Add `frontend` service (Node 20, port 3000)
- [ ] (Optional) Add Ollama service if you want chat inside containers (otherwise reach host Ollama via `host.docker.internal:11434`)

---

## 10. Cursor-Specific Instructions

### Reference existing code with `@`

When working on backend changes, always reference the existing implementation:
- `@src/risk_engine/surrogate/app.py` — see how the existing FastAPI app, lifespan, and routes are structured
- `@src/risk_engine/monte_carlo/ecl_engine.py` — the core `compute_ecl()` function your new endpoints wrap
- `@src/risk_engine/surrogate/inference.py` — `SurrogatePredictor` class for the surrogate method path
- `@src/risk_engine/surrogate/llm_client.py` — `OllamaClient` class (reuse for chat endpoint)
- `@src/risk_engine/surrogate/agentic_translator.py` — example of how to call Ollama with prompts
- `@src/risk_engine/surrogate/cache.py` — `ECLCache` pattern to reuse for simulation result caching
- `@src/risk_engine/surrogate/schemas.py` — existing Pydantic models to extend (import `MacroCoordinates`)
- `@src/risk_engine/config.py` — all env-backed settings (OLLAMA_BASE_URL, OLLAMA_MODEL, LLM_MOCK already there)
- `@tests/conftest.py` — fixture patterns for test files
- `@src/risk_engine/testing/fakes.py` — `FakeRedis` for unit tests

### Work incrementally

1. Start with backend: get `POST /api/v3/simulations/submit` working and returning real ECL results
2. Test it with curl/httpie before touching frontend
3. Then scaffold the Next.js app
4. Build `SimulationForm` → connect to backend → verify data flows
5. Add charts one at a time
6. Add chat last (it depends on results being cached)

### Do NOT

- Do not rewrite or restructure the existing `src/risk_engine/` package layout
- Do not rename the `risk_engine` package or change `pyproject.toml` package config
- Do not modify existing tests — only add new ones
- Do not change the existing `/api/v2/*` endpoints or `/health`
- Do not replace the existing `OllamaClient` or `LLM_MOCK` pattern — keep them working
- Do not add Sharpe ratio, Greeks, or market-risk metrics — this is a credit risk engine (ECL, PD, hazard rate, LGD)
- Do not send raw 100M-row simulation arrays to the frontend — precompute aggregates on the backend
- Do not try to use external APIs or cloud services for chat — Ollama is free and already in use

### Domain correctness

This is a **credit risk** simulator, not a market-risk or portfolio-optimization tool:
- The output is **Expected Credit Loss** (in dollars), not P&L or returns
- Key metrics: ECL, PD (probability of default), hazard rate, default rate, LGD, average exposure
- There is no Sharpe ratio, no VaR in the market-risk sense, no options Greeks
- "VaR" here would be the 5th percentile of the ECL distribution (worst-case credit loss), not a market return quantile
- The macro inputs (unemployment, interest rates, HPI) drive credit risk through the hazard rate model, not through asset price correlations

---

## 11. Git Workflow

```bash
cd archive/quant/monte-carlo-risk-engine

git init  # if not already a repo
git checkout -b feature/quant-dashboard

# Commit backend first
git add src/risk_engine/api/
git commit -m "feat(api): add v3 simulation submit + results endpoints"

git add src/risk_engine/api/chat.py
git commit -m "feat(chat): add Claude-powered chat endpoint for simulation queries"

# Then frontend
git add frontend/
git commit -m "feat(frontend): scaffold Next.js dashboard with simulation form and charts"

# Iterate
git add -A
git commit -m "feat(dashboard): connect frontend to backend, add WebSocket progress"
```

Do NOT push to main. Keep everything on `feature/quant-dashboard`.
