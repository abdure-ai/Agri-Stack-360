# 01 — Project Overview

## What This System Is

The NMIS (National Market Information System) Price Intelligence System is a full-stack data platform built on top of a 445,010-observation SQLite database of Ethiopian agricultural market prices. It was built in two major phases:

**Phase 1 — Interactive Dashboard**  
A filterable web dashboard that lets analysts, traders, and policymakers explore historical price data across 309 markets, 6 regions, 19 crops/26 varieties, and March 2019 through August 2026.

**Phase 2 — Price Prediction Pipeline**  
A staged machine learning pipeline that forecasts future retail prices 1–12 weeks ahead per (crop, region) pair, with calibrated uncertainty intervals and honest evaluation at each stage.

---

## Data Context

| Attribute | Value |
|---|---|
| Database | `nmis_prices.db` (61.6 MB SQLite) |
| Total observations | 445,010 weekly price records |
| Markets | 309 markets across Ethiopia |
| Regions | Oromia, Amhara, SNNP, South West, Sidama, Tigray |
| Crops | 19 crops / 26 varieties |
| Date range | March 2019 – August 2026 |
| Long-history crops | Teff, Maize, Wheat, Bean, Sesame (back to 2019) |
| Short-history crops | Remaining 14 (start December 2022) |

### Database Schema (3NF)

```sql
markets(id, market_name, region)
crops(id, crop_name)
varieties(id, crop_id FK, variety_name, unit)
prices(
  collection_date, market_id FK, variety_id FK,
  price_producer_min, price_producer_max,
  price_retail_min, price_retail_max,
  price_wholesale_min, price_wholesale_max,
  volume   -- 'Sufficient' | 'Under' | NULL
)
```

---

## Key Data Findings (from live DB probe)

| Finding | Impact |
|---|---|
| Teff/Oromia: 337 dates over 379-week spine = **11.1% gaps** | Must forward-fill before rolling features |
| Price scale: 14 ETB/kg (Banana) to 8,488 ETB/quintal (Sesame) — **600× range** | MAPE per crop, never blended |
| Volume field: 41.6% NULL, 40.3% Sufficient, 18.1% Under | Encoded as ordinal: -1 / 0 / +1 |
| Sesame/Amhara: 3.3% retail, 95.5% producer coverage | Uses producer midpoint; API flags this |
| Degenerate series excluded: Green Mung/SW (6 dates), Sesame/Tigray (9), Sesame/Sidama (5) | Skipped from all modeling |

---

## System Architecture

```
┌─────────────────────────────────────┐
│           nmis_prices.db            │
│         (SQLite, 61.6 MB)           │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐   ┌─────────────────────────┐
│  FastAPI    │   │   ML Training Pipeline  │
│  Market     │   │  Stage 1: Baseline      │
│  Data API   │   │  Stage 2: Prophet       │
│  port 8000  │   │  Stage 3: LightGBM      │
└──────┬──────┘   └──────────┬──────────────┘
       │                     │
       │              ┌──────▼──────────────┐
       │              │   Model Artifacts   │
       │              │   models/prophet/   │
       │              │   models/lgbm/      │
       │              └──────┬──────────────┘
       │                     │
       │              ┌──────▼──────────────┐
       │              │  Prediction API     │
       │              │  serving/           │
       │              │  port 8001          │
       │              └──────┬──────────────┘
       │                     │
       └──────────┬──────────┘
                  │
          ┌───────▼────────┐
          │  React + Vite  │
          │   Dashboard    │
          │   port 5173    │
          └────────────────┘
```

---

## Prediction Aggregation Unit

**`(crop, region)` level** — not per market.

For each (crop, region) pair, the weekly price series is the **median retail midpoint** (`(price_retail_min + price_retail_max) / 2`) across all reporting markets that week. Median rather than mean resists outlier markets.

This gives **~70–98 qualified series** depending on minimum data thresholds. This is the right level because:
1. Markets in the same region are strongly correlated.
2. Per-market models would overfit on sparse reporters.
3. Regional averages are what policy analysts and traders actually use.

---

## Confidence Tiers (Prediction API)

| Tier | Condition | Example Series |
|---|---|---|
| `high` | ≥ 200 training weeks | Teff/Oromia (337w), Wheat/Oromia (337w) |
| `medium` | 100–200 weeks | Most Dec 2022 crops (192w) |
| `low` | 50–100 weeks | Pineapple (83–92w) |
| `very_low` | < 50 weeks | Degenerate series (not served) |
