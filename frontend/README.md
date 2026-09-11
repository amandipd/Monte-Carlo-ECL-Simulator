# Quant-as-a-Service Dashboard (Frontend)

A Next.js 15 dashboard for the Monte Carlo Expected Credit Loss (ECL) engine.
Submit macro scenarios, watch multicore simulations stream progress over a
WebSocket, and explore ECL distributions and a hazard-rate heatmap.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** (dark mode)
- **Recharts** (ECL distribution histogram)
- Talks to the FastAPI backend at `http://localhost:8080` (`/api/v3/*`)

## Prerequisites

- **Node.js 20+** and npm — https://nodejs.org
- The **backend** running on port `8080`:

  ```bash
  # from the repo root (archive/quant/monte-carlo-risk-engine)
  poetry install
  poetry run uvicorn risk_engine.api.app:app --app-dir src --reload --port 8080
  ```

- **Redis** (result caching) — `docker compose up -d redis`

## Install & run (local)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

### Configuration

The backend base URL defaults to `http://localhost:8080`. Override it with an
environment variable (e.g. in `frontend/.env.local`):

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8080
```

## Run with Docker

From the repo root, the `frontend` service is defined in `docker-compose.yml`:

```bash
docker compose up frontend           # dashboard on :3000
docker compose up                    # redis + backend + frontend together
```

The container runs `npm install && npm run dev` against a `node:20-slim` image
and depends on `simulation-api`.

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server on port 3000    |
| `npm run build` | Production build                     |
| `npm run start` | Serve the production build           |
| `npm run lint`  | Run ESLint                           |

## Project structure

```
frontend/
├── app/
│   ├── layout.tsx                     # Root layout (dark theme, metadata)
│   ├── page.tsx                       # Landing page + SimulationForm
│   └── dashboard/[jobId]/
│       ├── page.tsx                   # Results dashboard
│       ├── loading.tsx                # Route loading skeleton
│       └── error.tsx                  # Route error boundary
├── components/
│   ├── SimulationForm.tsx             # Macro sliders, presets, method picker
│   ├── Skeleton.tsx                   # Loading skeletons
│   └── charts/
│       ├── MetricsCard.tsx            # ECL, defaults, PD, hazard, timing
│       ├── ECLDistribution.tsx        # Recharts histogram + p5/p50/p95
│       └── HazardSurface.tsx          # Client-side hazard-rate heatmap
├── hooks/
│   ├── useSimulation.ts               # Submit + poll for results
│   └── useWebSocket.ts                # Stream multicore progress
└── lib/
    ├── api.ts                         # Fetch wrapper + API_BASE
    ├── types.ts                       # Interfaces mirroring the Pydantic models
    └── utils.ts                       # Number/currency formatting
```

## Usage

1. On the landing page, pick a **preset scenario** (Baseline, Mild Recession,
   Severe Recession, Housing Crash, Rate Spike) or set the macro sliders and
   `n_loans` by hand, choose a **method**, and submit.
2. **vectorized** completes synchronously; **multicore** streams a live
   progress bar via WebSocket before showing final results.
3. On the dashboard: view the metrics card, ECL distribution histogram (with
   p5/p50/p95 markers), and the hazard-rate heatmap (current scenario marked).
