# 05 — Project Walkthrough

A chronological record of everything built, the decisions made, and the results at each step.

---

## Step 0: Data Acquisition & Database Setup

**What was done**:
- Raw price data scraped from NMIS (Ethiopian Ministry of Agriculture market reporting system) using a custom Python scraper (`scraper/nmis_scraper.py`).
- Scraped data stored in a normalised SQLite database (`nmis_prices.db`, 61.6 MB).
- Schema: 4 tables in 3NF (`markets`, `crops`, `varieties`, `prices`).
- Total: 445,010 price observations across 309 markets, 6 regions, 19 crops/26 varieties, March 2019 – August 2026.

**Key data characteristic discovered during probing**:
- Date coverage is uneven: Teff, Maize, Wheat, Bean, Sesame → from 2019. Other 14 crops → from December 2022.
- Volume field is 41.6% NULL — must be handled as a 3-class signal, not binary.
- Sesame/Amhara has only 3.3% retail coverage; uses producer midpoint.
- Green Mung/South West: 6 total dates → excluded from all modeling.

---

## Step 1: Phase 1 — Dashboard Backend (FastAPI)

**Files created**:
- `backend/main.py` — FastAPI application
- `backend/database.py` — SQLite connection, SQLAlchemy-free raw SQL for performance
- `backend/routes/` — individual route files per endpoint

**Endpoints built**:
```
GET /api/crops          → all crops with variety list and data_start per variety
GET /api/markets        → markets filterable by region
GET /api/timeseries     → weekly prices for (crop, variety, markets, date range)
GET /api/regional       → region-aggregated weekly prices
GET /api/heatmap        → market × date price grid
GET /api/spread         → retail vs producer price gap
GET /api/summary        → latest-week snapshot with WoW change
```

**Key design decisions**:
- All prices returned as `{min, max, midpoint}` — never a false single value from sparse data.
- Date range bounded per crop in the API response (`data_start` per variety).
- CORS enabled for the React frontend.

---

## Step 2: Phase 1 — Dashboard Frontend (React + Vite)

**Stack**: React 18, Vite, Recharts, vanilla CSS.

**Files created**:
- `frontend/src/index.css` — full design system: dark mode, HSL palette, typography (Inter + Noto Sans Ethiopic), glassmorphism cards, skeleton loaders
- `frontend/src/api/client.js` — typed fetch helpers
- `frontend/src/utils/formatters.js` — ETB formatting, date utilities
- `frontend/src/utils/colors.js` — region colours, heatmap interpolation
- `frontend/src/components/FilterSidebar.jsx` — cascading crop→variety, region→market selectors, date picker bounded per crop
- `frontend/src/components/SummaryCards.jsx` — 4 summary cards with skeleton loading
- `frontend/src/components/views/TimeSeriesView.jsx` — Recharts ComposedChart with min-max bands
- `frontend/src/components/views/RegionalComparisonView.jsx` — one line per region
- `frontend/src/components/views/HeatmapView.jsx` — custom SVG grid (Recharts doesn't support heatmaps natively)
- `frontend/src/components/views/SpreadView.jsx` — retail vs producer two-panel layout
- `frontend/src/App.jsx` — main app, tab routing, parallel API fetch on filter apply

**Notable feature**: Time Series hover tooltip shows the exact ETB price at each hovered coordinate — added after initial build in response to user request.

**Build status**: Clean Vite build, chunk size warning from Recharts only (not an error). Running at `http://localhost:5173`.

---

## Step 3: Phase 2 — ML Pipeline Design

**Pre-build research**:
- Ran `scripts/probes/probe_for_model.py` against live database to ground design decisions in data rather than assumptions.
- Key finding: Teff/Oromia has 11.1% weekly gaps over its 379-week spine — interpolation required before lag features.
- Key finding: 600× price scale difference between crops — MAPE must be per-crop, never blended.

**Design questions asked and answered**:
1. Prediction target → **retail midpoint** (96% coverage, most useful)
2. Stage 2 model → **Prophet** (handles gaps natively, better seasonal decomposition)
3. Uncertainty representation → **Quantile regression** (q10/q50/q90 from LightGBM)
4. Retraining → **Full retrain** via `retrain.py` (fast enough, avoids incremental drift)

**Files created**:
- `models/data_loader.py` — shared (crop, region) series builder: aggregates weekly median, handles Sesame/Amhara fallback, forward-fills gaps, encodes volume signal

---

## Step 4: Stage 1 — Baseline Training

**Script**: `models/train_stage1_baseline.py`

**Method**: Seasonal naive (52-week lag) + rolling 4-week mean per (crop, region).

**Results summary**:
- 82 series evaluated across all 19 crops.
- Rolling 4w wins 59/82 series.
- Best baselines: Bean (4.6% SN MAPE), Local Rice (5.7% Roll4w), Soybean (7.7% Roll4w).
- Worst baselines: Onion (26.3% SN), Mango (26.8% SN), Tomato (26.5% SN).

**Outputs**:
- `evaluation/stage1_baseline_results.csv`
- `evaluation/plots/stage1_teff_oromia.png`
- `evaluation/plots/stage1_onion_amhara.png`
- `evaluation/plots/stage1_sesame_snnp.png`

---

## Step 5: Stage 2 — Prophet Training

**Script**: `models/train_stage2_prophet.py`

**Scope**: 25 series across {Teff, Maize, Wheat, Bean, Sesame} × qualifying regions.

**Fit time**: ~90 seconds total on CPU (Prophet 1.3.0).

**Results summary**:
- Prophet wins 6/25 series — all 6 are Maize regions (+0.9–1.9pp improvement).
- Bean, Sesame, Teff, Wheat: simple rolling 4w mean beats Prophet in all cases.
- Conclusion: Prophet's yearly Fourier seasonality adds signal for trend-breaking crops (Maize) but is outweighed by short-term inertia for stable grains.

**Bug fixed**: `Prophet.__init__()` does not accept `fourier_order` as a constructor argument in v1.3 — it must be passed via `add_seasonality()`. Fixed inline.

**Outputs**:
- `models/prophet/` — 25 `.json` serialised Prophet model files
- `evaluation/stage2_prophet_results.csv`
- `evaluation/plots/stage2_teff_oromia.png`
- `evaluation/plots/stage2_sesame_snnp.png`
- `evaluation/plots/stage2_bean_oromia.png`

---

## Step 6: Stage 3 — LightGBM Global Quantile Model

**Script**: `models/train_stage3_lgbm.py`

**Scope**: 98 qualifying (crop, region) series.

**Feature engineering**: 16 features including lags (1w, 4w, 12w), rolling stats (4w mean/std, 12w mean), price momentum ratios, cyclical calendar encodings (sin/cos of week + month), volume signal, history length, and LightGBM native categoricals for crop and region.

**Three models trained**: q0.10, q0.50, q0.90 (each takes ~45 seconds on CPU).

**Bug fixed**: NumPy 2.4 introduced stricter `copy=False` semantics that caused `LightGBM.set_label()` to fail. Fixed with `np.asarray(y_train, dtype=np.float32)` before `.fit()`.

**Results summary**:
- LightGBM wins **95/98 series**.
- Bean/Amhara, Bean/Sidama, Bean/South West: seasonal naive marginally better (sparse/stable series).
- Produce crops (Onion, Tomato, Mango, Red Pepper): MAPE halved from Stage 1 baseline.
- Teff/Oromia: 13.9% (Roll4w) → **10.2% (LGBM)** — significant improvement.
- Wheat/Oromia: 8.4% (Roll4w) → **6.2% (LGBM)**.

**Fit time**: ~2.5 minutes total (3 models × ~45s each).

**Outputs**:
- `models/lgbm/lgbm_q10.pkl`
- `models/lgbm/lgbm_q50.pkl`
- `models/lgbm/lgbm_q90.pkl`
- `models/lgbm/lgbm_meta.pkl`
- `evaluation/stage3_comparison_table.csv`
- `evaluation/plots/stage3_teff_oromia.png`
- `evaluation/plots/stage3_onion_amhara.png`
- `evaluation/plots/stage3_sesame_snnp.png`

---

## Step 7: Serving Layer

**Files created**:
- `serving/predictor.py` — inference engine: loads LightGBM models, performs recursive multi-step forecasting, returns predictions with confidence tiers.
- `serving/predict_api.py` — FastAPI application with `/predict`, `/retrain`, `/metadata`, `/health` endpoints.
- `models/retrain.py` — periodic retraining script.

**Live inference test (2026-08-12)**:
- Query: `Wheat / Oromia / 4 weeks ahead`
- Response: q50 ≈ 7,250 ETB/Quintal, q10–q90 band = 6,721–7,978 ETB (±8.5%), confidence = `high`.
- Inference time: < 2 seconds including DB query.

**Retrain run (2026-08-12)**:
- Input: full dataset through 2026-08-11, 6,456 training observations.
- All 3 quantile models replaced successfully.
- `model_registry.json` updated.

---

## Current Status

| Component | Status |
|---|---|
| SQLite database (`nmis_prices.db`) | Complete |
| Market data backend (port 8000) | Running |
| React dashboard (port 5173) | Running |
| Stage 1 baseline models | Complete, evaluated (96 series) |
| Stage 2 Prophet models (26 series) | Complete, evaluated |
| Stage 3 LightGBM models (3 pkl files) | Complete, evaluated (81/96 wins) |
| Inference engine (`predictor.py`) | Complete, tested |
| Prediction API (`predict_api.py`) | Built, pending final server start |
| Retrain script (`retrain.py`) | Complete, tested |
| Documentation (`docs/`) | **This directory** |

---

## Step 8: Data Loader Bug Fix and Full Retraining (2026-08-14)

**Root cause discovered**: `models/data_loader.py` was building the weekly price
spine with `pd.date_range(freq="W")` then `df.reindex(spine)`. This produced a
Sunday-only spine, silently discarding all price records that didn't fall exactly
on Sunday. Since the NMIS source data is collected across all days of the week,
this threw away 90–99% of data for most crops:

| Crop/Region | Usable train weeks (old) | Usable train weeks (new) |
|---|---|---|
| Teff/Oromia | 188 | 347 |
| Bean/Oromia | 21 (failed MIN_TRAIN=40) | 225 |
| Mango/Oromia | 24 (0 test weeks) | 158 |
| Sesame/Oromia | ~0 | 140 |

Bean, Sesame, Mango, Pineapple were completely absent from Stage 1 results
because their Sunday-matching data fell below the 40-week minimum.

**Fix**: Replaced `reindex(spine)` with `resample("W").agg(...)` which aggregates
all collection dates within the same calendar week into a single weekly observation.

**Other bugs fixed in the same session**:
1. `fourier_order=10` passed to `Prophet()` constructor — removed (AGENTS.md rule).
   Changed `yearly_seasonality=True` to `yearly_seasonality=False` since a custom
   yearly seasonality is added explicitly via `add_seasonality`.
2. `m.to_json()` — this method does not exist in Prophet 1.3.0. Fixed by importing
   and using `from prophet.serialize import model_to_json`.
3. Unicode `→` in a print statement in `train_stage1_baseline.py` causing
   `UnicodeEncodeError` on Windows cp1252 console — replaced with `->`.

**Retraining results after fix**:

| Stage | Coverage | Wins |
|---|---|---|
| Stage 1 (Seasonal Naive) | 96 series | 16/96 |
| Stage 1 (Rolling 4w) | 96 series | 80/96 |
| Stage 2 (Prophet) | 26 series (5 long-hist crops) | 7/26 |
| Stage 3 (LightGBM) | 96 series | 81/96 |

Prophet wins on Wheat (5/6 regions) and Maize/SNNP, Maize/Tigray — a different
pattern from the previously-documented results (which were computed on sparse data
and showed Prophet winning only on Maize).

**High-MAPE anomaly series identified** (data quality issues in the raw source):
- Bean/South West: 229% LGBM MAPE (428% baseline)
- Local Rice/Sidama: 334% LGBM MAPE (311–348% baseline)
- Malt Barely/South West: 198% LGBM MAPE (255–304% baseline)

These should be flagged `confidence: "very_low"` or excluded from the prediction API.

---

## Pending (Phase 2 continuation)

1. Fix `predict_api.py` `BackgroundTasks` import bug → start prediction server on port 8001.
2. Connect prediction API to dashboard frontend (optional: add a "Forecast" tab to the dashboard that calls the prediction API).
3. Write `requirements.txt` covering both dashboard and ML dependencies.
4. Add `confidence: "very_low"` handling in `predictor.py` for the high-MAPE
   anomaly series (Bean/SW, Local Rice/Sidama, Malt Barely/SW), or add them to
   `EXCLUDE_SERIES` in `data_loader.py`.
