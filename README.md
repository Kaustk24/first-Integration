# NIFTY 50 ML Trading Dashboard — Merged Full-Stack App

This project merges two previously separate repos into one runnable app:

- **`backend/`** — a FastAPI ML inference service (Python 3.10) that serves live
  NIFTY 50 return/direction predictions, Groww-style order analysis, and
  4-part risk-management analytics, from trained XGBoost/scikit-learn models.
  It works **fully offline** — pre-seeded historical parquet buffers exist for
  every NIFTY 50 ticker, so predictions work with zero FYERS credentials.
  Live FYERS market data/auth is optional and additive.
- **`frontend/`** — a React 19 + Vite + Tailwind dashboard (Dashboard, Market
  Analytics, Trade Discovery, Risk Management, Analytics pages) that now calls
  the backend's REST API for every live number shown on screen, instead of
  hardcoded mock data.

Both are wired together and start with a single command.

---

## 1. One-time setup

You need **Node.js 18+** and **Python 3.10+** installed.

```bash
# from the project root
npm install          # installs root tooling (concurrently)
npm run setup        # installs frontend npm deps + backend pip deps
```

`npm run setup` runs, in order:
- `npm install --prefix frontend`
- `python -m pip install -r backend/requirements.txt`

If your Python 3 binary is called `python3` instead of `python` on your
system, run the backend install manually instead:

```bash
python3 -m pip install -r backend/requirements.txt
```

(Optional but recommended) create a virtual environment first:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate   # Windows: backend\.venv\Scripts\activate
python -m pip install -r backend/requirements.txt
```

If you use a venv, make sure it's **activated** in the terminal(s) where the
backend runs — `npm run dev` shells out to whatever `python`/`uvicorn` is on
your active PATH.

## 2. Run everything with one command

```bash
npm run dev
```

This uses `concurrently` to start:
- the **FastAPI backend** at `http://127.0.0.1:8000` (`uvicorn api.app:app --reload`)
- the **Vite frontend** at `http://127.0.0.1:5173`

Open **http://127.0.0.1:5173** in your browser. The frontend's dev server
proxies `/predict`, `/api`, `/health`, `/fyers`, `/retrain` straight through to
the backend (see `frontend/vite.config.ts`), so there's no CORS setup needed
and no separate `.env` is required for local development.

You can also run each side separately in two terminals:

```bash
npm run dev:backend    # terminal 1
npm run dev:frontend   # terminal 2
```

## 3. What's wired up

Every page in the frontend now calls the live backend instead of showing
hardcoded numbers:

| Page | Backend endpoint(s) used |
|---|---|
| Dashboard | `GET /predict/{ticker}`, `GET /api/market/nifty50` |
| Market Analytics | `GET /predict/{ticker}` |
| Trade Discovery | (client-side form; hands qty/ticker/limit price to Risk Management) |
| Risk Management | `GET /predict/{ticker}?qty=&limit_price=` |
| Analytics | `GET /predict/{ticker}` |

`src/lib/api.ts` is the single API client; `src/hooks/usePrediction.ts` and
`src/hooks/useMarketSummary.ts` are the data-fetching hooks (with polling and
graceful fallback if the backend is briefly unreachable — the UI keeps
showing the last good numbers and surfaces a small status banner instead of
crashing).

Auth (login/register) in the frontend is a local mock (no backend auth
endpoints exist) — it was left as-is since the backend has no user system to
wire it to.

## 4. Live FYERS market data (optional)

By default the backend runs in **offline fallback mode**: `/predict/{ticker}`
and `/api/market/nifty50` return realistic values derived from seeded
historical data. To pull real FYERS quotes instead:

1. Copy `backend/.env.example` to `backend/.env` and fill in `FYERS_APP_ID`
   and `FYERS_SECRET_KEY`.
2. Restart the backend, then either:
   - visit `http://127.0.0.1:8000/fyers/login` once to complete OAuth, or
   - `POST` an existing access token to `http://127.0.0.1:8000/fyers/token`.

The backend auto-refreshes the FYERS access token afterwards — no need to
repeat this on every restart (tokens are cached in `backend/data/live/`).

## 5. Production build

```bash
npm run build
```

Builds the frontend to `frontend/dist/`. For a real deployment, run the
backend behind `uvicorn`/`gunicorn` on its own host and set
`frontend/.env` → `VITE_API_BASE_URL=https://your-backend-host` before
building, so the frontend calls the backend's real origin instead of relying
on the (dev-only) Vite proxy.

## 6. Project structure

```
.
├── package.json          # root orchestration (concurrently)
├── backend/               # FastAPI ML service (Python)
│   ├── api/app.py         # REST endpoints
│   ├── inference/         # live prediction pipeline
│   ├── models/registry/   # trained champion models
│   ├── data/live/         # seeded per-ticker parquet buffers (offline mode)
│   ├── requirements.txt
│   └── .env.example
└── frontend/               # React + Vite + Tailwind dashboard
    ├── src/
    │   ├── lib/api.ts             # API client
    │   ├── hooks/usePrediction.ts
    │   ├── hooks/useMarketSummary.ts
    │   ├── types/api.ts           # types mirroring backend schemas
    │   ├── components/ApiStatusBanner.tsx
    │   └── pages/                 # Dashboard, MarketAnalytics, TradeDiscovery,
    │                               # RiskManagement, Analytics — all wired to the API
    ├── vite.config.ts       # dev proxy → backend
    └── .env.example
```
