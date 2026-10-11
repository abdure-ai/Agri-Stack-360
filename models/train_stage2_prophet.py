"""
models/train_stage2_prophet.py
────────────────────────────────
Stage 2: Prophet model for the 5 long-history crops
(Teff, Maize, Wheat, Bean, Sesame) at (crop, region) granularity.

Eligibility: crop in long-history set AND >= 100 collection dates AND >= 3 markets.

Prophet config:
  - Yearly seasonality: enabled (fourier_order=10)
  - Weekly seasonality: disabled (data is already weekly)
  - changepoint_prior_scale: 0.05 (conservative; prevents overfitting to 2022-23 inflation spike)
  - volume_signal as extra regressor where available
  - Missing weeks handled natively (Prophet is timestamp-based)

Evaluation: Same 2026 holdout as Stage 1. MAPE on the median (yhat).
"""

import sys
import os
import json
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path

# Silence Prophet's verbose Stan output
os.environ["CMDSTAN_VERBOSE"] = "FALSE"
warnings.filterwarnings("ignore")
# Also silence prophet's logging
import logging
logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

from prophet import Prophet
from prophet.serialize import model_to_json

sys.path.insert(0, str(Path(__file__).parent.parent))
from models.data_loader import (
    get_connection, build_all_series, load_series_index,
    TRAIN_CUTOFF, TEST_START, STAGE2_LONG_HISTORY_CROPS
)

EVAL_DIR   = Path("evaluation")
PLOT_DIR   = EVAL_DIR / "plots"
MODEL_DIR  = Path("models") / "prophet"
EVAL_DIR.mkdir(exist_ok=True)
PLOT_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

STAGE1_CSV = EVAL_DIR / "stage1_baseline_results.csv"

PLOT_SERIES = [
    ("Teff",  "Oromia"),
    ("Sesame","SNNP"),
    ("Bean",  "Oromia"),
]


def mape(actual: pd.Series, predicted: pd.Series) -> float:
    mask = actual.notna() & predicted.notna() & (actual != 0)
    if mask.sum() == 0:
        return np.nan
    return float(100.0 * np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])))


def fit_prophet(train_df: pd.DataFrame) -> Prophet:
    """
    Fit a Prophet model on training data.
    train_df must have columns: ds (datetime), y (price), volume (ordinal int).
    """
    has_volume = train_df["volume"].notna().sum() > 10

    m = Prophet(
        yearly_seasonality=False,            # overridden by add_seasonality below
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="multiplicative",   # prices scale; multiplicative fits better
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
        interval_width=0.80,
    )
    m.add_seasonality(name="yearly", period=365.25, fourier_order=10)

    if has_volume:
        m.add_regressor("volume", standardize=False)

    m.fit(train_df)
    return m, has_volume


def predict_prophet(m: Prophet, future_dates: pd.DatetimeIndex,
                    has_volume: bool, last_vol: int) -> pd.DataFrame:
    """
    Build a future dataframe and predict. Volume regressor is forward-filled
    from the last known value (conservative assumption).
    """
    future = pd.DataFrame({"ds": future_dates})
    if has_volume:
        future["volume"] = last_vol  # assume last known supply signal continues
    return m.predict(future)


def run_stage2():
    print("=" * 70)
    print("STAGE 2 — Prophet on Long-History Crops")
    print(f"  Train : up to {TRAIN_CUTOFF}")
    print(f"  Test  : {TEST_START} onward")
    print(f"  Crops : {sorted(STAGE2_LONG_HISTORY_CROPS)}")
    print("=" * 70)

    conn = get_connection()
    index_df = load_series_index(conn)
    all_series = build_all_series(conn)
    conn.close()

    stage1 = pd.read_csv(STAGE1_CSV) if STAGE1_CSV.exists() else pd.DataFrame()

    results = []
    n_fitted = 0

    for (crop, region), df in sorted(all_series.items()):
        # Stage 2 eligibility check
        meta = index_df[(index_df.crop_name == crop) & (index_df.region == region)]
        if meta.empty or not meta.iloc[0].stage2_eligible:
            continue

        df = df.set_index("date").sort_index()
        price  = df["price"]
        volume = df["volume"]

        train_price  = price[price.index <= TRAIN_CUTOFF].dropna()
        test_mask    = df.index >= TEST_START
        test_price   = price[test_mask].dropna()
        test_volume  = volume[test_mask]

        if len(train_price) < 40 or len(test_price) < 4:
            print(f"  SKIP {crop}/{region} — insufficient data")
            continue

        # Build Prophet training DataFrame
        train_prophet = pd.DataFrame({
            "ds": train_price.index,
            "y":  train_price.values,
            "volume": volume.reindex(train_price.index).fillna(0).values,
        })
        train_prophet = train_prophet.dropna(subset=["y"])

        print(f"  Fitting {crop:<14} / {region:<12}  "
              f"(n_train={len(train_prophet)}, n_test={len(test_price)})  ...", end="", flush=True)

        try:
            m, has_volume = fit_prophet(train_prophet)
        except Exception as e:
            print(f"  FAILED: {e}")
            continue

        # Predict on test dates
        last_vol = int(volume[volume.index <= TRAIN_CUTOFF].iloc[-1]) if not volume.empty else 0
        forecast = predict_prophet(m, test_price.index, has_volume, last_vol)
        forecast = forecast.set_index("ds")

        yhat     = forecast["yhat"].reindex(test_price.index)
        yhat_lo  = forecast["yhat_lower"].reindex(test_price.index)
        yhat_hi  = forecast["yhat_upper"].reindex(test_price.index)

        mape_prophet = mape(test_price, yhat)
        print(f"  MAPE={mape_prophet:.1f}%")

        # Save serialized model
        model_path = MODEL_DIR / f"{crop.lower().replace(' ','_')}_{region.lower().replace(' ','_')}.json"
        with open(model_path, "w") as f:
            json.dump(model_to_json(m), f)

        # Stage 1 comparison
        s1_row = stage1[(stage1.crop == crop) & (stage1.region == region)] if not stage1.empty else pd.DataFrame()
        mape_sn   = float(s1_row.mape_seasonal_naive.iloc[0]) if not s1_row.empty and pd.notna(s1_row.mape_seasonal_naive.iloc[0]) else None
        mape_roll = float(s1_row.mape_rolling4w.iloc[0])      if not s1_row.empty and pd.notna(s1_row.mape_rolling4w.iloc[0]) else None
        best_baseline = min(v for v in [mape_sn, mape_roll] if v is not None)
        improvement = round(best_baseline - mape_prophet, 2) if not np.isnan(mape_prophet) else None

        results.append({
            "crop":              crop,
            "region":            region,
            "data_start":        meta.iloc[0].data_start,
            "n_train_weeks":     len(train_prophet),
            "n_test_weeks":      len(test_price),
            "n_markets":         int(meta.iloc[0].n_markets),
            "mape_seasonal_naive": mape_sn,
            "mape_rolling4w":      mape_roll,
            "mape_prophet":        round(mape_prophet, 2) if not np.isnan(mape_prophet) else None,
            "improvement_vs_best_baseline": improvement,
        })

        if (crop, region) in PLOT_SERIES:
            _plot_prophet(crop, region, train_price, test_price,
                          yhat, yhat_lo, yhat_hi, mape_prophet, best_baseline)

        n_fitted += 1

    results_df = pd.DataFrame(results).sort_values(["crop", "region"])
    out_path = EVAL_DIR / "stage2_prophet_results.csv"
    results_df.to_csv(out_path, index=False)

    # ── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("STAGE 2 SUMMARY — Prophet vs Best Baseline")
    print("=" * 70)
    print(f"\n{'Crop':<14} {'Region':<13} {'SN%':>7} {'Roll4w%':>8} {'Prophet%':>9} {'vs Best':>8}")
    print("-" * 65)
    for _, r in results_df.iterrows():
        impr = r.improvement_vs_best_baseline
        flag = " +" if (impr is not None and impr > 0) else (" -" if (impr is not None and impr < 0) else "  ")
        print(f"  {r.crop:<14} {r.region:<13} "
              f"{str(round(r.mape_seasonal_naive,1) if pd.notna(r.mape_seasonal_naive) else 'N/A'):>7} "
              f"{str(round(r.mape_rolling4w,1) if pd.notna(r.mape_rolling4w) else 'N/A'):>8} "
              f"{str(round(r.mape_prophet,1) if pd.notna(r.mape_prophet) else 'N/A'):>9} "
              f"{flag}{abs(impr):.1f}pp" if impr is not None else "  N/A")

    beats_baseline = (results_df.improvement_vs_best_baseline.fillna(-999) > 0).sum()
    print(f"\nProphet beats best baseline: {beats_baseline}/{len(results_df)} series")
    print(f"Fitted {n_fitted} Prophet models saved to: {MODEL_DIR}")
    print(f"Results saved to: {out_path}")
    print("\nStage 2 complete. Review results, then proceed to Stage 3.")

    return results_df


def _plot_prophet(crop, region, train_price, test_price, yhat, yhat_lo, yhat_hi,
                  mape_prophet, mape_baseline):
    fig, ax = plt.subplots(figsize=(12, 5))
    fig.suptitle(
        f"{crop} / {region} — Stage 2 Prophet  |  "
        f"MAPE: Prophet={mape_prophet:.1f}%  BestBaseline={mape_baseline:.1f}%",
        fontsize=12, fontweight="bold"
    )

    # Show last 2 years of train
    train_plot = train_price[train_price.index >= "2024-01-01"]
    ax.plot(train_plot.index, train_plot.values, color="#5b9bd5", lw=1.5, label="Actual (train)")
    ax.plot(test_price.index, test_price.values, color="#5b9bd5", lw=2.5, label="Actual (test)")
    ax.plot(yhat.index, yhat.values, color="#e8975a", lw=2, ls="--", label=f"Prophet (MAPE={mape_prophet:.1f}%)")

    # Confidence band
    ax.fill_between(yhat.index, yhat_lo.values, yhat_hi.values,
                    color="#e8975a", alpha=0.15, label="Prophet 80% interval")

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
    out_path = PLOT_DIR / f"stage2_{safe_name}.png"
    plt.tight_layout()
    plt.savefig(out_path, dpi=130, bbox_inches="tight", facecolor="#0e1117")
    plt.close(fig)
    print(f"    Plot: {out_path}")


if __name__ == "__main__":
    run_stage2()
