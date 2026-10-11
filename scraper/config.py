"""
config.py — Paths and settings for the data sync service.

Every path can be overridden with an environment variable (or a line in the
project-root .env file) so the service can run against another database.
"""

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def _env(name: str) -> str | None:
    value = os.environ.get(name)
    if value:
        return value
    try:
        with open(ROOT_DIR / ".env", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith(f"{name}="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return None


PRICES_DB   = Path(_env("NMIS_PRICES_DB") or ROOT_DIR / "nmis_prices.db")
PLATFORM_DB = Path(_env("NMIS_PLATFORM_DB") or ROOT_DIR / "agri_platform.db")
CSV_EXPORT  = Path(_env("NMIS_CSV_EXPORT") or ROOT_DIR / "data" / "exports" / "nmis_prices.csv")
RUN_LOG_DIR = Path(_env("NMIS_SYNC_LOG_DIR") or ROOT_DIR / "logs" / "sync")

# Forecast retraining (models/retrain.py, run as a subprocess)
RETRAIN_SCRIPT  = ROOT_DIR / "models" / "retrain.py"
MODEL_DIR       = Path(_env("NMIS_MODEL_DIR") or ROOT_DIR / "models" / "lgbm")
MODEL_REGISTRY  = Path(_env("NMIS_MODEL_REGISTRY") or ROOT_DIR / "models" / "model_registry.json")
RETRAIN_TIMEOUT_SECONDS = 30 * 60

JWT_SECRET_KEY = _env("JWT_SECRET_KEY") or "changeme-insecure-default-key"
JWT_ALGORITHM  = "HS256"

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# A pair counts as "active" if it reported a price within this many days.
ACTIVE_DAYS = 90

# Used to estimate run time before any sync has completed (measured during
# the initial scrape: 14,102 requests in ~5.7 h ≈ 1.45 s per request).
DEFAULT_SECONDS_PER_PAIR = 1.45
