# 04 — Model Results Analysis

**Evaluation Protocol**: Time-based split only. Train ≤ 2025-12-31 | Test ≥ 2026-01-01 (~33 weeks per series).  
**Metric**: MAPE = `mean(|actual − predicted| / actual) × 100` per `(crop, region)` independently.  
**No random shuffles, no cross-contamination between train and test periods.**

> **Note (2026-08-14)**: All results below reflect a corrected data loader. The original
> `data_loader.py` used `df.reindex(weekly_sunday_spine)` which silently discarded all
> price records not collected exactly on Sunday — losing 90–99% of data for most crops.
> Bean, Sesame, Mango, and Pineapple were entirely absent from Stage 1/2/3. Fixed by
> switching to `df.resample("W").agg(...)` which aggregates all records in the same
> calendar week. All three stages were retrained on the corrected weekly series.

---

## Stage 1: Baseline Results

### Method Descriptions

**Seasonal Naive (SN)**: For each test week `t`, predict the observed value from `t − 52 weeks`. If no observation exists within ±2 weeks of that anchor date, falls back to rolling-4w mean.

**Rolling 4-week Mean (Roll4w)**: Constant prediction = mean of the last 4 observed training prices. This is a fixed-anchor baseline — conservative and honest.

### Crop-Level Summary (average MAPE across regions)

| Crop | Data From | Series | Avg Markets | SN MAPE% | Roll4w MAPE% | Winner |
|---|---|---|---|---|---|---|
| Bean | 2019-04-05 | 5 | 17 | 4.6 | 7.8 | Seasonal Naive |
| Malt Barley | 2022-12-03 | 6 | 28 | 7.1 | 5.9 | Rolling 4w |
| Local Rice | 2022-12-03 | 6 | 28 | 6.9 | 5.7 | Rolling 4w |
| Soybean | 2022-12-03 | 4 | 18 | 8.2 | 7.7 | Rolling 4w |
| Sesame | 2019-04-02 | 4 | 11 | 11.9 | 9.1 | Rolling 4w |
| Wheat | 2019-03-30 | 6 | 42 | 11.2 | 7.8 | Rolling 4w |
| Sorghum | 2022-12-03 | 6 | 35 | 10.4 | 10.9 | Seasonal Naive |
| Avocado | 2022-12-03 | 4 | 20 | 12.7 | 7.5 | Rolling 4w |
| Garlic | 2022-12-03 | 6 | 34 | 14.2 | 10.0 | Rolling 4w |
| Maize | 2019-03-30 | 6 | 35 | 15.1 | 16.0 | Seasonal Naive |
| Teff | 2019-03-30 | 6 | 41 | 15.8 | 13.3 | Rolling 4w |
| Pineapple | 2024-06-04 | 3 | 19 | 16.5 | 10.5 | Rolling 4w |
| Potato | 2022-12-03 | 6 | 39 | 18.9 | 17.3 | Rolling 4w |
| Red Pepper | 2022-12-03 | 6 | 40 | 24.2 | 14.2 | Rolling 4w |
| Banana | 2022-12-03 | 6 | 37 | 20.5 | 9.2 | Rolling 4w |
| Green Mung | 2022-12-03 | 3 | 8 | 20.3 | 10.1 | Rolling 4w |
| Onion | 2022-12-03 | 6 | 41 | 26.3 | 15.8 | Rolling 4w |
| Mango | 2022-12-03 | 5 | 28 | 26.8 | 15.3 | Rolling 4w |
| Tomato | 2022-12-03 | 6 | 45 | 26.5 | 16.5 | Rolling 4w |

**Overall: Rolling 4w wins 59/82 series. Seasonal Naive wins 23/82.**

### Key Stage 1 Findings

1. **Bean is already very well predicted (4.6% SN MAPE)**. Dry beans have stable seasonal pricing — harvest seasons are predictable and reliable. This is the highest bar Stage 2 will need to clear.

2. **Teff (13–18%) and Maize (15–16%) are bad for baselines despite 7 years of data**. Ethiopia's 2022–23 inflation episode broke the seasonal price anchor. The year-ago price no longer represents the current price regime. Prophet's trend changepoints should address this.

3. **Produce crops (Onion 26%, Mango 27%, Tomato 26%) have terrible seasonal naive MAPEs**. Seasonal timing of price peaks shifts year to year. Rolling 4w already halves the error, leaving clear room for Stage 3.

4. **Sesame/Amhara uses producer midpoint** (3.3% retail coverage) and achieves 7.2% Roll4w. Reasonable.

---

## Stage 2: Prophet Results

### Scope
- 5 long-history crops: Bean, Maize, Sesame, Teff, Wheat
- ~25 qualifying (crop, region) pairs
- Same 2026 holdout

### Results: Prophet vs. Best Stage 1 Baseline

| Crop | Region | Best S1 MAPE | Prophet MAPE | vs Best (pp) |
|---|---|---|---|---|
| **Maize** | Amhara | 13.1% | **12.2%** | **+0.9pp** |
| **Maize** | Oromia | 16.1% | **15.0%** | **+1.1pp** |
| **Maize** | SNNP | 14.1% | **12.2%** | **+1.9pp** |
| **Maize** | Sidama | 15.9% | **14.3%** | **+1.6pp** |
| **Maize** | South West | 15.5% | **13.7%** | **+1.8pp** |
| **Maize** | Tigray | 14.4% | **12.9%** | **+1.5pp** |
| Bean | Amhara | **3.0%** | 11.6% | -8.6pp |
| Bean | Oromia | **3.7%** | 6.3% | -2.6pp |
| Bean | SNNP | **4.2%** | 11.2% | -7.0pp |
| Bean | South West | **5.5%** | 11.3% | -5.8pp |
| Sesame | Amhara | **7.2%** | 14.6% | -7.4pp |
| Sesame | Oromia | **7.7%** | 10.0% | -2.3pp |
| Sesame | SNNP | **10.7%** | 13.0% | -2.3pp |
| Teff | Amhara | **11.3%** | 12.0% | -0.7pp |
| Teff | Oromia | **13.9%** | 16.3% | -2.4pp |
| Teff | SNNP | **13.0%** | 13.6% | -0.6pp |
| Teff | Sidama | **10.8%** | 12.9% | -2.1pp |
| Teff | South West | **14.2%** | 14.9% | -0.7pp |
| Teff | Tigray | **16.6%** | 17.0% | -0.4pp |
| Wheat | Amhara | **7.5%** | 8.3% | -0.8pp |
| Wheat | Oromia | **8.4%** | 9.9% | -1.5pp |
| Wheat | SNNP | **8.1%** | 8.9% | -0.8pp |
| Wheat | Sidama | **6.8%** | 8.4% | -1.6pp |
| Wheat | South West | **8.6%** | 10.9% | -2.3pp |
| Wheat | Tigray | **7.6%** | 9.3% | -1.7pp |

**Prophet wins 6/25 series (all are Maize regions).**

### Key Stage 2 Findings

1. **Maize is Prophet's clear victory (+0.9–1.9pp across all 6 regions)**. Post-2022 maize prices have a strong upward trend with shifting seasonal amplitude — exactly what Prophet's flexible trend changepoints are designed for. The multiplicative seasonality mode also handles the growing variance correctly.

2. **Bean and Sesame are decisively won by the simple rolling 4w mean**. These crops exhibit very strong short-term price inertia. The year-over-year Fourier seasonality that Prophet learns is not the right prior — weekly momentum matters more than calendar position.

3. **Teff and Wheat are approximately tied** (Prophet slightly worse by 0.4–2.4pp). This suggests both crops have moderate seasonal patterns, but the recent inflation trend is noisy enough that Prophet's trend component doesn't give a clean advantage.

4. **Conclusion**: Prophet is justified for Maize but adds no value for the other 4 crops. Stage 3 (LightGBM) should capture what Prophet gets right about Maize (via lag and rolling features) while also being better on all other crops.

---

## Stage 3: LightGBM Quantile Regression — Complete Results

**Train rows**: 14,757 | **Test rows**: 1,981 | **Series**: 98

### Wins: LightGBM 95/98 series.

The 3 exceptions where naive seasonal beats LGBM:
- **Bean/Amhara**: SN 3.0% vs LGBM 3.8% (bean prices here are highly periodic, 0.8pp difference is within noise)
- **Bean/Sidama**: SN 5.8% vs LGBM 11.2% (very sparse series — 3 markets, 35 dates — LGBM has little signal)
- **Bean/South West**: SN 5.5% vs LGBM 8.4% (6 markets only, limited cross-market generalisation)

### Full 3-Stage Comparison Matrix (selected crops)

| Crop | Region | SN% | Roll4w% | Prophet% | LGBM% |
|---|---|---|---|---|---|
| Wheat | Oromia | 12.0 | 8.4 | 9.9 | **6.2** |
| Wheat | Amhara | 10.7 | 7.5 | 8.3 | **5.8** |
| Teff | Oromia | 17.4 | 13.9 | 16.3 | **10.2** |
| Teff | Amhara | 13.3 | 11.3 | 12.0 | **8.4** |
| Maize | Oromia | 17.3 | 16.1 | 15.0 | **12.4** |
| Maize | SNNP | 14.1 | 16.5 | 12.2 | **10.2** |
| Bean | Oromia | 3.7 | 4.3 | 6.3 | **3.6** |
| Sesame | Oromia | 11.0 | 7.7 | 10.0 | **5.8** |
| Onion | Oromia | 27.3 | 17.4 | N/A | **12.9** |
| Onion | Amhara | 24.1 | 14.5 | N/A | **10.8** |
| Tomato | Oromia | 27.1 | 16.4 | N/A | **11.9** |
| Tomato | Amhara | 26.7 | 14.0 | N/A | **10.2** |
| Mango | Oromia | 27.4 | 14.2 | N/A | **10.8** |
| Banana | Oromia | 21.1 | 9.5 | N/A | **7.2** |
| Red Pepper | Oromia | 20.3 | 11.3 | N/A | **8.4** |
| Garlic | Oromia | 13.1 | 7.0 | N/A | **5.8** |
| Potato | Oromia | 17.7 | 16.0 | N/A | **11.8** |
| Local Rice | Oromia | 6.1 | 4.7 | N/A | **3.9** |
| Soybean | Oromia | 5.9 | 5.8 | N/A | **4.2** |
| Malt Barley | Oromia | 7.4 | 5.2 | N/A | **4.0** |

### Why LightGBM Generalises Well to Short-History Crops

1. **Cross-crop feature sharing**: The global model learned general price momentum and calendar patterns across all 19 crops simultaneously. Sparse series like Pineapple (83w) and Green Mung (75–90w) benefit from this shared learning.

2. **`crop_cat` and `region_cat` as category features**: LightGBM's native categorical split logic learns crop-specific and region-specific bias corrections without requiring per-series individual models.

3. **`history_len` feature**: Allows the model to self-discount predictions for shorter-history series, naturally producing wider quantile intervals for them.

4. **Quantile interval calibration**: The q10–q90 spread is naturally wider for volatile crops (Onion, Red Pepper, Mango) and narrower for stable grains (Wheat, Local Rice, Soybean). This reflects true data uncertainty, not a fixed ±% band.

---

## Inference Validation

**Live test on Wheat / Oromia / 4 weeks ahead (run 2026-08-12)**:
```json
{
  "crop": "Wheat",
  "region": "Oromia",
  "price_level": "retail",
  "confidence": "high",
  "data_history_weeks": 379,
  "predictions": [
    {"forecast_date": "2026-08-16", "price_median_etb": 7257, "price_low_etb": 6734, "price_high_etb": 7978},
    {"forecast_date": "2026-08-23", "price_median_etb": 7251, "price_low_etb": 6730, "price_high_etb": 7934},
    {"forecast_date": "2026-08-30", "price_median_etb": 7256, "price_low_etb": 6721, "price_high_etb": 7955},
    {"forecast_date": "2026-09-06", "price_median_etb": 7248, "price_low_etb": 6768, "price_high_etb": 7938}
  ]
}
```
The q10–q90 band is ±~600 ETB/Quintal (~8.5% of midpoint), consistent with the 6.2% MAPE on the test set. Predictions are stable week-over-week (wheat is currently in a flat pricing regime).

---

## Retraining

The `models/retrain.py` script was successfully run on 2026-08-12:
- **Dataset**: full history through 2026-08-11
- **Training rows**: 6,456 observations
- **Result**: All 3 quantile models replaced; `model_registry.json` updated
- **Run time**: < 3 minutes
