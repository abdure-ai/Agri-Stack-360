# NMIS Agricultural Price Dashboard — User Guide & Component Documentation

> [!NOTE]  
> **Target Audience**: Agricultural Economists, Policy Analysts, Market Researchers, and Traders.  
> **Data Basis**: 445,010 observations across 309 physical markets in Ethiopia (2019 – 2026).

---

## 1. Top Header Bar

The top header bar provides persistent system context across all views:

- **System Context**: Displays total dataset coverage (**445,010 observations**, **309 markets**, **19 crop categories**).
- **Active Filter Breadcrumb** *(Far Right)*: Displays your currently active selection (e.g. `Teff · Oromia · retail`).

---

## 2. Filter Sidebar (Left Panel)

The Filter Sidebar lets users slice and filter the dataset dynamically. All dropdowns feature cascading relationships:

### A. Commodity & Variety Dropdowns
- **Commodity**: Select from 19 agricultural crops (e.g., Teff, Wheat, Maize, Onion, Coffee/Sesame).
- **Variety** *(Cascading)*: Dynamically updates based on the chosen commodity (e.g., selecting *Teff* populates *White Teff*, *Red Teff*, *Mixed Teff*). Defaults to "All varieties".

### B. Price Level Selector (With Coverage Badges)
Allows toggling between three supply chain market levels:
1. **Retail** *(Blue, 96% Data Coverage)*: Consumer purchase prices at urban/local retail stalls.
2. **Wholesale** *(Green, 39% Data Coverage)*: Trader-to-trader prices in bulk trading hubs.
3. **Producer** *(Amber, 50% Data Coverage)*: Farmgate prices paid directly to farmers.

> [!TIP]
> The percentage badges below each toggle button indicate dataset completeness. Switch to **Retail** for maximum historical continuity.

### C. Region & Market Selection
- **Region**: Filter by Ethiopia's 6 administrative agricultural regions (*Amhara*, *Oromia*, *SNNP*, *Sidama*, *South West*, *Tigray*).
- **Market Multi-Select** *(Up to 5 Markets)*: Appears when a region is selected. Allows selecting up to 5 specific physical markets (e.g., *Adama City*, *Bale Robe*, *Ambo Town*) for side-by-side comparison.

### D. Date Range & Crop Availability Handling
- **Crop Availability Notice**: Displays the exact start date for the selected crop (e.g. *Teff/Wheat/Maize* start **March 2019**; vegetables like *Onion/Potato/Tomato* start **December 2022**).
- **Bounded Inputs**: Automatically clamps date inputs to prevent silent empty charts when filtering shorter-history crops.

---

## 3. Executive KPI Summary Cards (Top Main Panel)

Located directly above the main chart panel, these 4 cards offer an instant snapshot of market health:

| KPI Card | What It Shows | Interpretation |
| :--- | :--- | :--- |
| **Latest Price** | The most recent weekly average price recorded in ETB per standard unit (e.g., `10,518 ETB/Quintal`). | Current market price level. Includes exact collection date. |
| **Week-over-Week (WoW)** | Percentage price change compared to the previous collection week (`+X.X%` or `-X.X%`). | **Green** indicates falling food prices; **Red** indicates rising food prices. |
| **4-Week Average** | Moving average across the last 4 collection weeks. Includes overall historical period average. | Helps distinguish short-term weekly noise from medium-term price trends. |
| **Supply Signal** | Qualitative supply status aggregated from market survey returns (**Sufficient** or **Under**). | **Green (Sufficient)** = Healthy market supply. **Amber (Under)** = Supply deficit / market tightness. |

---

## 4. Interactive Chart Views (Tabs)

### Tab 1: 📈 Time Series View (Market Trend Analysis)
- **Primary Purpose**: Track price movement over time for selected markets.
- **Key Features**:
  - **Min-Max Shaded Band**: Displays the weekly price range (lowest producer/retail price to highest) as a shaded corridor around the average line.
  - **Multi-Market Overlay**: Shows up to 5 selected markets as distinct color-coded lines.
  - **Null Gap Handling**: Discontinuous lines indicate missing weekly reports without drawing fake zero dips.

### Tab 2: 🗺 Regional Comparison View (Spatial Price Disparities)
- **Primary Purpose**: Compare regional price levels across Ethiopia's 6 major agricultural regions simultaneously.
- **Key Features**:
  - Overlays weekly regional average prices for *Amhara*, *Oromia*, *SNNP*, *Sidama*, *South West*, and *Tigray*.
  - Quickly reveals spatial arbitrage opportunities (e.g., surplus producing regions vs. deficit consuming regions).

### Tab 3: 🟨 Price Heatmap View (Shock Spotting Matrix)
- **Primary Purpose**: Visual matrix of **Markets (Y-axis)** × **Collection Weeks (X-axis)** to identify regional price shocks at a glance.
- **Key Features**:
  - **Color Scale**: Uses a normalized color gradient from **Cool Blue** *(lower prices)* to **Warm Orange/Red** *(higher prices)*.
  - **Hover Tooltip**: Displays exact market name, date, and price in ETB for any cell.
  - **Capped Matrix**: Automatically caps at 40 markets and samples weekly columns for smooth performance.

### Tab 4: ↕ Producer-Retail Spread View (Supply Chain Margins)
- **Primary Purpose**: Analyzes trader/intermediary markup by comparing **Retail Prices** against **Producer (Farmgate) Prices**.
- **Key Features**:
  - **Dual Line Chart**: Retail price line vs. Producer price line.
  - **Spread Area Chart** *(Bottom)*: Plots `Retail Price − Producer Price` in ETB over time.
  - **Coverage Warning**: Flags when producer price data coverage is sparse for a specific crop/region selection.

---

## 5. Technical Design & Performance Guarantees

1. **Server-Side Aggregation**: No raw 445K row downloads. SQL queries aggregate data to weekly averages on the server before serving JSON.
2. **SQLite WAL Mode**: Optimized for low latency concurrent reads.
3. **No Empty State Pitfalls**: Explicit warnings and empty-state messaging when date filters precede data availability.
