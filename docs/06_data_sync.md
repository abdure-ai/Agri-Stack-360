# Data Sync — Keeping Prices Up to Date

The data sync module (`scraper/`) keeps `nmis_prices.db` current with
[nmis.et](https://www.nmis.et). It runs as its own service, separate from the
platform API and the prediction API, and is controlled from the **Data Sync**
screen in the web app (admins only).

## Running it

```powershell
# From the project root. Keep to a single process — do not add --workers.
uvicorn scraper.api:app --port 8002 --reload
```

Then sign in as an admin and open **Data Sync** in the sidebar
(`/app/data-sync`). If the service is not running, the screen says so and
shows the command above.

API docs: http://localhost:8002/sync/docs

## What a sync does

1. **Checks for new markets.** Fetches the market list from nmis.et and
   catalogues any market not seen before (its crops and varieties).
2. **Fetches prices.** For every market/crop pair in scope, downloads the
   price table and saves it. New weeks are added; prices NMIS has corrected
   are updated.
3. **Optionally** rewrites `data/exports/nmis_prices.csv`.
4. **Updates price forecasts** (on by default) — see below.

There are two kinds of sync:

| | Quick sync | Full sync |
|---|---|---|
| Covers | Pairs that reported a price in the last 90 days, plus pairs never fetched | Every known pair |
| Size (Oct 2026) | ~2,550 pairs | ~7,080 pairs |
| Time at 1 request/sec | ~1 hour | ~3 hours |
| Use for | Daily updates | Weekly sweep — catches markets that resumed reporting |

"Re-check every market's crop list" also re-reads each market's crop list
(~620 extra requests, ~15 min), which finds crops a market started trading.

Only one sync runs at a time. Requests are rate-limited (default 1 second
apart, adjustable under *Advanced*) and retried with back-off on server errors.

## Daily schedule

Turn on **Automatic daily sync** and pick a time (server local time). Every day
at that time a quick sync runs; on the chosen weekday a full sync runs
instead. The schedule is off by default.

- If the service was down at the scheduled time, the sync runs as soon as it
  starts again that day.
- If a sync covering the same scope already succeeded that day (for example a
  manual one), the scheduled run is skipped.
- Turning the schedule on after today's time has passed starts tomorrow, not
  immediately.

## Updating forecasts after a sync

With **Update price forecasts** ticked (manual runs) or **Update price
forecasts after each sync** (schedule), the sync retrains the LightGBM
forecast models once prices are saved. It takes about 1–2 minutes.

- **Skipped** when the sync added no prices and the models already use the
  latest data. Shown as *Not needed*.
- Runs `models/retrain.py` in a separate process. The new model files replace
  the old ones only when training completes, so a failed or stopped training
  leaves the previous forecasts in place.
- The prediction API (port 8001) loads the new models on its next request — no
  restart needed.
- **Stop** during training ends it and keeps the previous models.
- The *Forecasts use data to* card shows how current the models are, and the
  history's *Forecasts* column shows each run's result (hover for details).

## Stopping and resuming

**Stop sync** finishes the current request and stops. Everything already
fetched is kept. **Resume** starts a new run that skips pairs the stopped run
already fetched. A run cut off by a crash or restart shows as *Interrupted* and
can be resumed the same way.

## Run results

| Status | Meaning |
|---|---|
| Completed | Every pair fetched |
| Completed with gaps | Some pairs failed (listed in the run details); they are retried on the next sync |
| Stopped | Stopped by an admin — can be resumed |
| Interrupted | The service stopped mid-run — can be resumed |
| Failed | An unexpected error; message shown in the run details |

Each run's full log is kept in `logs/sync/run_<id>.log` and shown in the run
details on the screen.

## How it fits together

```
scraper/
  api.py          FastAPI service (port 8002), admin-only endpoints under /sync
  manager.py      runs one sync at a time in a background thread; progress, stop, logs
  scheduler.py    daily timer (checks every 30 s)
  sync.py         the sync itself: which pairs, fetch, save, resume cutoff
  store.py        run history + schedule settings (tables sync_runs, sync_settings)
  retrain.py      runs models/retrain.py after a sync; skip/stop/timeout handling
  auth.py         accepts platform login tokens; checks the user is an active admin
  config.py       paths and constants (overridable by environment variables)
  nmis_scraper.py original full-history scraper (CLI); sync reuses its fetch/save code
```

- **Data**: run history and settings live in `nmis_prices.db` (tables
  `sync_runs`, `sync_settings`) next to the existing `fetch_log`.
- **Auth**: the web app sends the same login token it uses for the platform
  API. The service verifies it with the shared `JWT_SECRET_KEY` from `.env`
  and checks `agri_platform.db` (read-only) that the user is an active admin.
- **Dashboard freshness**: the platform API notices new data within 5 minutes
  (`backend/routers/meta.py`), so new dates appear in the filters without a
  restart.
- **Forecasts**: `scraper/retrain.py` runs `models/retrain.py` as a
  subprocess and streams its output into the run log. `models/retrain.py`
  writes each model file to a temp file then renames it; the prediction API
  reloads when `lgbm_meta.pkl` changes (`serving/predict_api.py`).

## Configuration

Set in the environment or in `.env`:

| Variable | Default |
|---|---|
| `NMIS_PRICES_DB` | `nmis_prices.db` |
| `NMIS_PLATFORM_DB` | `agri_platform.db` |
| `NMIS_CSV_EXPORT` | `data/exports/nmis_prices.csv` |
| `NMIS_SYNC_LOG_DIR` | `logs/sync` |
| `NMIS_MODEL_DIR` | `models/lgbm` (also read by `models/retrain.py` and `serving/`) |
| `NMIS_MODEL_REGISTRY` | `models/model_registry.json` |
| `JWT_SECRET_KEY` | shared with the platform API |

## Command line

The original scraper still works for a first full download or one-off jobs:

```powershell
python scraper/nmis_scraper.py --summary-only     # database summary
python scraper/nmis_scraper.py --markets 296,327  # specific markets
```

It marks each pair as done after its first fetch, so use the sync service, not
this script, for regular updates.
