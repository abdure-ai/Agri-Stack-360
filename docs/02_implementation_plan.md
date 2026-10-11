# 02 — Implementation Plan

## Phase 1: Interactive Dashboard

### Stack
- **Backend**: FastAPI (Python) on port 8000
- **Frontend**: React + Vite on port 5173
- **Charts**: Recharts
- **Styling**: Vanilla CSS, dark-mode design system

### API Endpoints (Market Data)

| Endpoint | Description |
|---|---|
| `GET /api/crops` | All crops with variety and availability metadata |
| `GET /api/markets` | Markets filtered by region |
| `GET /api/timeseries` | Weekly prices for selected crop/variety/markets/date range |
| `GET /api/regional` | Region-level aggregated price series |
| `GET /api/heatmap` | Market × date price grid for heatmap view |
| `GET /api/spread` | Retail vs producer spread per market |
| `GET /api/summary` | Latest price snapshot: current, WoW change, volume |

### Data Handling Decisions

- **Uneven crop history**: Sidebar shows each crop's actual availability range. Date picker is bounded per-crop so users cannot silently query empty ranges.
- **Price range**: All endpoints return `min` and `max` within a period — never a false point estimate when data is sparse.
- **Volume field**: Passed through to frontend; shown as a supply signal badge (Sufficient / Low / Unknown).

### Dashboard Views

| View | What It Shows |
|---|---|
| Time Series | Price over time per market, with min-max shading bands |
| Regional Comparison | One line per region, averaged across markets |
| Heatmap | Market rows × date columns, colour = price level |
| Spread | Retail vs producer gap over time |

---

## Phase 2: Price Prediction Pipeline

### Design Decisions (pre-build, grounded in live DB probe)

| Decision | Choice | Rationale |
|---|---|---|
| Prediction target | Retail midpoint | 96% coverage vs. 39% wholesale, 50% producer |
| Stage 2 model | Prophet | Handles gaps natively; better seasonal decomposition |
| Uncertainty | Quantile regression (q10/q50/q90) | One model, proper intervals, no bootstrap overhead |
| Retraining | Full retrain on new data | Fast enough (~3 min LightGBM); avoids incremental drift |
| Aggregation | (crop, region) weekly median | Reduces 309 markets to ~70 stable series |

### Stage 1: Baseline

**Two naive forecasters per (crop, region) series:**
1. **Seasonal Naive**: prediction for week `t` = observed value at `t − 52 weeks`. Falls back to rolling-4w mean if series is shorter than 1 year.
2. **Rolling 4-week Mean**: constant prediction = mean of last 4 observed prices.

**Evaluation**: MAPE on 2026 holdout (Jan–Aug 2026, ~22 weeks per series).

### Stage 2: Prophet

**Scope**: 5 long-history crops (Teff, Maize, Wheat, Bean, Sesame) × qualifying regions (≥ 100 collection dates AND ≥ 3 markets). ~25 series.

**Configuration**:
```python
Prophet(
    yearly_seasonality=True,
    weekly_seasonality=False,        # data is already weekly
    seasonality_mode="multiplicative",
    changepoint_prior_scale=0.05,    # conservative; resists 2022-23 inflation overfitting
    seasonality_prior_scale=10,
)
m.add_seasonality(name="yearly", period=365.25, fourier_order=10)
m.add_regressor("volume")            # ordinal supply signal
```

**Gate**: Prophet must beat the best Stage 1 baseline MAPE to be considered an improvement.

### Stage 3: Global LightGBM

**Scope**: All qualifying series (~98 with ≥ 40 training weeks and ≥ 4 test weeks).

**Feature set**:

| Feature | Description |
|---|---|
| `lag_1w`, `lag_4w`, `lag_12w` | Lagged retail midpoint |
| `roll_mean_4w`, `roll_mean_12w` | Rolling averages (on gap-filled series) |
| `roll_std_4w` | Rolling price volatility |
| `ratio_1_4`, `ratio_4_12` | Trend acceleration signals |
| `week_sin`, `week_cos` | Cyclical ISO week encoding |
| `month_sin`, `month_cos` | Cyclical month encoding |
| `volume` | Ordinal: -1 (Under), 0 (Unknown), +1 (Sufficient) |
| `history_len` | Series length in weeks (allows self-discounting of sparse series) |
| `crop_cat`, `region_cat` | LightGBM native categoricals |

**Three quantile models**: q0.10, q0.50, q0.90. Point estimate = q50. Interval = [q10, q90].

**Gap handling**: Before feature engineering, each series is reindexed to a complete weekly spine and forward-filled up to 3 consecutive weeks. Gaps > 3 weeks are left as NaN and excluded from the feature matrix.

**Time-based split**: Train ≤ 2025-12-31 | Test ≥ 2026-01-01. No random shuffles, no data leakage.

### Serving Layer

**`GET /predict`**: `crop`, `region`, `weeks_ahead` (1–12). Returns:
```json
{
  "crop": "Wheat",
  "region": "Oromia",
  "weeks_ahead": 4,
  "price_level": "retail",
  "model_used": "LightGBM_Quantile_Regression",
  "data_history_weeks": 379,
  "history_start": "2019-05-12",
  "markets_reporting_count": 124,
  "confidence": "high",
  "confidence_note": "379 weeks of training data...",
  "predictions": [
    {
      "step_week": 1,
      "forecast_date": "2026-08-16",
      "price_median_etb": 7257.02,
      "price_low_etb": 6734.05,
      "price_high_etb": 7978.06,
      "unit": "Quintal"
    }
  ]
}
```

**`POST /retrain`**: Runs `models/retrain.py` in the background. Re-trains LightGBM on full updated dataset. Updates `models/model_registry.json`.

**`GET /metadata`**: Lists all available crops, regions, history start dates, market counts.

### Special Cases Handled

| Series | Issue | Handling |
|---|---|---|
| Sesame / Amhara | 3.3% retail, 95.5% producer | Uses producer midpoint; API response flags `price_level: "producer"` |
| Green Mung / South West | 6 total dates | Excluded from all stages |
| Sesame / Tigray | 9 dates, 0% retail | Excluded from all stages |
| Sesame / Sidama | 5 dates | Excluded from all stages |
| Pineapple | Starts June 2024 (83–92w) | Included in Stage 3 with `confidence: "low"` |

### Known Limitations

- **Ethiopia 2022–23 inflation episode** is in training data. Models may partially conflate structural price trend with seasonal patterns.
- **Maize remains the hardest to predict** (MAPE ~10–12%) due to sustained non-linear post-2022 price growth.
- **Tigray coverage is patchy** for several crops (producer/wholesale reporting < 10%). Retail predictions are valid but carry `low` confidence flags.
- **Prophet underperformed baselines on Bean/Wheat/Sesame** — for these crops, short-term price inertia (rolling 4w mean) is stronger than seasonality. LightGBM captures this correctly.
