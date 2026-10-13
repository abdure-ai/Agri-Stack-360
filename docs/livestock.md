# Livestock prices and outlook

NMIS livestock market prices per head (https://www.nmis.et/livestock), shown on the web page **Livestock
prices**, in the mobile API (`/api/livestock/*`, see `docs/mobile/flutter-developer-guide.md` 8.10) and in advisor and
Telegram answers ("የበሬ ዋጋ ስንት ነው?", "What is the price of a goat?").

Code: `backend/livestock.py` (storage, import, model), `backend/routers/livestock.py` (API),
`backend/advisory/livestock_answer.py` (advisor), `frontend/src/pages/Market/Livestock.tsx`, `tests/test_livestock.py`.

## 1. Getting data in

The platform does not download livestock prices itself. The data team exports the NMIS livestock reports to a
CSV file and an admin uploads it: **Livestock prices → Import livestock prices → Upload CSV** (or
`POST /api/admin/livestock/import`, permission `sync:manage`). Every upload is written to the audit log.

One row per price report: one grade of animal at one market on one day.

| Column | Required | Example | Notes |
|---|---|---|---|
| `market` | yes | `Adama` | as NMIS names it |
| `region` | yes | `Oromia` | NMIS region name |
| `animal` | yes | `Ox` | `Ox`, `Cow`, `Bull`, `Heifer`, `Calf`, `Sheep`, `Goat`, `Camel`, `Chicken` get translated names; others are shown as written |
| `breed` | no | `Indigenous` | |
| `sex` | no | `Male` | |
| `production_type` | no | `Fattening` | |
| `body_condition` | no | `Fat` | |
| `date` | yes | `2026-09-30` | also `2026/09/30`; never in the future |
| `price_min` | yes | `40000` | birr per head; commas allowed |
| `price_max` | yes | `55000` | must be ≥ `price_min` |

- The template (header only) is on the same card (**Download template**).
- Uploading the same report again updates it (same market, animal, grade and date). Uploading the whole history
  each time is fine.
- Rows with errors are skipped and listed (line number and reason); the other rows are loaded.
- After an upload with new or changed rows, the outlook is retrained at once. **Retrain outlook** (permission
  `models:retrain`) retrains without uploading, e.g. so that "the latest report is N days old" stays true.
- Prices are stored in `nmis_prices.db` (tables `livestock_prices`, `livestock_forecasts`), on the server's state
  volume, so they survive deploys. Nothing is shown until the first upload: the page then says "No livestock
  prices loaded yet". No sample prices are shipped.

## 2. The outlook model

For each animal, for the whole country and for each region with enough data:

    log(price per head) = level of this grade at this market + common trend × days

Each grade at each market (a thin goat at Semera, a fat ox at Adama) keeps its own price level; the model
measures the trend they share. This suits short, patchy data better than averaging different animals together.
The outlook is the trend over the next 4 weeks, with an 80% range (spread of the reports around the trend plus
the uncertainty of the trend itself).

**Check on unseen data.** The model is trained on the first three quarters of the period and predicts the reports
of the last quarter. Its average error is compared with "no change since the last report". If the trend is no
better, the outlook is "about the same" and the reasons say why.

## 3. Confidence and reasons

The confidence is shown next to every outlook (web, app, advisor) with its reasons:

| Reason (code) | When | Effect |
|---|---|---|
| Based on N reports from M markets, start to end (`period`) | always | — |
| Not enough repeated reports (`too_few`) | fewer than 6 reports of grades reported more than once, or under 30 days | **no outlook** |
| Less than one year of data, no seasons (`no_season`) | under 365 days | high confidence not possible |
| Only N days of data (`short_period`) | under 90 days | one level lower |
| Only N reports (`few_reports`) | under 30 reports | one level lower |
| The latest report is N days old (`stale`) | over 30 days | one level lower |
| Tested on recent reports: off by X% (`checked`) | always when testable | one level lower if X > 15% |
| Trend no better than "no change" (`no_trend`) | test lost to "no change" | one level lower; outlook "about the same" |
| Too few recent reports to test (`not_checked`) | too few held-out reports | one level lower |

The start is **medium**; each weakness lowers it to **low**. **High** needs at least a year of data, 100 or more
reports, a test error of 8% or less and a report in the last 14 days. With the NMIS data available in 2026 (a few
months, a few markets per animal), expect **low**, sometimes medium. The page and the answers say so in plain words.

A region with too few reports gets the country's outlook, and the page says so.
