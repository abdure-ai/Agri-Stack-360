"""
models/retrain.py
─────────────────
Periodic retraining script for NMIS Price Prediction Models.

Executed when new weekly price data is scraped/ingested.
Re-trains LightGBM quantile regression models on updated SQLite database
and updates model registry.
"""

import os
import sys
import json
import joblib
import sqlite3
import datetime
import pandas as pd
import lightgbm as lgb
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BASE_DIR))

from models.data_loader import (
    get_connection, build_all_series, load_series_index
)
from models.train_stage3_lgbm import build_feature_matrix, train_quantile_model

MODEL_DIR     = Path(os.environ.get("NMIS_MODEL_DIR") or BASE_DIR / "models" / "lgbm")
REGISTRY_FILE = Path(os.environ.get("NMIS_MODEL_REGISTRY") or BASE_DIR / "models" / "model_registry.json")


def _atomic_dump(obj, path: Path):
    """Write to a temp file then rename, so the prediction API never reads a half-written model."""
    tmp = path.with_name(path.name + ".tmp")
    joblib.dump(obj, tmp)
    os.replace(tmp, path)


def retrain_pipeline():
    print("=" * 70)
    print("NMIS PRICE PREDICTION PIPELINE — PERIODIC RETRAINING")
    print(f"Timestamp: {datetime.datetime.now().isoformat()}")
    print("=" * 70)

    conn = get_connection()
    try:
        index_df = load_series_index(conn)
        all_series = build_all_series(conn)

        latest_date = pd.read_sql_query(
            "SELECT MAX(collection_date) AS max_date FROM prices", conn
        ).iloc[0]["max_date"]

        print(f"Ingested dataset latest date: {latest_date}")
        print(f"Series count to retrain     : {len(all_series)}")

        # 1. Build Feature Matrix
        df_all = build_feature_matrix(all_series)
        df_all["crop_cat"]   = df_all["crop"].astype("category")
        df_all["region_cat"] = df_all["region"].astype("category")

        features = [
            "lag_1w", "lag_4w", "lag_12w",
            "roll_mean_4w", "roll_mean_12w", "roll_std_4w",
            "ratio_1_4", "ratio_4_12",
            "week_sin", "week_cos", "month_sin", "month_cos",
            "volume", "history_len",
            "crop_cat", "region_cat",
        ]
        cat_features = ["crop_cat", "region_cat"]

        valid_mask = df_all["price"].notna() & df_all["lag_1w"].notna()
        train_df = df_all[valid_mask].copy()

        X_train, y_train = train_df[features], train_df["price"]

        print(f"Retraining on full dataset ({len(X_train)} observations)...")

        # 2. Retrain Quantile Models
        print("  Retraining q0.10...")
        m_q10 = train_quantile_model(X_train, y_train, cat_features, alpha=0.10)

        print("  Retraining q0.50...")
        m_q50 = train_quantile_model(X_train, y_train, cat_features, alpha=0.50)

        print("  Retraining q0.90...")
        m_q90 = train_quantile_model(X_train, y_train, cat_features, alpha=0.90)

        # 3. Save Updated Artifacts
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        # lgbm_meta.pkl is written last: the prediction API reloads when it changes.
        _atomic_dump(m_q10, MODEL_DIR / "lgbm_q10.pkl")
        _atomic_dump(m_q50, MODEL_DIR / "lgbm_q50.pkl")
        _atomic_dump(m_q90, MODEL_DIR / "lgbm_q90.pkl")

        meta_info = {
            "features": features,
            "cat_features": cat_features,
            "train_cutoff": latest_date,
            "crop_categories": list(df_all["crop_cat"].cat.categories),
            "region_categories": list(df_all["region_cat"].cat.categories),
        }
        _atomic_dump(meta_info, MODEL_DIR / "lgbm_meta.pkl")

        # 4. Update Model Registry
        registry = {
            "last_retrained_at": datetime.datetime.now().isoformat(),
            "latest_data_date": latest_date,
            "total_observations": len(train_df),
            "series_count": len(all_series),
            "active_model": "LightGBM_Quantile_Regression",
            "artifacts": [
                "models/lgbm/lgbm_q10.pkl",
                "models/lgbm/lgbm_q50.pkl",
                "models/lgbm/lgbm_q90.pkl",
                "models/lgbm/lgbm_meta.pkl",
            ],
        }

        tmp = REGISTRY_FILE.with_name(REGISTRY_FILE.name + ".tmp")
        with open(tmp, "w") as f:
            json.dump(registry, f, indent=2)
        os.replace(tmp, REGISTRY_FILE)

        print(f"Retraining successful. Registry updated at {REGISTRY_FILE}")

    finally:
        conn.close()


if __name__ == "__main__":
    retrain_pipeline()
