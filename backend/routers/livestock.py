"""
routers/livestock.py — NMIS livestock prices and the livestock price forecast (backend/livestock.py).

Everyone signed in (market:read — web and mobile):
  GET  /api/livestock/summary                         what is loaded: animals, markets, period
  GET  /api/livestock/prices?animal=&region=&market=  price series per grade and market, with the 4-week outlook
  GET  /api/livestock/forecast?animal=&region=        forecast: direction, % change, 80% range, confidence, reasons
Data managers (sync:manage — admin):
  GET  /api/admin/livestock/template.csv              empty CSV with the expected columns
  POST /api/admin/livestock/import                    upload a CSV of price reports (upsert), then retrain
Model retraining (models:retrain — admin):
  POST /api/admin/livestock/train
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from backend import livestock
from backend.auth import require_permission
from backend.database import get_connection
from backend.permissions import P

router = APIRouter(tags=["livestock"])
_read = require_permission(P.MARKET_READ)
MAX_UPLOAD = 20 * 1024 * 1024


def _animal_or_404(conn, animal: str) -> str:
    if animal not in livestock.animals(conn):
        raise HTTPException(404, f"No livestock reports for '{animal}'")
    return animal


@router.get("/livestock/summary")
def summary(_user=Depends(_read)):
    return livestock.summary(get_connection())


@router.get("/livestock/prices")
def prices(animal: str, region: str | None = None, market: str | None = None, _user=Depends(_read)):
    conn = get_connection()
    _animal_or_404(conn, animal)
    result = livestock.forecast(conn, animal, region)
    items = livestock.series(conn, animal, region, market)
    for s in items:
        s["outlook"] = livestock.projected(s["latest"], result)
    return {"animal": animal, "region": region, "forecast": result, "series": items, "source": livestock.SOURCE}


@router.get("/livestock/forecast")
def forecast(animal: str, region: str | None = None, _user=Depends(_read)):
    conn = get_connection()
    return livestock.forecast(conn, _animal_or_404(conn, animal), region)


@router.get("/admin/livestock/template.csv")
def template(_user=Depends(require_permission(P.SYNC_MANAGE))):
    return Response(",".join(livestock.CSV_COLUMNS) + "\n", media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="livestock-prices-template.csv"'})


@router.post("/admin/livestock/import")
async def import_csv(file: UploadFile = File(...), _user=Depends(require_permission(P.SYNC_MANAGE))):
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "File is larger than 20 MB")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "Save the file as CSV (UTF-8)") from None

    def run():
        conn = get_connection()
        result = livestock.import_csv_text(conn, text)
        trained = livestock.train(conn) if result["added"] or result["updated"] else []
        return {**result, "forecasts": sum(1 for r in trained if r["status"] == "ok")}

    try:
        return await asyncio.to_thread(run)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None


@router.post("/admin/livestock/train")
def retrain(_user=Depends(require_permission(P.MODELS_RETRAIN))):
    results = livestock.train(get_connection())
    return {"trained": len(results), "forecasts": sum(1 for r in results if r["status"] == "ok"),
            "results": [{k: r.get(k) for k in ("animal", "region", "status", "confidence", "change_pct")}
                        for r in results]}
