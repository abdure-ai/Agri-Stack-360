# 03 — Dashboard Documentation

## Overview

The NMIS Dashboard is a dark-mode web application accessible at `http://localhost:5173`. It lets analysts, traders, and policymakers explore Ethiopian agricultural market prices interactively without writing any SQL.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  NMIS — Ethiopian Agricultural Market Prices       [Header]  │
├─────────────────┬────────────────────────────────────────────┤
│                 │  [Summary Cards Row]                       │
│  Filter         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  Sidebar        │  │Retail│ │WholesaL│Producer│Volume│     │
│                 │  └──────┘ └──────┘ └──────┘ └──────┘     │
│  ► Crop         │  [View Tabs]                               │
│  ► Variety      │  [Time Series] [Regional] [Heatmap] [Spread]│
│  ► Region       │                                            │
│  ► Markets      │  [Active chart panel]                      │
│  ► Price Level  │                                            │
│  ► Date Range   │                                            │
│  [Apply Filters]│                                            │
└─────────────────┴────────────────────────────────────────────┘
```

---

## Filter Sidebar

### Crop Selector
- Dropdown of all 19 crops.
- On selection, resets variety and auto-populates variety choices for that crop.

### Variety Selector
- Filtered to the selected crop.
- For crops with only one variety (e.g. Teff/Mixed), automatically pre-selected.

### Region Selector
- Multi-select: any combination of the 6 regions.
- Selecting a region populates the Markets list for that region.

### Markets Selector
- Multi-select within the chosen regions.
- If nothing is selected, the API returns an "All Markets" aggregate series.

### Price Level Toggle
- **Retail** (default): consumer-facing price.
- **Wholesale**: trader-level price (~39% coverage).
- **Producer**: farm-gate price (~50% coverage).
- Coverage badges are shown next to each option so users know when data may be sparse.

### Date Range Picker
- Start and end date inputs.
- **Bounded per crop**: the picker's minimum date is set to the crop's actual first observation date.
- A notice is shown if the selected crop only has data from December 2022 onward.
- Empty date = uses the full available range.

### Apply Button
- Triggers all four API calls in parallel.
- Each chart shows a skeleton loader independently while its data loads.

---

## Summary Cards Row

Four cards showing the latest available week's statistics:

| Card | What It Shows |
|---|---|
| **Retail Price** | Current week retail midpoint (ETB), week-over-week % change (green = down = good for consumers) |
| **Wholesale Price** | Current week wholesale midpoint, WoW change |
| **Producer Price** | Current week farm-gate midpoint, WoW change |
| **Supply Signal** | Volume field: Sufficient / Low / Unknown badge |

All cards show a skeleton loading state while data fetches.

---

## Time Series View

**What it shows**: Weekly price over time for the selected crop/variety/markets.

**Chart elements**:
- One line + shaded min-max band per selected market (up to 10 markets; "All Markets" aggregate if none selected).
- Each market gets a distinct colour from a colour-blind-friendly palette.
- The shaded band = `(price_min, price_max)` within each week — shows within-week price spread across multiple reporters.
- X-axis: calendar dates (smart tick spacing based on date range length).
- Y-axis: ETB, compact-formatted (e.g. `9.8k` for 9,800).

**Hover tooltip**: Shows exact date, all series values at that date (precise ETB), and the min-max range.

**Date-before-data warning**: If the selected start date is earlier than the crop's first observation, a yellow alert is shown: *"Data for [crop] begins [date]. Showing from that point."*

**Gap handling**: `connectNulls=false` — gaps in the data appear as visible breaks in the line, not interpolated.

---

## Regional Comparison View

**What it shows**: One line per region, showing the region-average retail price over time.

**Chart elements**:
- 6 possible lines, one per region, with region-specific colours:
  - Oromia: `#5b9bd5` (blue)
  - Amhara: `#4dbb8a` (green)
  - SNNP: `#e8975a` (orange)
  - South West: `#a78bfa` (purple)
  - Sidama: `#f472b6` (pink)
  - Tigray: `#fb923c` (amber)
- If a region has no data for the selected crop/variety, its line is simply absent (not an error).
- Hover tooltip shows all available region values at the hovered date.

**Use case**: Quickly see which region has the highest/lowest price and whether price gaps between regions are widening or narrowing.

---

## Heatmap View

**What it shows**: A market × time grid where each cell is coloured by price level.

**Axes**:
- Y-axis: markets (rows, up to 40 markets shown; sorted by region then name)
- X-axis: dates (columns, sampled to ≤ 60 date points for readability)

**Color scale**: Global min-max normalised — lightest = cheapest market/date, darkest = most expensive.

**Hover tooltip**: Shows market name, region, date, exact ETB value.

**Scrollable**: Container scrolls horizontally if many dates are selected.

**Use case**: Instantly spot which markets are consistently expensive (dark rows) or which time periods had across-the-board price spikes (dark columns).

---

## Spread View

**What it shows**: The gap between retail and producer prices over time — the marketing margin that traders and transporters capture.

**Chart elements**:
- Two line charts stacked: retail price (blue) and producer price (green).
- A separate area chart below showing the spread = `retail − producer` in ETB.
- A zero-line reference on the spread panel.
- If spread goes negative (rare data anomaly), it is shown in red.

**Producer coverage warning**: If fewer than 30% of observations have producer price data for the selected crop/region, a banner is shown: *"Producer price coverage is [N]% for this selection — spread may be unreliable."*

**Use case**: Assess whether marketing margins are fair, identify crops with widening spreads (possible market inefficiency), monitor whether producer prices are tracking retail prices.

---

## Known UI Behaviour Notes

- **Tigray** appears in region/market dropdowns for all crops, but some crops (e.g. Sesame/Tigray) have very few observations. The date picker will automatically show the true available range.
- **"All Markets" aggregate** (when no market is selected) shows a single grey line. It uses the cross-market weekly average.
- **Recharts rendering**: Very long date ranges (> 3 years) are automatically downsampled for performance — actual data is not lost, just tick density is reduced.
