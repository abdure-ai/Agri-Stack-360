# NMIS Project Documentation Index

**Ethiopian Agricultural Market Price Intelligence System**  
Database: `nmis_prices.db` | 445,010 observations | 309 markets | 6 regions | 19 crops | March 2019 – August 2026

---

## Documents in This Directory

| File | Description |
|---|---|
| [01_project_overview.md](./01_project_overview.md) | What the full system does, end-to-end architecture |
| [02_implementation_plan.md](./02_implementation_plan.md) | Technical design decisions and plan for both the dashboard and the ML pipeline |
| [03_dashboard_documentation.md](./03_dashboard_documentation.md) | What each UI component shows, how to use it |
| [04_model_results_analysis.md](./04_model_results_analysis.md) | Stage 1 / Stage 2 / Stage 3 evaluation results, honest comparison |
| [05_walkthrough.md](./05_walkthrough.md) | Step-by-step record of everything built: code, commands, findings |
| [06_data_sync.md](./06_data_sync.md) | Data sync service: daily updates from nmis.et, schedule, stop/resume |

---

## System Components Built

```
NMIS/
├── frontend/               React + Vite dashboard (port 5173)
├── backend/                FastAPI market data API (port 8000)
├── models/                 ML training pipeline
│   ├── data_loader.py      Shared (crop, region) series builder
│   ├── train_stage1_baseline.py   Seasonal naive + rolling 4w
│   ├── train_stage2_prophet.py    Prophet on 5 long-history crops
│   ├── train_stage3_lgbm.py       Global LightGBM quantile model
│   ├── retrain.py          Periodic retraining script
│   ├── prophet/            25 serialised Prophet models
│   └── lgbm/               lgbm_q10/q50/q90.pkl + meta
├── serving/
│   ├── predictor.py        Inference engine (recursive multi-step)
│   └── predict_api.py      FastAPI prediction server (port 8001)
├── scraper/                Data sync service (port 8002) + scraper CLI
│   ├── api.py              Sync service: manual runs, daily schedule, history
│   ├── nmis_scraper.py     Original full-history scraper (CLI)
│   ├── check_status.py     Database status / scrape progress inspector
│   └── inspect_nmis.py     Playwright network inspector (API discovery)
├── scripts/                Developer utilities (not part of the running app)
│   ├── smoke_test_api.py   Quick smoke test against the market data API
│   └── probes/             One-off API / database exploration scripts
├── data/
│   ├── exports/            nmis_prices.csv (full CSV export)
│   └── samples/            Raw API response samples (markets, crops, varieties)
├── logs/                   Scraper run logs
├── evaluation/
│   ├── stage1_baseline_results.csv
│   ├── stage2_prophet_results.csv
│   ├── stage3_comparison_table.csv
│   └── plots/              Actual vs. predicted PNGs (all stages)
├── docs/                   ← you are here
├── nmis_prices.db          Price database (read-only for the app)
└── agri_platform.db        Platform database (users, farms, advisory)
```

---

## Extra Files

| File | Description |
|---|---|
| [`requirements.txt`](../requirements.txt) | All pinned Python dependencies |
| [`dashboard_user_guide.md`](./dashboard_user_guide.md) | Plain-language guide to using the dashboard |
| [`nmis_historical_prices_dataset_report.md`](./nmis_historical_prices_dataset_report.md) | Dataset report: schema, coverage, how it was scraped |
| [`.agents/AGENTS.md`](../.agents/AGENTS.md) | **AI agent context file** — read automatically by AI assistants. Contains file map, critical data rules, known issues, and gotchas. |

## Quick Start

```powershell
# 0. Install Python dependencies
pip install -r requirements.txt

# 1. Market data API (port 8000)
uvicorn backend.main:app --port 8000 --reload

# 2. React dashboard (port 5173)
cd frontend; npm install; npm run dev

# 3. Price prediction API (port 8001)
uvicorn serving.predict_api:app --port 8001 --reload

# 4. Retrain ML models with latest DB data
python models/retrain.py

# 5. Data sync service (port 8002) — manage from Data Sync in the web app (admin)
uvicorn scraper.api:app --port 8002 --reload

# 6. Verify prediction API is working
# Open http://localhost:8001/docs in browser
# Or: Invoke-RestMethod "http://localhost:8001/predict?crop=Wheat&region=Oromia&weeks_ahead=4"
```
