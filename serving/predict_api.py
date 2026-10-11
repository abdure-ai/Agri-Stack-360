"""
serving/predict_api.py
──────────────────────
FastAPI serving layer for NMIS Price Prediction.

Endpoints:
  - GET  /predict?crop=wheat&region=oromia&weeks_ahead=4
  - POST /retrain        (admin only — models:retrain permission)
  - GET  /metadata
  - GET  /health
"""

import sys
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BASE_DIR))

from serving.predictor import PricePredictor, model_version
from models.data_loader import get_connection, load_series_index
from backend.auth import require_permission
from backend.permissions import P

app = FastAPI(
    title="NMIS Price Prediction API",
    description="Ethiopian Agricultural Market Price Prediction — LightGBM Quantile Forecasts",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton predictor — loaded on first request, reloaded when models/retrain.py
# (run here or by the data sync service) writes a new model set.
_predictor: Optional[PricePredictor] = None


def get_predictor() -> PricePredictor:
    global _predictor
    if _predictor is None or _predictor.version != model_version():
        _predictor = PricePredictor()
    return _predictor


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "nmis-price-prediction"}


@app.get("/metadata")
def get_model_metadata():
    """Available crops, regions, and data history."""
    conn = get_connection()
    try:
        df = load_series_index(conn)
        crops   = sorted(df["crop_name"].unique())
        regions = sorted(df["region"].unique())
        crop_summary = (
            df.groupby("crop_name")
            .agg(
                data_start   = ("data_start", "min"),
                total_markets = ("n_markets", "sum"),
                series_count  = ("region", "count"),
            )
            .reset_index()
            .to_dict(orient="records")
        )
        return {
            "total_crops": len(crops),
            "total_regions": len(regions),
            "crops": crops,
            "regions": regions,
            "crop_summary": crop_summary,
        }
    finally:
        conn.close()


@app.get("/predict")
def predict_price(
    crop: str        = Query(..., description="Crop name, e.g. Wheat, Teff, Onion"),
    region: str      = Query(..., description="Region name, e.g. Oromia, Amhara, SNNP"),
    weeks_ahead: int = Query(4, ge=1, le=12, description="Forecast horizon in weeks (1–12)"),
):
    """
    Generate a price forecast with q10/q50/q90 confidence interval.
    Predictions are produced recursively for each week ahead.
    """
    res = get_predictor().predict(crop=crop, region=region, weeks_ahead=weeks_ahead)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


def _run_retrain():
    """Background worker — runs the full retrain pipeline."""
    script = BASE_DIR / "models" / "retrain.py"
    try:
        subprocess.run([sys.executable, str(script)], check=True, cwd=BASE_DIR)
    except subprocess.CalledProcessError as e:
        print(f"[retrain] Failed with exit code {e.returncode}")
    except Exception as e:
        print(f"[retrain] Error: {e}")


@app.post("/retrain")
def trigger_retrain(
    background_tasks: BackgroundTasks,
    _user: dict = Depends(require_permission(P.MODELS_RETRAIN)),  # admin only: retraining is CPU-heavy
):
    """
    Trigger model retraining on the latest nmis_prices.db data.
    Runs asynchronously — returns immediately.
    """
    retrain_script = BASE_DIR / "models" / "retrain.py"
    if not retrain_script.exists():
        raise HTTPException(status_code=500, detail="Retrain script not found.")
    background_tasks.add_task(_run_retrain)
    return {
        "status": "retraining_started",
        "message": "Retraining pipeline launched in background. Check server logs for progress.",
    }
