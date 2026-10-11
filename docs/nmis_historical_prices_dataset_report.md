# Ethiopia National Market Information System (NMIS)
## Historical Agricultural Price Dataset (2019 – 2026) Technical Report & Documentation

> [!NOTE]  
> **Source Platform**: Ethiopian Agricultural Transformation Institute (ATI) — National Market Information System ([nmis.et](https://www.nmis.et))  
> **Dataset Scope**: 309 Agricultural Markets across 6 Regions of Ethiopia  
> **Temporal Coverage**: March 30, 2019 – August 11, 2026 (Weekly frequency)  
> **Total Records**: **445,010 observations**  
> **Primary Artifacts**: [`nmis_prices.db`](../nmis_prices.db) (SQLite3), [`data/exports/nmis_prices.csv`](../data/exports/nmis_prices.csv) (CSV)

---

## 1. Executive Summary

This document presents the technical specification, dataset architecture, and comprehensive metadata for the historical price dataset scraped from the Ethiopian Agricultural Transformation Institute's (ATI) National Market Information System (**NMIS**).

The dataset aggregates weekly price observations across three major market levels (**Producer**, **Wholesale**, and **Retail**) for **19 crop categories** and **26 specific crop varieties** collected across **309 physical market locations** in Ethiopia.

---

## 2. Dataset Key Metrics

| Metric | Metric Value |
| :--- | :--- |
| **Total Price Observations** | **445,010** |
| **Total Physical Markets** | **309** |
| **Regions Covered** | **6** (Oromia, Amhara, SNNP, South West, Sidama, Tigray) |
| **Commodity Categories (Crops)** | **19** |
| **Crop Varieties** | **26** |
| **Unique Market-Variety Pairs** | **7,051** |
| **API Endpoints Queried** | **14,102** (100% `ok` completion rate) |
| **Historical Range** | **2019-03-30 to 2026-08-11** |
| **Primary SQLite Database Size** | `61.6 MB` |
| **Flat File CSV Export Size** | `46.0 MB` |

---

## 3. Geographical Coverage & Regional Breakdown

The NMIS dataset covers all major agricultural producing and consumption zones across 6 regions of Ethiopia:

| Region | Market Count | % of Markets | Key Trading Hubs |
| :--- | :---: | :---: | :--- |
| **Oromia** | **128** | 41.4% | Jimma, Shashemene, Nekemte, Ambo, Adama, Bale Robe |
| **Amhara** | **84** | 27.2% | Bahir Dar, Gondar, Dessie, Debre Markos, Injibara |
| **SNNP** | **49** | 15.9% | Wolaita Sodo, Dilla, Hossana, Arba Minch |
| **South West** | **17** | 5.5% | Mizan Teferi, Bonga, Tepi |
| **Sidama** | **16** | 5.2% | Hawassa, Yirgalem, Leku |
| **Tigray** | **15** | 4.8% | Mekelle, Shire, Adigrat, Alamata |

---

## 4. Commodity & Variety Breakdown

The dataset spans 19 major agricultural crops traded in Ethiopian markets. Below is the full inventory sorted by record volume:

| Crop Category | Specific Variety Name | Standard Unit | Record Count | Market Coverage | Date Range |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Teff** | White Teff | Quintal (100 kg) | 46,402 | 306 markets | 2019-03-30 – 2026-08-11 |
| | Mixed Teff | Quintal (100 kg) | 42,575 | 302 markets | 2019-03-30 – 2026-08-11 |
| | Red Teff | Quintal (100 kg) | 39,354 | 298 markets | 2019-03-30 – 2026-08-11 |
| **Maize** | White Maize | Quintal (100 kg) | 49,034 | 303 markets | 2019-03-30 – 2026-08-11 |
| **Wheat** | White Wheat | Quintal (100 kg) | 44,315 | 295 markets | 2019-03-30 – 2026-08-11 |
| **Onion** | Red/White Onion | Kilogram (KG) | 29,295 | 303 markets | 2022-12-03 – 2026-08-11 |
| **Potato** | Ware Potato | Kilogram (KG) | 28,074 | 301 markets | 2022-12-03 – 2026-08-11 |
| **Tomato** | Fresh Tomato | Kilogram (KG) | 28,063 | 303 markets | 2022-12-03 – 2026-08-11 |
| **Garlic** | Garlic Bulb | Kilogram (KG) | 26,636 | 295 markets | 2022-12-03 – 2026-08-11 |
| **Red Pepper** | Dry Red Pepper | Kilogram (KG) | 22,241 | 266 markets | 2022-12-03 – 2026-08-11 |
| **Banana** | Ripe Bananas | Kilogram (KG) | 11,692 | 249 markets | 2022-12-03 – 2026-08-11 |
| | Raw Bananas | Kilogram (KG) | 8,920 | 194 markets | 2022-12-03 – 2026-08-11 |
| **Sorghum** | Grain Sorghum | Quintal (100 kg) | 16,380 | 212 markets | 2022-12-03 – 2026-08-11 |
| **Malt Barley** | Industrial Malt Barley | Quintal (100 kg) | 14,700 | 196 markets | 2022-12-03 – 2026-08-11 |
| **Local Rice** | Paddy/Milled Local Rice | Quintal (100 kg) | 10,718 | 171 markets | 2022-12-03 – 2026-08-11 |
| **Avocado** | Hass/Local Avocado | Kilogram (KG) | 9,605 | 165 markets | 2022-12-03 – 2026-08-11 |
| **Bean** | Red Kidney Bean | Quintal (100 kg) | 2,648 | 102 markets | 2019-04-05 – 2026-08-11 |
| | White Pea Bean | Quintal (100 kg) | 1,801 | 94 markets | 2019-04-05 – 2026-08-11 |
| | Mixed Bean | Quintal (100 kg) | 1,048 | 65 markets | 2019-04-05 – 2026-08-11 |
| **Mango** | Fresh Mango | Kilogram (KG) | 5,478 | 157 markets | 2022-12-03 – 2026-08-11 |
| **Sesame** | White Sesame | Quintal (100 kg) | 2,096 | 50 markets | 2019-04-02 – 2026-08-11 |
| | Red Sesame | Quintal (100 kg) | 267 | 15 markets | 2019-04-02 – 2026-08-11 |
| | Mixed Sesame | Quintal (100 kg) | 126 | 8 markets | 2019-04-02 – 2026-08-11 |
| **Soybean** | Commercial Soybean | Quintal (100 kg) | 2,448 | 70 markets | 2022-12-03 – 2026-08-11 |
| **Pineapple** | Commercial Pineapple | Kilogram (KG) | 617 | 19 markets | 2024-06-04 – 2026-08-11 |
| **Green Mung** | Export Green Mung Bean | Quintal (100 kg) | 477 | 29 markets | 2022-12-03 – 2026-08-06 |

---

## 5. Database Schema Specification

The relational schema [`nmis_prices.db`](../nmis_prices.db) is structured in third normal form (3NF) to optimize queries, eliminate redundancy, and maintain data integrity.

```mermaid
erdiagram
    markets ||--o{ market_varieties : trades
    varieties ||--o{ market_varieties : traded_in
    crops ||--o{ varieties : categorizes
    markets ||--o{ prices : records
    varieties ||--o{ prices : measures
    
    markets {
        INTEGER id PK
        TEXT market_name
        TEXT region
    }
    crops {
        INTEGER id PK
        TEXT crop_name
    }
    varieties {
        INTEGER id PK
        INTEGER crop_id FK
        TEXT variety_name
        TEXT unit
    }
    prices {
        TEXT collection_date PK
        INTEGER market_id PK, FK
        INTEGER variety_id PK, FK
        REAL price_producer_min
        REAL price_producer_max
        REAL price_retail_min
        REAL price_retail_max
        REAL price_wholesale_min
        REAL price_wholesale_max
        TEXT volume
    }
    fetch_log {
        INTEGER market_id PK
        INTEGER variety_id PK
        TEXT endpoint PK
        TEXT fetched_at
        TEXT status
        INTEGER record_count
    }
```

### Table Definitions

#### `prices` (Primary Data Table)
- `collection_date` (`TEXT`, PK): Weekly date formatted as `YYYY-MM-DD`.
- `market_id` (`INTEGER`, PK, FK -> `markets.id`): References market location.
- `variety_id` (`INTEGER`, PK, FK -> `varieties.id`): References crop variety.
- `price_producer_min` (`REAL`): Minimum farmgate price in Ethiopian Birr (ETB).
- `price_producer_max` (`REAL`): Maximum farmgate price in ETB.
- `price_retail_min` (`REAL`): Minimum consumer retail price in ETB.
- `price_retail_max` (`REAL`): Maximum consumer retail price in ETB.
- `price_wholesale_min` (`REAL`): Minimum wholesale trader price in ETB.
- `price_wholesale_max` (`REAL`): Maximum wholesale trader price in ETB.
- `volume` (`TEXT`): Qualitative availability (`Sufficient`, `Under`, or `NULL`).

---

## 6. Accessing & Querying the Data

### A. Python (Pandas + SQLite)

```python
import sqlite3
import pandas as pd

# Connect to database
conn = sqlite3.connect("nmis_prices.db")

# Query Teff wholesale and retail price trends over time
df_teff = pd.read_sql_query("""
    SELECT 
        p.collection_date,
        m.market_name,
        m.region,
        v.variety_name,
        p.price_wholesale_min,
        p.price_wholesale_max,
        p.price_retail_min,
        p.price_retail_max
    FROM prices p
    JOIN markets m ON m.id = p.market_id
    JOIN varieties v ON v.id = p.variety_id
    JOIN crops c ON c.id = v.crop_id
    WHERE c.crop_name = 'Teff'
    ORDER BY p.collection_date DESC
""", conn)

print(df_teff.head())
```

### B. Python (Loading Flat CSV File)

```python
import pandas as pd

# Load flat CSV export
df = pd.read_csv("data/exports/nmis_prices.csv")

# Filter for Addis Ababa area & regional prices
print(df.info())
```

### C. Command Line SQL Queries

```bash
# Query total records by region directly from terminal
sqlite3 nmis_prices.db "SELECT m.region, COUNT(*) FROM prices p JOIN markets m ON m.id = p.market_id GROUP BY m.region ORDER BY 2 DESC;"
```

---

## 7. Scripting Tools in Workspace

- [`scraper/nmis_scraper.py`](../scraper/nmis_scraper.py): Main scraper script capable of incremental updates and re-fetching.
- [`scraper/check_status.py`](../scraper/check_status.py): Quick status inspector report tool for database metrics.
- [`scraper/inspect_nmis.py`](../scraper/inspect_nmis.py): Deep inspection module for checking API responses and table schemas.
