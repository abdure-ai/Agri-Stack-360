"""
api.py — NMIS Data Sync Service.

Keeps nmis_prices.db up to date with nmis.et: manual runs, a daily schedule,
run history and live progress. Independent of the platform API; it only shares
the database files and the JWT secret.

Run from the NMIS project root (single process — do not add --workers):
    uvicorn scraper.api:app --port 8002 --reload

Endpoints (all under /sync, admin only except /sync/health):
  GET  /sync/health
  GET  /sync/status            live progress, last run, schedule
  GET  /sync/overview          database totals and run-time estimates
  GET  /sync/runs              run history
  GET  /sync/runs/{id}         one run, with failed pairs
  GET  /sync/runs/{id}/log     log tail
  POST /sync/runs              start a sync
  POST /sync/runs/{id}/resume  continue a stopped / interrupted run
  POST /sync/stop              stop the running sync
  GET  /sync/schedule
  PUT  /sync/schedule
"""

import re
from contextlib import asynccontextmanager
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from scraper import config, scheduler as sched, store
from scraper.auth import require_admin
from scraper.manager import SyncBusyError, manager
from scraper.retrain import model_info
from scraper.sync import open_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    open_db().close()           # make sure the price schema exists
    store.init()                # sync tables; marks orphaned runs interrupted
    sched.scheduler.start()
    yield
    sched.scheduler.stop()
    manager.shutdown()


app = FastAPI(
    title="NMIS Data Sync Service",
    description="Keeps the NMIS price database up to date with nmis.et.",
    version="1.0.0",
    docs_url="/sync/docs",
    openapi_url="/sync/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?",  # devices on the same private network
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class StartSyncRequest(BaseModel):
    scope: Literal["active", "all"] = "active"
    refresh_catalog: bool = False
    export_csv: bool = False
    retrain: bool = True


class ScheduleSettings(BaseModel):
    enabled: bool
    time: str = Field(description="Local time HH:MM")
    full_sync_weekday: Optional[int] = Field(None, ge=0, le=6)
    refresh_catalog_on_full: bool = True
    export_csv: bool = False
    retrain_after_sync: bool = True
    rate: float = Field(1.0, ge=0.3, le=10)

    @field_validator("time")
    @classmethod
    def _valid_time(cls, v: str) -> str:
        if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", v):
            raise ValueError("time must be HH:MM (24-hour)")
        return v


def _schedule_payload() -> dict:
    settings = store.get_settings()
    return {**settings, "next_run": sched.next_run(settings)}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/sync/health")
def health():
    return {"status": "ok", "service": "nmis-data-sync", "running": manager.busy}


@app.get("/sync/status")
def status(_: dict = Depends(require_admin)):
    return {
        "server_time": store.utc_now(),
        "running": manager.progress(),
        "live_log": manager.live_log() if manager.busy else [],
        "last_run": store.last_finished_run(),
        "schedule": _schedule_payload(),
    }


@app.get("/sync/overview")
def overview(_: dict = Depends(require_admin)):
    db = store.database_overview()
    per_pair = store.seconds_per_pair()
    return {
        "database": db,
        "seconds_per_pair": round(per_pair, 2),
        "estimates_minutes": {
            scope: round(n * per_pair / 60) for scope, n in db["pairs"].items()
        },
        "active_days": config.ACTIVE_DAYS,
        "models": model_info(),
    }


@app.get("/sync/runs")
def runs(limit: int = Query(20, ge=1, le=200), _: dict = Depends(require_admin)):
    return store.list_runs(limit)


@app.get("/sync/runs/{run_id}")
def run_detail(run_id: int, _: dict = Depends(require_admin)):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(404, "Sync run not found")
    # fetch_log keeps only each pair's latest attempt, so failures are exact
    # for the most recent run and approximate for older ones.
    return {**run, "failed_pairs": store.failed_pairs(run["cutoff"])}


@app.get("/sync/runs/{run_id}/log")
def run_log(run_id: int, tail: int = Query(200, ge=1, le=5000),
            _: dict = Depends(require_admin)):
    path = manager.log_path(run_id)
    if not path.exists():
        return {"lines": []}
    with open(path, encoding="utf-8", errors="replace") as f:
        lines = f.read().splitlines()
    return {"lines": lines[-tail:]}


@app.post("/sync/runs", status_code=202)
def start_run(req: StartSyncRequest, user: dict = Depends(require_admin)):
    try:
        run_id = manager.start(
            trigger="manual", triggered_by=user["name"], scope=req.scope,
            refresh_catalog=req.refresh_catalog, export_csv=req.export_csv,
            retrain=req.retrain, rate=store.get_settings()["rate"],
        )
    except SyncBusyError as e:
        raise HTTPException(409, str(e))
    return store.get_run(run_id)


@app.post("/sync/runs/{run_id}/resume", status_code=202)
def resume_run(run_id: int, user: dict = Depends(require_admin)):
    try:
        new_id = manager.resume(run_id, triggered_by=user["name"],
                                rate=store.get_settings()["rate"])
    except SyncBusyError as e:
        raise HTTPException(409, str(e))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    return store.get_run(new_id)


@app.post("/sync/stop")
def stop_run(_: dict = Depends(require_admin)):
    if not manager.stop():
        raise HTTPException(409, "No sync is running")
    return {"status": "stopping"}


@app.get("/sync/schedule")
def get_schedule(_: dict = Depends(require_admin)):
    return _schedule_payload()


@app.put("/sync/schedule")
def put_schedule(body: ScheduleSettings, _: dict = Depends(require_admin)):
    current = store.get_settings()
    updated = {**current, **body.model_dump()}
    timing_changed = (updated["enabled"] and
                      (not current["enabled"] or updated["time"] != current["time"]))
    if timing_changed:
        sched.mark_today_handled_if_past(updated)
    store.save_settings(**{k: v for k, v in updated.items() if k in store.DEFAULT_SETTINGS})
    return _schedule_payload()
