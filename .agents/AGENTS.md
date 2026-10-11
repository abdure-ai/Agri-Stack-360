# NMIS Project — AI Agent Context
# This file is read automatically by AI coding assistants working on this project.
# Last updated: 2026-08-14 (revised after Stage 1/2/3 retraining with fixed data loader)

## What This Project Is

Ethiopian Agricultural Market Price Intelligence System.

- **Data**: `nmis_prices.db` — 61.6 MB SQLite, 445,010 weekly observations,
  309 markets, 6 regions (Oromia, Amhara, SNNP, South West, Sidama, Tigray),
  19 crops/26 varieties, March 2019 – August 2026.
- **Phase 1**: Interactive filterable web dashboard.
- **Phase 2**: Staged ML price prediction pipeline (baseline → Prophet → LightGBM).
- **Docs**: `docs/` directory contains the full implementation plan, results, walkthrough.

## Running Services (all should be up)

| Service | Command | Port |
|---|---|---|
| Market data API | `uvicorn backend.main:app --port 8000 --reload` | 8000 |
| React dashboard | `cd frontend && npm run dev` | 5173 |
| Prediction API | `uvicorn serving.predict_api:app --port 8001 --reload` | 8001 |
| Data sync service | `uvicorn scraper.api:app --port 8002 --reload` (single process) | 8002 |

Run all commands from `c:\Users\user\Projects\NMIS\`.

## File Map (most important files)

```
nmis_prices.db                  ← main database, never modify directly
agri_platform.db                ← platform DB (users, farms, advisory) — backend/platform_db.py
requirements.txt                ← pip dependencies

scraper/                        ← data sync service (nmis.et → nmis_prices.db), see docs/06_data_sync.md
  api.py                        ← FastAPI, port 8002, admin-only /sync endpoints
  manager.py / scheduler.py     ← one-at-a-time background runs; daily timer
  sync.py                       ← refresh logic (quick = active pairs, full = all); resumable via cutoff
  store.py                      ← sync_runs + sync_settings tables in nmis_prices.db
  retrain.py                    ← runs models/retrain.py after a sync (subprocess); predictor hot-reloads
  nmis_scraper.py               ← original full-history CLI; sync reuses its fetch/save functions
  check_status.py               ← DB status / scrape progress
  inspect_nmis.py               ← Playwright API discovery
scripts/                        ← dev utilities, not imported by the app
  smoke_test_api.py             ← hits localhost:8000 endpoints
  probes/                       ← one-off API / DB exploration scripts
data/
  exports/nmis_prices.csv       ← CSV export of nmis_prices.db
  samples/                      ← raw nmis.et API response samples
logs/                           ← scraper logs

backend/
  main.py                       ← FastAPI app, port 8000
  database.py                   ← SQLite connection + raw SQL helpers
  models.py                     ← Pydantic response models
  routers/prices.py             ← timeseries, regional, heatmap, spread, summary endpoints
  routers/meta.py               ← crops, markets, varieties endpoints

frontend/src/
  App.jsx                       ← main app, tab routing, parallel API fetches
  index.css                     ← complete design system (dark mode, HSL palette)
  api/client.js                 ← typed fetch helpers (BASE = http://localhost:8000/api)
  components/FilterSidebar.jsx  ← crop→variety, region→market cascading selectors
  components/SummaryCards.jsx   ← 4 stat cards with WoW change
  components/views/
    TimeSeriesView.jsx           ← Recharts ComposedChart + min-max bands, hover tooltip
    RegionalComparisonView.jsx   ← one line per region
    HeatmapView.jsx              ← custom SVG heatmap
    SpreadView.jsx               ← retail vs producer gap

models/
  data_loader.py                ← (crop, region) series builder — shared by all stages
  train_stage1_baseline.py      ← seasonal naive + rolling 4w
  train_stage2_prophet.py       ← Prophet for 5 long-history crops
  train_stage3_lgbm.py          ← global LightGBM quantile regression (q10/q50/q90)
  retrain.py                    ← periodic retraining, updates model_registry.json
  prophet/                      ← 25 serialised Prophet models (.json)
  lgbm/
    lgbm_q10.pkl                ← lower bound model
    lgbm_q50.pkl                ← median prediction model
    lgbm_q90.pkl                ← upper bound model
    lgbm_meta.pkl               ← feature list, category lists, train cutoff

serving/
  predictor.py                  ← PricePredictor class, recursive multi-step inference
  predict_api.py                ← FastAPI app, port 8001

evaluation/
  stage1_baseline_results.csv   ← MAPE per (crop, region) for baselines
  stage2_prophet_results.csv    ← MAPE for Prophet vs baseline
  stage3_comparison_table.csv   ← complete 3-stage comparison matrix (98 series)
  plots/                        ← actual vs. predicted PNGs

docs/
  README.md                     ← index + quick start
  01_project_overview.md        ← architecture, data context, confidence tiers
  02_implementation_plan.md     ← all design decisions with rationale
  03_dashboard_documentation.md ← every UI component explained
  04_model_results_analysis.md  ← Stage 1/2/3 numbers with honest interpretation
  05_walkthrough.md             ← step-by-step build record, bugs fixed, status
```

## Critical Data Rules — Read Before Touching Anything

1. **Never aggregate MAPEs across crops** — price scales differ 600×
   (14 ETB/kg Banana vs 8,488 ETB/quintal Sesame). Always per-(crop, region).
2. **Sesame/Amhara uses producer midpoint**, not retail (3.3% retail coverage).
   The `predictor.py` `PRODUCER_FALLBACK` set handles this.
3. **3 series are permanently excluded** from all modeling:
   - `Green Mung / South West` (6 total dates)
   - `Sesame / Tigray` (9 dates, 0% retail)
   - `Sesame / Sidama` (5 dates)
   These are in `EXCLUDE_SERIES` in `data_loader.py`.
4. **Time-based split only** — train ≤ 2025-12-31, test ≥ 2026-01-01.
   Never use random shuffles on time-series data.
5. **Gap filling**: weekly spine is `resample("W")` (aggregates all collection
   dates within each calendar week into one weekly observation), then
   forward-filled max 3 consecutive missing weeks. The old `reindex(spine)`
   approach was fixed 2026-08-14 — it discarded all non-Sunday records.
6. **High-MAPE anomaly series**: the following series have extreme baseline MAPEs
   due to erratic/sparse source data. LightGBM partially recovers them but they
   should not be used for consumer-facing predictions:
   - `Bean / South West` (229% LGBM MAPE)
   - `Local Rice / Sidama` (334% LGBM MAPE)
   - `Malt Barely / South West` (198% LGBM MAPE)
   - `Sesame / SNNP` (15.5% LGBM MAPE — usable, but unstable baseline)

## Current Model Results (as of 2026-08-14 retraining)

| Stage | Method | Series covered | Wins |
|---|---|---|---|
| Stage 1 | Seasonal Naive | 96 | 16/96 |
| Stage 1 | Rolling 4w Mean | 96 | 80/96 |
| Stage 2 | Prophet | 26 (long-history crops) | 7/26 |
| Stage 3 | LightGBM q50 | 96 | 81/96 |

Prophet now wins on: Wheat (5/6 regions), Maize/SNNP, Maize/Tigray.

## Known Issues / Open Work

- `predict_api.py` `/retrain` endpoint: background retraining works but has no
  progress endpoint — the caller gets an immediate 200 with no way to poll status.
  Add a job ID + `GET /retrain/status/{job_id}` if needed.
- Dashboard does not yet call the prediction API (port 8001). A "Forecast" tab
  could be added to `App.jsx` that calls `http://localhost:8001/predict`.
- Prophet models (Stage 2) are stored but not used by `predictor.py` — the
  inference engine uses only LightGBM. Prophet could be used as a fallback for
  the 5 long-history crops or used for longer horizons (> 12 weeks) where
  LightGBM's recursive prediction degrades.
- `retrain.py` retrains only LightGBM, not Prophet. If Prophet models are needed
  fresh, run `models/train_stage2_prophet.py` separately.
- Prediction API (`predict_api.py`) needs its BackgroundTasks import verified
  before the port 8001 server is started.

## Python Environment

- Python 3.14 (user's default)
- NumPy 2.4.2 — use `np.asarray(x, dtype=np.float32)` not `np.array(x, copy=False)`
  when passing pandas Series to LightGBM (NumPy 2.4 copy semantics changed).
- Prophet 1.3.0 — do NOT pass `fourier_order` to `Prophet()` constructor.
  Use `m.add_seasonality(name="yearly", period=365.25, fourier_order=10)`.
  Serialize with `from prophet.serialize import model_to_json` — `m.to_json()`
  does not exist in this version.
- Unicode warning: Windows console is cp1252. Use ASCII arrows `->` instead of
  Unicode `→` in print() statements to avoid UnicodeEncodeError.
