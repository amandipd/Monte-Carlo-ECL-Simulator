# Build the Quant Dashboard with Cursor

This guide gets you from 0 to a working "Quant-as-a-Service" dashboard in ~2 hours using Cursor AI.

## Files You Need

1. **`CURSOR_PROMPT.md`** — Complete architecture + context (READ THIS FIRST)
2. **`CURSOR_PROMPTS.md`** — 10 prompts to copy-paste into Cursor (FEED THESE IN ORDER)
3. **This file** — Quick reference

## Step-by-Step

### 1. Initialize Git Branch

```bash
cd archive/quant/monte-carlo-risk-engine
git init  # if not already a repo
git checkout -b feature/quant-dashboard
```

### 2. Start Ollama (Required)

```bash
# Install from https://ollama.com

# Terminal A: Pull the model (one-time)
ollama pull llama3.2

# Terminal B: Keep running
ollama serve
# Output: "Listening on http://localhost:11434"
```

### 3. Open Files in Cursor

- Open `CURSOR_PROMPT.md` (for reference)
- Open `CURSOR_PROMPTS.md` (for copy-paste)
- Create a new Cursor chat

### 4. Feed Prompts to Cursor

Copy each prompt from `CURSOR_PROMPTS.md` and paste into Cursor's chat, one at a time.

**Expected timing:**
- Prompts 1-4 (backend): ~15 min each = 60 min total
- Prompt 5 (tests): ~5 min
- Prompts 6-9 (frontend): ~10 min each = 40 min total
- Prompt 10 (polish): ~5 min

**Total: ~2 hours**

### 5. Test After Each Phase

**After Prompt 4 (chat endpoint):**
```bash
# Terminal C: Test backend
cd archive/quant/monte-carlo-risk-engine
poetry run uvicorn risk_engine.surrogate.app:app --app-dir src --reload --port 8080

# Terminal D: Submit a simulation
curl -X POST http://localhost:8080/api/v3/simulations/submit \
  -H "Content-Type: application/json" \
  -d '{"unemployment_rate":6.5,"interest_rate":5.25,"housing_price_index":95.0,"n_loans":10000,"method":"vectorized"}'
```

**After Prompt 6 (frontend scaffold):**
```bash
cd archive/quant/monte-carlo-risk-engine/frontend
npm run dev
# → Visit http://localhost:3000
```

### 6. Commit After Each Prompt

```bash
git add <files>
git commit -m "feat(phase): description"
```

See `CURSOR_PROMPTS.md` section "Git Commit Strategy" for exact commands.

## What Gets Built

| Phase | What | Time |
|-------|------|------|
| 1-4 | FastAPI backend with simulation endpoints, WebSocket, Ollama chat | 60 min |
| 5 | Unit + integration tests | 5 min |
| 6-10 | Next.js frontend with forms, charts, dashboard | 60 min |

## Architecture (TL;DR)

```
Frontend (Next.js 15)
    ↓ REST + WebSocket
Backend (FastAPI)
    ↓
Simulation Engine (existing: ecl_engine.py, vectorized_calc, surrogate)
    ↓
Ollama (free, local LLM for "Chat with your Data")
```

**Key URLs:**
- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- Ollama: http://localhost:11434
- Swagger docs: http://localhost:8080/docs

## Environment Setup

Nothing to add to `.env` — Ollama config is already in the codebase:
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=llama3.2`
- `LLM_MOCK=false` (set to `true` to skip Ollama in tests)

## If Something Goes Wrong

| Problem | Solution |
|---------|----------|
| "Ollama unreachable" | Run `ollama serve` in a terminal |
| "Model not found" | Run `ollama pull llama3.2` |
| Backend won't start | Check if port 8080 is free: `lsof -i :8080` |
| Frontend build fails | Delete `frontend/node_modules` and `npm install` again |
| TypeScript errors | Run `npm run build` to see full list |
| Tests fail | Ensure `LLM_MOCK=true` is set in `.env` |

## After Completion

✅ You have a working dashboard that:
- Submits Monte Carlo simulations with custom macro parameters
- Shows real-time progress via WebSocket
- Displays ECL results with interactive charts
- Has a chat interface to ask questions about simulation results (Ollama)
- Caches results in Redis for fast retrieval

🔄 Next steps (not in these prompts):
- Add authentication (JWT)
- Add rate limiting
- Add persistent job history (database)
- Deploy to cloud (Vercel for frontend, Railway/Render for backend)
- Add more chart types (sensitivity analysis, scenario comparison)

## Support

- Architecture questions → read `CURSOR_PROMPT.md`
- Prompt issues → check `CURSOR_PROMPTS.md` section "Verification Checklist"
- Code issues → ask Cursor with `@` references to the codebase

Good luck! 🚀
