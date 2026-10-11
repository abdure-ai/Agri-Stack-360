"""
serving/predictor.py
────────────────────
Inference engine for NMIS price predictions.

Loads trained LightGBM quantile models (q10, q50, q90) and performs
multi-step recursive forecasting for 1..W weeks ahead.

Computes:
  - Price point prediction (q50)
  - Lower bound (q10) and Upper bound (q90)
  - Confidence tier (high / medium / low / very_low)
  - Historical context (weeks of history, start date)
  - Winning model indicator
"""

import os
import sys
import joblib
import sqlite3
import numpy as np
import pandas as pd
from pathlib import Path

# Path configuration
BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = Path(os.environ.get("NMIS_MODEL_DIR") or BASE_DIR / "models" / "lgbm")
# Written last by models/retrain.py, so a change means a complete new model set.
META_FILE = MODEL_DIR / "lgbm_meta.pkl"


def model_version() -> float:
    """mtime of the model metadata file; changes after every retrain."""
    return META_FILE.stat().st_mtime if META_FILE.exists() else 0.0

sys.path.insert(0, str(BASE_DIR))
from models.data_loader import (
    get_connection, load_series_index, load_weekly_series, PRODUCER_FALLBACK
)


class PricePredictor:
    def __init__(self):
        self._load_models()

    def _load_models(self):
        q10_file = MODEL_DIR / "lgbm_q10.pkl"
        q50_file = MODEL_DIR / "lgbm_q50.pkl"
        q90_file = MODEL_DIR / "lgbm_q90.pkl"
        meta_file = META_FILE

        if not q50_file.exists():
            raise FileNotFoundError(f"Model artifacts not found in {MODEL_DIR}. Run training first.")

        self.version    = model_version()
        self.model_q10  = joblib.load(q10_file)
        self.model_q50  = joblib.load(q50_file)
        self.model_q90  = joblib.load(q90_file)
        self.meta_info  = joblib.load(meta_file)

        self.features       = self.meta_info["features"]
        self.cat_features   = self.meta_info["cat_features"]
        self.crop_cats      = self.meta_info["crop_categories"]
        self.region_cats    = self.meta_info["region_categories"]

    def predict(self, crop: str, region: str, weeks_ahead: int = 4) -> dict:
        """
        Generate multi-step price forecast for given (crop, region).
        """
        conn = get_connection()
        try:
            # 1. Normalize casing
            index_df = load_series_index(conn)
            crop_match   = [c for c in index_df["crop_name"].unique() if c.lower() == crop.lower()]
            region_match = [r for r in index_df["region"].unique() if r.lower() == region.lower()]

            if not crop_match:
                available_crops = sorted(index_df["crop_name"].unique())
                return {"error": f"Crop '{crop}' not found. Available crops: {available_crops}"}
            if not region_match:
                available_regions = sorted(index_df["region"].unique())
                return {"error": f"Region '{region}' not found. Available regions: {available_regions}"}

            norm_crop   = crop_match[0]
            norm_region = region_match[0]

            # 2. Fetch historical weekly series
            df_series = load_weekly_series(conn, norm_crop, norm_region)
            meta_row  = index_df[(index_df.crop_name == norm_crop) & (index_df.region == norm_region)]

            if df_series.empty or len(df_series) < 5:
                return {
                    "error": f"Insufficient historical price data for {norm_crop} in {norm_region}."
                }

            # Data history stats
            history_start = str(df_series["date"].min())[:10]
            history_weeks = len(df_series)
            n_markets     = int(meta_row["n_markets"].iloc[0]) if not meta_row.empty else 0

            # Unit of measurement
            unit_query = """
                SELECT DISTINCT v.unit
                FROM varieties v JOIN crops c ON c.id = v.crop_id
                WHERE c.crop_name = ? AND v.unit IS NOT NULL
            """
            unit_res = pd.read_sql_query(unit_query, conn, params=(norm_crop,))
            unit = unit_res.iloc[0]["unit"] if not unit_res.empty else "unit"

            is_producer_fallback = (norm_crop, norm_region) in PRODUCER_FALLBACK

            # 3. Determine confidence tier
            if history_weeks >= 200:
                confidence = "high"
                confidence_note = f"{history_weeks} weeks of training data (2019-2026). LightGBM q10/q90 interval."
            elif history_weeks >= 100:
                confidence = "medium"
                confidence_note = f"{history_weeks} weeks of data (Dec 2022-2026). Reliable regional signal."
            elif history_weeks >= 40:
                confidence = "low"
                confidence_note = f"{history_weeks} weeks of shorter history. Moderate confidence."
            else:
                confidence = "very_low"
                confidence_note = f"Sparse history ({history_weeks} weeks). Use with caution."

            # 4. Multi-step recursive forecasting
            predictions = []
            current_df = df_series.copy().sort_values("date").reset_index(drop=True)

            last_date = current_df["date"].max()

            for step in range(1, weeks_ahead + 1):
                target_date = last_date + pd.Timedelta(weeks=step)
                prices = current_df["price"]

                # Extract features for current step
                lag_1w  = float(prices.iloc[-1])
                lag_4w  = float(prices.iloc[-4]) if len(prices) >= 4 else lag_1w
                lag_12w = float(prices.iloc[-12]) if len(prices) >= 12 else lag_4w

                roll_4w  = float(prices.iloc[-4:].mean())
                roll_12w = float(prices.iloc[-12:].mean())
                roll_std = float(prices.iloc[-4:].std()) if len(prices) >= 4 else 0.0

                ratio_1_4  = lag_1w / (roll_4w + 1e-5)
                ratio_4_12 = roll_4w / (roll_12w + 1e-5)

                week_num  = float(target_date.isocalendar().week)
                month_num = float(target_date.month)

                week_sin  = np.sin(2 * np.pi * week_num / 52.0)
                week_cos  = np.cos(2 * np.pi * week_num / 52.0)
                month_sin = np.sin(2 * np.pi * month_num / 12.0)
                month_cos = np.cos(2 * np.pi * month_num / 12.0)

                vol_signal = int(current_df["volume"].iloc[-1])

                feat_dict = {
                    "lag_1w": lag_1w,
                    "lag_4w": lag_4w,
                    "lag_12w": lag_12w,
                    "roll_mean_4w": roll_4w,
                    "roll_mean_12w": roll_12w,
                    "roll_std_4w": roll_std,
                    "ratio_1_4": ratio_1_4,
                    "ratio_4_12": ratio_4_12,
                    "week_sin": week_sin,
                    "week_cos": week_cos,
                    "month_sin": month_sin,
                    "month_cos": month_cos,
                    "volume": vol_signal,
                    "history_len": history_weeks,
                    "crop_cat": norm_crop if norm_crop in self.crop_cats else self.crop_cats[0],
                    "region_cat": norm_region if norm_region in self.region_cats else self.region_cats[0],
                }

                # Construct 1-row DataFrame for model input
                X_step = pd.DataFrame([feat_dict])
                X_step["crop_cat"]   = pd.Categorical(X_step["crop_cat"], categories=self.crop_cats)
                X_step["region_cat"] = pd.Categorical(X_step["region_cat"], categories=self.region_cats)

                pred_q10 = float(self.model_q10.predict(X_step[self.features])[0])
                pred_q50 = float(self.model_q50.predict(X_step[self.features])[0])
                pred_q90 = float(self.model_q90.predict(X_step[self.features])[0])

                # Ensure logical bounds ordering
                pred_q10 = min(pred_q10, pred_q50)
                pred_q90 = max(pred_q90, pred_q50)

                predictions.append({
                    "step_week": step,
                    "forecast_date": str(target_date)[:10],
                    "price_median_etb": round(pred_q50, 2),
                    "price_low_etb": round(pred_q10, 2),
                    "price_high_etb": round(pred_q90, 2),
                    "unit": unit,
                })

                # Append recursive prediction back for subsequent steps
                new_row = pd.DataFrame({
                    "date": [target_date],
                    "price": [pred_q50],
                    "volume": [vol_signal],
                })
                current_df = pd.concat([current_df, new_row], ignore_index=True)

            return {
                "crop": norm_crop,
                "region": norm_region,
                "weeks_ahead": weeks_ahead,
                "price_level": "producer" if is_producer_fallback else "retail",
                "model_used": "LightGBM_Quantile_Regression",
                "data_history_weeks": history_weeks,
                "history_start": history_start,
                "markets_reporting_count": n_markets,
                "confidence": confidence,
                "confidence_note": confidence_note,
                "predictions": predictions,
            }

        finally:
            conn.close()
