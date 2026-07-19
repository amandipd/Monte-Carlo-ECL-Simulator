# Cursor Prompts for Quant-as-a-Service Dashboard

**IMPORTANT:** Before starting, read `CURSOR_PROMPT.md` section "Getting Started" and have Ollama running.

Feed these prompts **one at a time** to Cursor. Wait for each to complete before sending the next.

---

## Prompt 1: Backend Scaffolding

```
@CURSOR_PROMPT.md @src/risk_engine/surrogate/app.py @src/risk_engine/config.py

Create the branch feature/quant-dashboard. Then create the src/risk_engine/api/ package with __init__.py and schemas.py. In schemas.py, import MacroCoordinates from risk_engine.surrogate.schemas and define SimulationSubmitRequest, SimulationSubmitResponse, SimulationResults, ChatRequest, ChatResponse exactly as specified in section 2.4 of CURSOR_PROMPT.md. NO ANTHROPIC API KEY NEEDED. Add CORS middleware and the two include_router() calls to app.py (keep all existing routes working).
```

---

## Prompt 2: Simulation Endpoints

```
@CURSOR_PROMPT.md @src/risk_engine/api/schemas.py @src/risk_engine/monte_carlo/ecl_engine.py @src/risk_engine/surrogate/inference.py @src/risk_engine/surrogate/cache.py @src/risk_engine/monte_carlo/multicore_calc.py

Create src/risk_engine/api/simulations.py with an APIRouter. Implement POST /simulations/submit and GET /simulations/{job_id}/results. For method="surrogate", call SurrogatePredictor.predict_ecl() synchronously. For method="vectorized", call simulate_defaults() synchronously. For method="multicore", use BackgroundTasks. Cache results in Redis using ECLCache's pattern (key: sim_result:{job_id}). Also implement compute_ecl_distribution() as described in section 5 of CURSOR_PROMPT.md. Use clip_macro_inputs() for input clamping. Return hazard_rate and pd in the results.
```

---

## Prompt 3: WebSocket Endpoint

```
@CURSOR_PROMPT.md @src/risk_engine/api/simulations.py @src/risk_engine/monte_carlo/multicore_calc.py

Create src/risk_engine/api/ws.py with a WebSocket endpoint at /ws/simulations/{job_id}. For multicore simulations, stream progress and intermediate events as each chunk completes (use the simulation_chunk function). Send a final event with the complete results. Follow the event JSON format from section 2.2 of CURSOR_PROMPT.md.
```

---

## Prompt 4: Chat Endpoint (Ollama)

```
@CURSOR_PROMPT.md @src/risk_engine/api/schemas.py @src/risk_engine/surrogate/cache.py @src/risk_engine/surrogate/llm_client.py @src/risk_engine/config.py

Create src/risk_engine/api/chat.py with an APIRouter. Implement POST /chat/query. Fetch cached simulation results by job_id from Redis cache. Build the context string as shown in section 4.1 of CURSOR_PROMPT.md. Call Ollama using OllamaClient() imported from src/risk_engine/surrogate/llm_client.py — reuse the existing class, do NOT add anthropic SDK. Use the CHAT_SYSTEM_PROMPT from section 2.3. Cache chat responses with key chat:{job_id}:{hash} and 1 hour TTL. NO NEW DEPENDENCIES NEEDED — requests is already in pyproject.toml. If Ollama returns an error, return 503 status with "Ollama unreachable" message.
```

---

## Prompt 5: Backend Tests

```
@CURSOR_PROMPT.md @tests/conftest.py @src/risk_engine/testing/fakes.py

Write tests/unit/test_simulation_api.py and tests/unit/test_chat_api.py. Reuse the api_client fixture pattern from conftest.py and FakeRedis from fakes.py. Test: submitting a vectorized simulation returns 200 with ecl > 0, fetching results by job_id works, chat endpoint returns a response when LLM_MOCK=true (use monkeypatch to set os.environ["LLM_MOCK"]="true"). Follow the integration test pattern from section 7 of CURSOR_PROMPT.md. Do NOT mock Ollama directly — just enable LLM_MOCK mode which uses keyword matching instead.
```

---

## Prompt 6: Frontend Scaffold

```
@CURSOR_PROMPT.md

In the project root (archive/quant/monte-carlo-risk-engine), run npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" and install recharts. Then create the file structure from section 3.2 of CURSOR_PROMPT.md: lib/types.ts with all the TypeScript interfaces, lib/api.ts with a fetch wrapper pointing at http://localhost:8080, hooks/useSimulation.ts, hooks/useWebSocket.ts, hooks/useChat.ts (include error handling for 503 Ollama errors as shown in section 4.2), and the app layout.
```

---

## Prompt 7: Simulation Form + Landing Page

```
@CURSOR_PROMPT.md @frontend/lib/types.ts @frontend/hooks/useSimulation.ts

Build components/SimulationForm.tsx with sliders for unemployment_rate (2-15, default 4, step 0.1), interest_rate (0-12, default 3, step 0.25), housing_price_index (70-130, default 100, step 1), n_loans (log scale 1K-100M, default 1M), and a method radio group. Add the preset scenarios dropdown (Baseline, Mild Recession, Severe Recession, Housing Crash, Rate Spike) with the exact values from section 3.4 of CURSOR_PROMPT.md. On submit call the API and navigate to /dashboard/[jobId]. Wire this into app/page.tsx as the landing page.
```

---

## Prompt 8: Dashboard + Charts

```
@CURSOR_PROMPT.md @frontend/lib/types.ts @frontend/hooks/useWebSocket.ts

Build the dashboard page at app/dashboard/[jobId]/page.tsx. It should fetch results from GET /api/v3/simulations/{job_id}/results and render: MetricsCard.tsx showing ECL, defaults, default_rate, PD, hazard_rate, method, elapsed_ms (format ECL as dollars with commas). ECLDistribution.tsx as a Recharts BarChart histogram of ecl_distribution with p5/p50/p95 vertical ReferenceLine overlays. Use the useWebSocket hook to show a progress bar while the simulation is running. All components responsive with Tailwind. Add dark mode support.
```

---

## Prompt 9: Heatmap + Chat UI

```
@CURSOR_PROMPT.md @frontend/hooks/useChat.ts @frontend/lib/types.ts

Build components/charts/HazardSurface.tsx — a heatmap grid computing hazard rates client-side using the formula: hazard = 0.05 * (1 + 0.5*(u-4)/4) * (1 + 0.25*(i-3)/3) * (1 + 0.5*(100-hpi)/100). Unemployment on y-axis (2-15 step 1), interest on x-axis (0-12 step 1), HPI fixed at the simulation's value. Color green→yellow→red. Mark the current simulation point.

Then build components/ChatInterface.tsx with a scrollable message list, text input, send button, and 5 suggested query chips from section 3.4 of CURSOR_PROMPT.md. Use the useChat hook. Show a loading indicator while waiting for Ollama's response. If Ollama is not running, show an error message: "Ollama is not running. Start it with: ollama serve". Add this below the charts on the dashboard page.
```

---

## Prompt 10: Polish + Docker

```
@CURSOR_PROMPT.md @docker-compose.yml

Add a frontend service to docker-compose.yml (node:20-slim, port 3000, depends_on surrogate-api). NO ANTHROPIC_API_KEY needed in environment. Add error boundaries and loading skeletons to the dashboard page. Make sure the landing page and dashboard work on mobile (test at 375px width). Verify there are no TypeScript errors. Commit everything to the feature/quant-dashboard branch.
```

---

## Testing the Backend (Before Frontend)

After Prompt 4 completes, test with curl:

```bash
# Terminal 1: Run backend
cd archive/quant/monte-carlo-risk-engine
poetry run uvicorn risk_engine.surrogate.app:app --app-dir src --reload --port 8080

# Terminal 2: Submit a simulation
curl -X POST http://localhost:8080/api/v3/simulations/submit \
  -H "Content-Type: application/json" \
  -d '{
    "unemployment_rate": 6.5,
    "interest_rate": 5.25,
    "housing_price_index": 95.0,
    "n_loans": 10000,
    "method": "vectorized"
  }'

# You should get back: {"job_id": "...", "status": "completed", "ws_url": null}

# Terminal 3: Fetch results
curl http://localhost:8080/api/v3/simulations/{job_id}/results
# You should see: ecl, defaults, default_rate, hazard_rate, pd, etc.
```

---

## Git Commit Strategy

After each prompt completes, commit your changes:

```bash
# After Prompt 1
git add src/risk_engine/api/
git commit -m "feat(api): scaffold API package with schemas and CORS"

# After Prompt 2
git add src/risk_engine/api/simulations.py
git commit -m "feat(api): implement simulation submit and results endpoints"

# After Prompt 3
git add src/risk_engine/api/ws.py
git commit -m "feat(api): add WebSocket streaming for simulation progress"

# After Prompt 4
git add src/risk_engine/api/chat.py
git commit -m "feat(api): add Ollama-powered chat endpoint"

# After Prompt 5
git add tests/unit/
git commit -m "test(api): add integration tests for simulation and chat endpoints"

# After Prompt 6
git add frontend/
git commit -m "feat(frontend): scaffold Next.js dashboard with TypeScript"

# After Prompt 7
git add frontend/components/ frontend/app/
git commit -m "feat(frontend): add simulation form and landing page"

# After Prompt 8
git add frontend/app/dashboard/
git commit -m "feat(dashboard): add results page with charts"

# After Prompt 9
git add frontend/components/charts/ frontend/components/ChatInterface.tsx
git commit -m "feat(dashboard): add heatmap and chat interface"

# After Prompt 10
git add frontend/ docker-compose.yml
git commit -m "feat(docker): add frontend service and polish UI for production"

# View your work
git log --oneline
```

---

## Verification Checklist

After all 10 prompts:

- [ ] Backend starts without errors: `poetry run uvicorn risk_engine.surrogate.app:app --app-dir src --port 8080`
- [ ] Existing `/api/v2/predict` still works
- [ ] New `/api/v3/simulations/submit` returns job_id
- [ ] `/api/v3/simulations/{job_id}/results` returns ECL with hazard_rate and pd
- [ ] WebSocket `/api/v3/ws/simulations/{job_id}` streams events (test with `wscat` or browser dev tools)
- [ ] Chat endpoint `/api/v3/chat/query` works when Ollama is running
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Frontend runs: `cd frontend && npm run dev` on http://localhost:3000
- [ ] Form submits → navigates to dashboard
- [ ] Charts render with real data
- [ ] Chat shows "Ollama is not running" error when Ollama is down
- [ ] No TypeScript errors
- [ ] All commits are on `feature/quant-dashboard` branch

---

## Next Steps (After Completion)

- Create a pull request (do NOT merge to main yet)
- Request review if working with others
- Deploy to staging for integration testing
- Load test with concurrent simulations
- Consider adding:
  - User authentication (JWT)
  - Rate limiting per user
  - Persistent job history (database)
  - Export results to PDF/CSV
  - Admin dashboard for job queue monitoring
