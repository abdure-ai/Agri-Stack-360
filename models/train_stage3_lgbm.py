"""
models/train_stage3_lgbm.py
───────────────────────────
Stage 3: Global Gradient-Boosted Model (LightGBM) with Quantile Regression.

Coverage: All qualified (crop, region) series.
Features:
  - Lags: 1w, 4w, 12w
  - Rolling: 4w mean, 12w mean, 4w std
  - Ratios: lag_1w / roll_4w, roll_4w / roll_12w
  - Calendar: week_sin, week_cos, month_sin, month_cos
  - Categorical: crop, region
  - Supply: volume_signal (-1, 0, 1)
  - History: n_history_weeks

Models Trained:
  - q0.10 (lower bound)
  - q0.50 (median prediction)
  - q0.90 (upper bound)

Outputs:
  - models/lgbm/lgbm_q10.pkl
  - models/lgbm/lgbm_q50.pkl
  - models/lgbm/lgbm_q90.pkl
  - evaluation/stage3_lgbm_results.csv
  - evaluation/stage3_comparison_table.csv (Complete 3-Stage Matrix)
"""

import sys
import warnings
import joblib
import sqlite3
import numpy as np
import pandas as pd
import lightgbm as lgb
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from models.data_loader import (
    get_connection, build_all_series, load_series_index,
    TRAIN_CUTOFF, TEST_START
)

warnings.filterwarnings("ignore")

EVAL_DIR   = Path("evaluation")
PLOT_DIR   = EVAL_DIR / "plots"
MODEL_DIR  = Path("models") / "lgbm"
EVAL_DIR.mkdir(exist_ok=True)
PLOT_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

STAGE1_CSV = EVAL_DIR / "stage1_baseline_results.csv"
STAGE2_CSV = EVAL_DIR / "stage2_prophet_results.csv"

# 3 designated plot series (1 long, 1 short, 1 sparse)
PLOT_SERIES = [
    ("Teff",   "Oromia"),    # long-history
    ("Onion",  "Amhara"),    # short-history (Dec 2022)
    ("Sesame", "SNNP"),      # sparse-market long history
]


def mape(actual: pd.Series, predicted: pd.Series) -> float:
    mask = actual.notna() & predicted.notna() & (actual != 0)
    if mask.sum() == 0:
        return np.nan
    return float(100.0 * np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])))


def build_feature_matrix(series_dict: dict) -> pd.DataFrame:
    """
    Construct tabular feature matrix across all (crop, region) series.
    """
    rows = []

    for (crop, region), df in series_dict.items():
        df = df.copy().sort_values("date").reset_index(drop=True)
        prices = df["price"]

        # Lag features
        df["lag_1w"]  = prices.shift(1)
        df["lag_4w"]  = prices.shift(4)
        df["lag_12w"] = prices.shift(12)

        # Rolling statistics
        df["roll_mean_4w"]  = prices.shift(1).rolling(4, min_periods=1).mean()
        df["roll_mean_12w"] = prices.shift(1).rolling(12, min_periods=1).mean()
        df["roll_std_4w"]   = prices.shift(1).rolling(4, min_periods=2).std().fillna(0)

        # Price ratios (trend acceleration signals)
        df["ratio_1_4"]  = df["lag_1w"] / (df["roll_mean_4w"] + 1e-5)
        df["ratio_4_12"] = df["roll_mean_4w"] / (df["roll_mean_12w"] + 1e-5)

        # Cyclical calendar features
        week_num  = df["date"].dt.isocalendar().week.astype(float)
        month_num = df["date"].dt.month.astype(float)

        df["week_sin"]  = np.sin(2 * np.pi * week_num / 52.0)
        df["week_cos"]  = np.cos(2 * np.pi * week_num / 52.0)
        df["month_sin"] = np.sin(2 * np.pi * month_num / 12.0)
        df["month_cos"] = np.cos(2 * np.pi * month_num / 12.0)

        # Identifiers & Metadata
        df["crop"]   = crop
        df["region"] = region
        df["history_len"] = len(df)

        rows.append(df)

    full_df = pd.concat(rows, ignore_index=True)
    return full_df


def train_quantile_model(X_train, y_train, categorical_features, alpha=0.5):
    """
    Train a LightGBM Quantile Regressor.
    """
    params = {
        "objective": "quantile",
        "alpha": alpha,
        "metric": "quantile",
        "boosting_type": "gbdt",
        "n_estimators": 250,
        "learning_rate": 0.04,
        "num_leaves": 31,
        "min_child_samples": 15,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "random_state": 42,
        "verbose": -1,
    }

    model = lgb.LGBMRegressor(**params)
    y_arr = np.asarray(y_train, dtype=np.float32)
    model.fit(X_train, y_arr, categorical_feature=categorical_features)
    return model


def run_stage3():
    print("=" * 70)
    print("STAGE 3 — Global LightGBM Quantile Model")
    print(f"  Train : up to {TRAIN_CUTOFF}")
    print(f"  Test  : {TEST_START} onward")
    print("=" * 70)

    conn = get_connection()
    index_df = load_series_index(conn)
    all_series = build_all_series(conn)
    conn.close()

    # 1. Build tabular feature matrix
    df_all = build_feature_matrix(all_series)

    # Encode categorical features
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

    # 2. Time-based split
    train_mask = (df_all["date"] <= TRAIN_CUTOFF) & df_all["price"].notna() & df_all["lag_1w"].notna()
    test_mask  = (df_all["date"] >= TEST_START) & df_all["price"].notna() & df_all["lag_1w"].notna()

    train_data = df_all[train_mask].copy()
    test_data  = df_all[test_mask].copy()

    X_train, y_train = train_data[features], train_data["price"]
    X_test,  y_test  = test_data[features],  test_data["price"]

    print(f"Total dataset: {len(df_all)} rows across {len(all_series)} series")
    print(f"Train rows   : {len(X_train)}")
    print(f"Test rows    : {len(X_test)}")

    # 3. Train Quantile Models (q10, q50, q90)
    print("\nTraining LightGBM Quantile Models...")
    print("  Fitting q0.10 (lower bound)...")
    model_q10 = train_quantile_model(X_train, y_train, cat_features, alpha=0.10)

    print("  Fitting q0.50 (median prediction)...")
    model_q50 = train_quantile_model(X_train, y_train, cat_features, alpha=0.50)

    print("  Fitting q0.90 (upper bound)...")
    model_q90 = train_quantile_model(X_train, y_train, cat_features, alpha=0.90)

    # Save models & metadata
    joblib.dump(model_q10, MODEL_DIR / "lgbm_q10.pkl")
    joblib.dump(model_q50, MODEL_DIR / "lgbm_q50.pkl")
    joblib.dump(model_q90, MODEL_DIR / "lgbm_q90.pkl")

    meta_info = {
        "features": features,
        "cat_features": cat_features,
        "train_cutoff": TRAIN_CUTOFF,
        "crop_categories": list(df_all["crop_cat"].cat.categories),
        "region_categories": list(df_all["region_cat"].cat.categories),
    }
    joblib.dump(meta_info, MODEL_DIR / "lgbm_meta.pkl")

    # 4. Predict on Test Set
    test_data["pred_q10"] = model_q10.predict(X_test)
    test_data["pred_q50"] = model_q50.predict(X_test)
    test_data["pred_q90"] = model_q90.predict(X_test)

    # Load Stage 1 and Stage 2 CSVs for complete comparison matrix
    stage1 = pd.read_csv(STAGE1_CSV) if STAGE1_CSV.exists() else pd.DataFrame()
    stage2 = pd.read_csv(STAGE2_CSV) if STAGE2_CSV.exists() else pd.DataFrame()

    results = []

    for (crop, region), grp in test_data.groupby(["crop", "region"]):
        actuals = grp["price"]
        preds   = grp["pred_q50"]

        mape_lgbm = mape(actuals, preds)

        # Retrieve Stage 1 & 2 MAPEs
        s1_row = stage1[(stage1.crop == crop) & (stage1.region == region)] if not stage1.empty else pd.DataFrame()
        s2_row = stage2[(stage2.crop == crop) & (stage2.region == region)] if not stage2.empty else pd.DataFrame()

        mape_sn   = float(s1_row.mape_seasonal_naive.iloc[0]) if not s1_row.empty and pd.notna(s1_row.mape_seasonal_naive.iloc[0]) else None
        mape_roll = float(s1_row.mape_rolling4w.iloc[0])      if not s1_row.empty and pd.notna(s1_row.mape_rolling4w.iloc[0]) else None
        mape_prop = float(s2_row.mape_prophet.iloc[0])        if not s2_row.empty and pd.notna(s2_row.mape_prophet.iloc[0]) else None

        valid_baselines = [v for v in [mape_sn, mape_roll, mape_prop] if v is not None]
        best_prev = min(valid_baselines) if valid_baselines else None
        improvement = round(best_prev - mape_lgbm, 2) if (best_prev is not None and not np.isnan(mape_lgbm)) else None

        meta_row = index_df[(index_df.crop_name == crop) & (index_df.region == region)]
        data_start = meta_row.data_start.iloc[0] if not meta_row.empty else ""
        n_markets  = int(meta_row.n_markets.iloc[0]) if not meta_row.empty else 0

        results.append({
            "crop": crop,
            "region": region,
            "data_start": data_start,
            "n_markets": n_markets,
            "n_test_weeks": len(grp),
            "stage1_seasonal_naive": mape_sn,
            "stage1_rolling4w": mape_roll,
            "stage2_prophet": mape_prop,
            "stage3_lgbm": round(mape_lgbm, 2) if not np.isnan(mape_lgbm) else None,
            "improvement_vs_best_prev": improvement,
        })

        if (crop, region) in PLOT_SERIES:
            _plot_lgbm(crop, region, df_all, grp, mape_lgbm, best_prev)

    comp_df = pd.DataFrame(results).sort_values(["crop", "region"])
    out_path = EVAL_DIR / "stage3_comparison_table.csv"
    comp_df.to_csv(out_path, index=False)

    # ── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("STAGE 3 SUMMARY — Complete 3-Stage Model Comparison Table")
    print("=" * 70)
    print(f"\n{'Crop':<14} {'Region':<12} {'SN%':>7} {'Roll4w%':>8} {'Prophet%':>9} {'LGBM%':>8} {'Winner':>12}")
    print("-" * 75)

    lgbm_wins = 0
    total_series = len(comp_df)

    for _, r in comp_df.iterrows():
        prev_vals = {"SN": r.stage1_seasonal_naive, "Roll4w": r.stage1_rolling4w, "Prophet": r.stage2_prophet}
        valid = {k: v for k, v in prev_vals.items() if pd.notna(v)}
        valid["LGBM"] = r.stage3_lgbm

        winner = min(valid, key=valid.get)
        if winner == "LGBM":
            lgbm_wins += 1

        print(f"  {r.crop:<14} {r.region:<12} "
              f"{str(round(r.stage1_seasonal_naive,1) if pd.notna(r.stage1_seasonal_naive) else 'N/A'):>7} "
              f"{str(round(r.stage1_rolling4w,1) if pd.notna(r.stage1_rolling4w) else 'N/A'):>8} "
              f"{str(round(r.stage2_prophet,1) if pd.notna(r.stage2_prophet) else 'N/A'):>9} "
              f"{str(round(r.stage3_lgbm,1) if pd.notna(r.stage3_lgbm) else 'N/A'):>8} "
              f"{winner:>12}")

    print(f"\nStage 3 LightGBM wins: {lgbm_wins}/{total_series} series")
    print(f"Comparison matrix saved to: {out_path}")
    print(f"Model artifacts saved to: {MODEL_DIR}")

    return comp_df


def _plot_lgbm(crop, region, df_all, test_grp, mape_lgbm, mape_prev):
    fig, ax = plt.subplots(figsize=(12, 5))
    prev_str = f"{mape_prev:.1f}%" if mape_prev is not None else "N/A"
    fig.suptitle(
        f"{crop} / {region} — Stage 3 LightGBM Quantile Forecast  |  "
        f"MAPE: LGBM={mape_lgbm:.1f}%  PriorBest={prev_str}",
        fontsize=12, fontweight="bold"
    )

    series_df = df_all[(df_all.crop == crop) & (df_all.region == region)].set_index("date").sort_index()
    train_plot = series_df[(series_df.index <= TRAIN_CUTOFF) & (series_df.index >= "2024-01-01")]

    test_plot = test_grp.set_index("date").sort_index()

    ax.plot(train_plot.index, train_plot["price"].values, color="#5b9bd5", lw=1.5, label="Actual (train)")
    ax.plot(test_plot.index,  test_plot["price"].values,  color="#5b9bd5", lw=2.5, label="Actual (test)")
    ax.plot(test_plot.index,  test_plot["pred_q50"].values, color="#4dbb8a", lw=2, ls="--", label=f"LGBM q50 (MAPE={mape_lgbm:.1f}%)")

    # Quantile Interval (q10 - q90)
    ax.fill_between(test_plot.index, test_plot["pred_q10"].values, test_plot["pred_q90"].values,
                    color="#4dbb8a", alpha=0.2, label="LGBM 80% Quantile Interval (q10–q90)")

    ax.axvline(pd.Timestamp(TEST_START), color="#aaa", ls="--", lw=0.9, alpha=0.7)
    ax.set_ylabel("Price (ETB)")
    ax.legend(fontsize=9, loc="upper left")
    ax.set_facecolor("#0e1117")
    fig.patch.set_facecolor("#0e1117")
    ax.tick_params(colors="#8fa3bf")
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["bottom", "left"]].set_color("#2e3a50")
    ax.yaxis.label.set_color("#8fa3bf")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=30, ha="right")

    safe_name = f"{crop.lower().replace(' ','_')}_{region.lower().replace(' ','_')}"
    out_path = PLOT_DIR / f"stage3_{safe_name}.png"
    plt.tight_layout()
    plt.savefig(out_path, dpi=130, bbox_inches="tight", facecolor="#0e1117")
    plt.close(fig)
    print(f"    Plot saved: {out_path}")


if __name__ == "__main__":
    run_stage3()
