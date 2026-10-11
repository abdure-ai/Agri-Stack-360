"""
models/train_stage1_baseline.py
────────────────────────────────
Stage 1: Seasonal-naive and rolling-4-week-mean baselines.

Evaluation:
  - Train set : data up to 2025-12-31
  - Test set  : 2026-01-01 onward (~30 weeks)
  - Metric    : MAPE per (crop, region)

Outputs:
  evaluation/stage1_baseline_results.csv
  evaluation/plots/stage1_<crop>_<region>.png  (3 specific series)
"""

import sys
import warnings
import sqlite3
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")           # non-interactive backend (no display needed)
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path

# Allow imports from project root
sys.path.insert(0, str(Path(__file__).parent.parent))
from models.data_loader import (
    get_connection, build_all_series, load_series_index,
    TRAIN_CUTOFF, TEST_START
)

warnings.filterwarnings("ignore")

EVAL_DIR  = Path("evaluation")
PLOT_DIR  = EVAL_DIR / "plots"
EVAL_DIR.mkdir(exist_ok=True)
PLOT_DIR.mkdir(exist_ok=True)

# The 3 crops to plot (as specified in the plan)
PLOT_SERIES = [
    ("Teff",  "Oromia"),    # long-history, high-market-count
    ("Onion", "Amhara"),    # short-history (Dec 2022)
    ("Sesame","SNNP"),      # long-history, sparse markets
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def mape(actual: pd.Series, predicted: pd.Series) -> float:
    """Mean Absolute Percentage Error, ignoring zero/NaN actuals."""
    mask = actual.notna() & predicted.notna() & (actual != 0)
    if mask.sum() == 0:
        return np.nan
    return float(100.0 * np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])))


def seasonal_naive_predict(train: pd.Series, test_index: pd.DatetimeIndex) -> pd.Series:
    """
    For each date t in test, predict the price observed at t - 52 weeks in train.
    If no observation at exactly t-52w (due to gaps), use nearest within ±2 weeks.
    Falls back to the last 4-week rolling mean if the 1-year look-back doesn't exist.
    """
    train_full = train.copy()
    predictions = []

    roll_fallback = train_full.rolling(4, min_periods=1).mean().iloc[-1]

    for t in test_index:
        target_date = t - pd.DateOffset(weeks=52)
        # Find closest date within ±2 weeks in the training series
        candidates = train_full.index[
            (train_full.index >= target_date - pd.Timedelta(weeks=2)) &
            (train_full.index <= target_date + pd.Timedelta(weeks=2))
        ]
        if len(candidates) > 0:
            closest = candidates[np.argmin(np.abs(candidates - target_date))]
            val = train_full.loc[closest]
            if pd.notna(val):
                predictions.append(val)
                continue
        predictions.append(roll_fallback)

    return pd.Series(predictions, index=test_index)


def rolling4w_predict(train: pd.Series, test_index: pd.DatetimeIndex) -> pd.Series:
    """
    Predict t as the mean of the last 4 observed prices in train/history.
    Since this is a fixed horizon (not walk-forward), we use the last 4 known
    values as the prediction for every test week. This is conservative but
    honest — we're not leaking future test data.

    NOTE: A walk-forward version would update the window as each prediction
    becomes available, but Stage 1 is intentionally naive.
    """
    last4 = train.dropna().iloc[-4:].mean()
    return pd.Series([last4] * len(test_index), index=test_index)


# ── Main ─────────────────────────────────────────────────────────────────────

def run_stage1():
    print("=" * 70)
    print("STAGE 1 — Baseline Evaluation")
    print(f"  Train : up to {TRAIN_CUTOFF}")
    print(f"  Test  : {TEST_START} onward")
    print("=" * 70)

    conn = get_connection()
    index_df = load_series_index(conn)
    all_series = build_all_series(conn)
    conn.close()

    results = []

    for (crop, region), df in sorted(all_series.items()):
        df = df.set_index("date").sort_index()
        price = df["price"]

        train_price = price[price.index <= TRAIN_CUTOFF].dropna()
        test_df     = df[df.index >= TEST_START]
        test_price  = test_df["price"].dropna()

        if len(train_price) < 4 or len(test_price) < 4:
            continue

        # --- Predictions ---
        sn_preds   = seasonal_naive_predict(train_price, test_price.index)
        roll_preds = rolling4w_predict(train_price, test_price.index)

        mape_sn   = mape(test_price, sn_preds)
        mape_roll = mape(test_price, roll_preds)

        # Metadata
        meta_row = index_df[
            (index_df.crop_name == crop) & (index_df.region == region)
        ]
        n_markets   = int(meta_row.n_markets.iloc[0]) if not meta_row.empty else 0
        data_start  = meta_row.data_start.iloc[0] if not meta_row.empty else ""
        stage2_elig = bool(meta_row.stage2_eligible.iloc[0]) if not meta_row.empty else False

        results.append({
            "crop":              crop,
            "region":            region,
            "data_start":        data_start,
            "n_train_weeks":     len(train_price),
            "n_test_weeks":      len(test_price),
            "n_markets":         n_markets,
            "stage2_eligible":   stage2_elig,
            "mape_seasonal_naive": round(mape_sn, 2)   if not np.isnan(mape_sn)   else None,
            "mape_rolling4w":      round(mape_roll, 2) if not np.isnan(mape_roll) else None,
        })

        # Plot for designated series
        if (crop, region) in PLOT_SERIES:
            _plot_baseline(crop, region, train_price, test_price, sn_preds, roll_preds)

        print(f"  {crop:<14} / {region:<12}  "
              f"SN: {mape_sn:5.1f}%  Roll4w: {mape_roll:5.1f}%  "
              f"(n_test={len(test_price)})")

    results_df = pd.DataFrame(results).sort_values(["crop", "region"])
    out_path = EVAL_DIR / "stage1_baseline_results.csv"
    results_df.to_csv(out_path, index=False)

    # ── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("STAGE 1 SUMMARY")
    print("=" * 70)

    # Group by crop for a clean overview
    crop_summary = (
        results_df.groupby("crop")
        .agg(
            data_start   = ("data_start", "min"),
            n_series     = ("region", "count"),
            avg_sn_mape  = ("mape_seasonal_naive", "mean"),
            avg_roll_mape= ("mape_rolling4w", "mean"),
            avg_markets  = ("n_markets", "mean"),
        )
        .reset_index()
        .sort_values("avg_sn_mape")
    )

    print(f"\n{'Crop':<16} {'Data From':<12} {'Series':>7} {'Mkt/ser':>8} "
          f"{'SN MAPE%':>10} {'Roll4w MAPE%':>13}")
    print("-" * 70)
    for _, r in crop_summary.iterrows():
        print(f"  {r.crop:<14} {str(r.data_start)[:10]:<12} {r.n_series:>7} "
              f"{r.avg_markets:>8.0f} {r.avg_sn_mape:>10.1f} {r.avg_roll_mape:>13.1f}")

    print(f"\nFull results saved to: {out_path}")
    print(f"Plots saved to: {PLOT_DIR}")

    # Best naive method per series
    results_df["best_baseline"] = results_df.apply(
        lambda r: "seasonal_naive" if (r.mape_seasonal_naive or 999) < (r.mape_rolling4w or 999) else "rolling4w",
        axis=1
    )
    sn_wins   = (results_df.best_baseline == "seasonal_naive").sum()
    roll_wins = (results_df.best_baseline == "rolling4w").sum()
    print(f"\nBest method wins: seasonal_naive={sn_wins}, rolling4w={roll_wins}")
    print("\nStage 1 complete. Review results, then proceed to Stage 2.")

    return results_df


def _plot_baseline(crop, region, train_price, test_price, sn_preds, roll_preds):
    fig, axes = plt.subplots(2, 1, figsize=(12, 7), gridspec_kw={"height_ratios": [3, 1]})
    fig.suptitle(f"{crop} / {region} — Stage 1 Baseline", fontsize=13, fontweight="bold")

    ax = axes[0]
    # Show last 2 years of training data
    train_plot = train_price[train_price.index >= "2024-01-01"]
    ax.plot(train_plot.index, train_plot.values, color="#5b9bd5", lw=1.5, label="Actual (train)")
    ax.plot(test_price.index, test_price.values, color="#5b9bd5", lw=2.5, label="Actual (test)")
    ax.plot(sn_preds.index,  sn_preds.values,   color="#e8975a", lw=1.8, ls="--", label="Seasonal Naive (52w lag)")
    ax.plot(roll_preds.index, roll_preds.values, color="#4dbb8a", lw=1.8, ls=":",  label="Rolling 4-week Mean")

    ax.axvline(pd.Timestamp(TEST_START), color="#aaa", ls="--", lw=0.9, alpha=0.7)
    ax.text(pd.Timestamp(TEST_START), ax.get_ylim()[1] * 0.97, "  Test →", color="#aaa", fontsize=8)

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

    # Error panel
    ax2 = axes[1]
    sn_err   = (sn_preds   - test_price).reindex(test_price.index)
    roll_err = (roll_preds - test_price).reindex(test_price.index)
    ax2.bar(test_price.index - pd.Timedelta(days=2), sn_err,   width=3, color="#e8975a", alpha=0.7, label="SN error")
    ax2.bar(test_price.index + pd.Timedelta(days=2), roll_err, width=3, color="#4dbb8a", alpha=0.7, label="Roll4w error")
    ax2.axhline(0, color="#8fa3bf", lw=0.8)
    ax2.set_ylabel("Pred − Actual (ETB)", fontsize=8)
    ax2.legend(fontsize=8)
    ax2.set_facecolor("#0e1117")
    ax2.tick_params(colors="#8fa3bf")
    ax2.spines[["top", "right"]].set_visible(False)
    ax2.spines[["bottom", "left"]].set_color("#2e3a50")
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%b '%y"))
    ax2.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
    plt.setp(ax2.xaxis.get_majorticklabels(), rotation=30, ha="right")

    safe_name = f"{crop.lower().replace(' ', '_')}_{region.lower().replace(' ', '_')}"
    out_path = PLOT_DIR / f"stage1_{safe_name}.png"
    plt.tight_layout()
    plt.savefig(out_path, dpi=130, bbox_inches="tight", facecolor="#0e1117")
    plt.close(fig)
    print(f"    -> Plot saved: {out_path}")


if __name__ == "__main__":
    run_stage1()
