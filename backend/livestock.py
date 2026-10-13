"""
livestock.py — NMIS livestock market prices: storage, CSV import, forecast model with confidence and reasons.

Data comes in as a CSV file (one row per price report, see CSV_COLUMNS and docs/livestock.md), collected
from the NMIS livestock pages (https://www.nmis.et/livestock). Prices are per head, in birr, as the lowest and
highest price reported for one grade (animal, breed, sex, production type, body condition) at one market on
one day. Rows are upserted, so importing the same file twice changes nothing.

Forecast model (per animal, for the whole country and per region with enough data):
    log(price) = grade-at-market level + slope × days
A fixed-effects trend: every series (one grade at one market) keeps its own price level and all series of
the animal share one weekly trend. That suits short, patchy data: a thin goat in Afar and a fat ox in Oromia
never get averaged together, but both tell us which way prices move.
The model is checked on the most recent quarter of the period (trained on the rest, then predicting it) and
compared with "no change since the last report". If it is no better, the forecast says "about the same".

Confidence is "high", "medium" or "low" (or no forecast at all), with the reasons shown to the user:
the number of reports and their period, whether a full year is covered (seasons), how recent the last
report is, and how far off the model was on the held-out reports.
"""

from __future__ import annotations

import csv
import io
import json
import math
import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

SOURCE = "NMIS livestock market data (nmis.et)"
HORIZON_DAYS = 28
MIN_REPORTS = 6                 # fewer repeated reports than this: no forecast
MIN_SPAN_DAYS = 30
PRICE_RANGE = (50.0, 3_000_000.0)   # birr per head; outside this a row is a typo
CSV_COLUMNS = ["market", "region", "animal", "breed", "sex", "production_type", "body_condition",
               "date", "price_min", "price_max"]
REQUIRED = ["market", "region", "animal", "date", "price_min", "price_max"]
GRADE_FIELDS = ("breed", "sex", "production_type", "body_condition")

SCHEMA = """
CREATE TABLE IF NOT EXISTS livestock_prices (
    id              INTEGER PRIMARY KEY,
    market          TEXT NOT NULL,
    region          TEXT NOT NULL,
    animal          TEXT NOT NULL,
    breed           TEXT NOT NULL DEFAULT '',
    sex             TEXT NOT NULL DEFAULT '',
    production_type TEXT NOT NULL DEFAULT '',
    body_condition  TEXT NOT NULL DEFAULT '',
    report_date     TEXT NOT NULL,          -- YYYY-MM-DD
    price_min       REAL NOT NULL,          -- birr per head
    price_max       REAL NOT NULL,
    source          TEXT NOT NULL,
    imported_at     TEXT NOT NULL,
    UNIQUE (market, animal, breed, sex, production_type, body_condition, report_date)
);
CREATE INDEX IF NOT EXISTS ix_lv_animal ON livestock_prices (animal, report_date);
CREATE TABLE IF NOT EXISTS livestock_forecasts (
    animal      TEXT NOT NULL,
    region      TEXT NOT NULL,               -- '' = whole country
    trained_at  TEXT NOT NULL,
    result      TEXT NOT NULL,               -- JSON, see forecast()
    PRIMARY KEY (animal, region)
);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Import ────────────────────────────────────────────────────────────────────

def _parse_date(text: str) -> date:
    text = text.strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"date '{text}' is not YYYY-MM-DD")


def _parse_price(text: str, name: str) -> float:
    try:
        value = float(str(text).replace(",", "").strip())
    except ValueError:
        raise ValueError(f"{name} '{text}' is not a number") from None
    if not PRICE_RANGE[0] <= value <= PRICE_RANGE[1]:
        raise ValueError(f"{name} {value:,.0f} birr is outside {PRICE_RANGE[0]:,.0f}–{PRICE_RANGE[1]:,.0f}")
    return value


def _clean(text) -> str:
    return " ".join(str(text or "").split())


def import_rows(conn: sqlite3.Connection, rows, *, source: str = SOURCE, today: date | None = None) -> dict:
    """Validate and upsert price reports. Returns {"added", "updated", "rejected", "errors": [...]}."""
    ensure_schema(conn)
    today = today or date.today()
    added = updated = 0
    errors: list[str] = []
    for line, raw in enumerate(rows, start=2):           # line 1 is the header
        row = {(k or "").strip().lower(): v for k, v in raw.items()}
        try:
            missing = [c for c in REQUIRED if not _clean(row.get(c))]
            if missing:
                raise ValueError("missing " + ", ".join(missing))
            d = _parse_date(row["date"])
            if d > today:
                raise ValueError(f"date {d} is in the future")
            pmin, pmax = _parse_price(row["price_min"], "price_min"), _parse_price(row["price_max"], "price_max")
            if pmin > pmax:
                raise ValueError("price_min is higher than price_max")
            key = (_clean(row["market"]), _clean(row["animal"]), *(_clean(row.get(f)) for f in GRADE_FIELDS))
            existing = conn.execute(
                """SELECT id FROM livestock_prices WHERE market=? AND animal=? AND breed=? AND sex=?
                   AND production_type=? AND body_condition=? AND report_date=?""", (*key, d.isoformat())).fetchone()
            if existing:
                conn.execute("UPDATE livestock_prices SET region=?, price_min=?, price_max=?, source=?, imported_at=? "
                             "WHERE id=?", (_clean(row["region"]), pmin, pmax, source, _now(), existing[0]))
                updated += 1
            else:
                conn.execute(
                    """INSERT INTO livestock_prices (market, region, animal, breed, sex, production_type,
                       body_condition, report_date, price_min, price_max, source, imported_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (key[0], _clean(row["region"]), *key[1:], d.isoformat(), pmin, pmax, source, _now()))
                added += 1
        except ValueError as exc:
            errors.append(f"line {line}: {exc}")
    conn.commit()
    return {"added": added, "updated": updated, "rejected": len(errors), "errors": errors[:50]}


def import_csv_text(conn: sqlite3.Connection, text: str, **kw) -> dict:
    reader = csv.DictReader(io.StringIO(text.lstrip("﻿")))
    header = [(h or "").strip().lower() for h in reader.fieldnames or []]
    missing = [c for c in REQUIRED if c not in header]
    if missing:
        raise ValueError("CSV header is missing: " + ", ".join(missing) + ". Expected: " + ",".join(CSV_COLUMNS))
    return import_rows(conn, reader, **kw)


# ── Reading ───────────────────────────────────────────────────────────────────

def grade_label(row: dict) -> str:
    """'Ox · Indigenous · Male · Fattening · Fat' (empty parts left out)."""
    parts = [row["animal"], *(row.get(f) for f in GRADE_FIELDS)]
    return " · ".join(p for p in parts if p)


def _series_key(row: dict) -> tuple:
    return (row["market"], row["animal"], *(row.get(f) or "" for f in GRADE_FIELDS))


def summary(conn: sqlite3.Connection) -> dict:
    """What is loaded: animals with their report counts, markets and period."""
    ensure_schema(conn)
    total = conn.execute("SELECT COUNT(*), COUNT(DISTINCT market), MIN(report_date), MAX(report_date), "
                         "MAX(imported_at) FROM livestock_prices").fetchone()
    animals = [dict(zip(("animal", "reports", "markets", "regions", "first_date", "last_date"), r)) for r in conn.execute(
        """SELECT animal, COUNT(*), COUNT(DISTINCT market), COUNT(DISTINCT region), MIN(report_date), MAX(report_date)
           FROM livestock_prices GROUP BY animal ORDER BY COUNT(*) DESC""")]
    regions = [r[0] for r in conn.execute("SELECT DISTINCT region FROM livestock_prices ORDER BY region")]
    return {"reports": total[0], "markets": total[1], "first_date": total[2], "last_date": total[3],
            "imported_at": total[4], "animals": animals, "regions": regions, "source": SOURCE,
            "source_url": "https://www.nmis.et/livestock"}


def _rows(conn: sqlite3.Connection, animal: str, region: str | None = None) -> list[dict]:
    sql = ("SELECT market, region, animal, breed, sex, production_type, body_condition, report_date, price_min, "
           "price_max FROM livestock_prices WHERE animal=?")
    params: list = [animal]
    if region:
        sql += " AND region=?"
        params.append(region)
    cur = conn.execute(sql + " ORDER BY report_date", params)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def series(conn: sqlite3.Connection, animal: str, region: str | None = None, market: str | None = None) -> list[dict]:
    """Price series of one animal: one per grade at a market, with all its reports (oldest first)."""
    ensure_schema(conn)
    groups: dict[tuple, dict] = {}
    for r in _rows(conn, animal, region):
        if market and r["market"] != market:
            continue
        s = groups.setdefault(_series_key(r), {
            "market": r["market"], "region": r["region"], "animal": r["animal"],
            **{f: r[f] for f in GRADE_FIELDS}, "grade": grade_label(r), "points": []})
        s["points"].append({"date": r["report_date"], "min": r["price_min"], "max": r["price_max"],
                            "avg": round((r["price_min"] + r["price_max"]) / 2)})
    out = list(groups.values())
    for s in out:
        last, prev = s["points"][-1], (s["points"][-2] if len(s["points"]) > 1 else None)
        s["latest"] = last
        s["change_pct"] = round((last["avg"] / prev["avg"] - 1) * 100, 1) if prev else None
    return sorted(out, key=lambda s: s["latest"]["date"], reverse=True)


def latest_reports(conn: sqlite3.Connection, animal: str, region: str | None = None, n: int = 3) -> list[dict]:
    """The n most recently reported grades of an animal (in the region if it has any, else the country)."""
    found = series(conn, animal, region) if region else []
    where = "region" if found else "country"
    if not found:
        found = series(conn, animal)
    return [{**s, "where": where} for s in found[:n]]


# ── Model ─────────────────────────────────────────────────────────────────────

@dataclass
class _Obs:
    key: tuple
    day: float        # days since the first report
    y: float          # log(average price)


def _fit(obs: list[_Obs]) -> tuple[float, dict[tuple, float], float, float] | None:
    """Fixed-effects trend. Returns (slope per day, level per series at its mean day, residual sd, slope se)."""
    by: dict[tuple, list[_Obs]] = {}
    for o in obs:
        by.setdefault(o.key, []).append(o)
    sxx = sxy = 0.0
    means: dict[tuple, tuple[float, float]] = {}
    for key, xs in by.items():
        md = sum(o.day for o in xs) / len(xs)
        my = sum(o.y for o in xs) / len(xs)
        means[key] = (md, my)
        for o in xs:
            sxx += (o.day - md) ** 2
            sxy += (o.day - md) * (o.y - my)
    if sxx <= 0:
        return None
    slope = sxy / sxx
    resid = [o.y - (means[o.key][1] + slope * (o.day - means[o.key][0])) for o in obs]
    dof = max(1, len(obs) - len(by) - 1)
    sd = math.sqrt(sum(r * r for r in resid) / dof)
    se = sd / math.sqrt(sxx)
    levels = {k: my - slope * md for k, (md, my) in means.items()}      # log price at day 0
    return slope, levels, sd, se


def _observations(rows: list[dict]) -> tuple[list[_Obs], date]:
    start = min(date.fromisoformat(r["report_date"]) for r in rows)
    return [_Obs(_series_key(r), (date.fromisoformat(r["report_date"]) - start).days,
                 math.log((r["price_min"] + r["price_max"]) / 2)) for r in rows], start


def _backtest(obs: list[_Obs]) -> dict | None:
    """Train on the first three quarters of the period, predict the last quarter (series seen in training)."""
    span = max(o.day for o in obs)
    cut = span * 0.75
    train = [o for o in obs if o.day <= cut]
    fit = _fit(train)
    if fit is None:
        return None
    slope, levels, _, _ = fit
    last_seen: dict[tuple, _Obs] = {}
    for o in sorted(train, key=lambda o: o.day):
        last_seen[o.key] = o
    model_err, naive_err = [], []
    for o in obs:
        if o.day <= cut or o.key not in levels:
            continue
        actual = math.exp(o.y)
        model_err.append(abs(math.exp(levels[o.key] + slope * o.day) / actual - 1))
        naive_err.append(abs(math.exp(last_seen[o.key].y) / actual - 1))
    if len(model_err) < 3:
        return None
    return {"held_out": len(model_err), "model_error_pct": round(100 * sum(model_err) / len(model_err), 1),
            "no_change_error_pct": round(100 * sum(naive_err) / len(naive_err), 1)}


def _reason(code: str, text: str, **params) -> dict:
    return {"code": code, "params": params, "text": text}


def train_one(rows: list[dict], *, animal: str, region: str = "", today: date | None = None) -> dict:
    """Fit, check and score the forecast for one animal (and region). Pure function of the reports."""
    today = today or date.today()
    base = {"animal": animal, "region": region or None, "horizon_days": HORIZON_DAYS, "source": SOURCE}
    if not rows:
        return {**base, "status": "no_data", "confidence": None, "reasons": [
            _reason("no_data", "No NMIS livestock reports are loaded for this animal.")]}
    obs, start = _observations(rows)
    first, last = start, max(date.fromisoformat(r["report_date"]) for r in rows)
    span = (last - first).days
    by_series: dict[tuple, int] = {}
    for o in obs:
        by_series[o.key] = by_series.get(o.key, 0) + 1
    repeated = sum(c for c in by_series.values() if c > 1)
    markets = len({r["market"] for r in rows})
    period = _reason("period", f"Based on {len(rows)} price reports from {markets} market(s), "
                               f"{first:%d %b %Y} to {last:%d %b %Y}.",
                     reports=len(rows), markets=markets, grades=len(by_series),
                     start=first.isoformat(), end=last.isoformat(), days=span)
    reasons = [period]
    stats = {"reports": len(rows), "markets": markets, "series": len(by_series), "first_date": first.isoformat(),
             "last_date": last.isoformat(), "span_days": span}
    if repeated < MIN_REPORTS or span < MIN_SPAN_DAYS:
        reasons.append(_reason("too_few", f"Not enough repeated reports to see a trend (need {MIN_REPORTS} reports "
                                          f"of the same grades over at least {MIN_SPAN_DAYS} days).",
                               need_reports=MIN_REPORTS, need_days=MIN_SPAN_DAYS))
        return {**base, **stats, "status": "insufficient", "confidence": None, "reasons": reasons}
    fit = _fit(obs)
    if fit is None:
        return {**base, **stats, "status": "insufficient", "confidence": None, "reasons": reasons + [
            _reason("too_few", "The reports are all on the same days, so no trend can be measured.",
                    need_reports=MIN_REPORTS, need_days=MIN_SPAN_DAYS)]}
    slope, _, sd, se = fit
    check = _backtest(obs)
    use_trend = check is None or check["model_error_pct"] < check["no_change_error_pct"]
    if not use_trend:
        slope = 0.0
    change = math.exp(slope * HORIZON_DAYS) - 1
    spread = math.sqrt(sd ** 2 + (se * HORIZON_DAYS) ** 2) if use_trend else sd
    low, high = math.exp(slope * HORIZON_DAYS - 1.2816 * spread) - 1, math.exp(slope * HORIZON_DAYS + 1.2816 * spread) - 1
    stale = (today - last).days

    # Score: start at medium, drop for each weakness; high needs a full year (seasons) and plenty of reports.
    score = 2
    if span < 365:
        reasons.append(_reason("no_season", "Less than one year of data, so seasonal changes (holidays, dry season) "
                                             "are not in the model.", days=span))
    if span < 90:
        score -= 1
        reasons.append(_reason("short_period", f"Only {span} days of data: too short to tell a trend from a "
                                                f"passing change.", days=span))
    if len(rows) < 30:
        score -= 1
        reasons.append(_reason("few_reports", f"Only {len(rows)} reports: one unusual market day moves the result.",
                               reports=len(rows)))
    if stale > 30:
        score -= 1
        reasons.append(_reason("stale", f"The latest report is {stale} days old.", days=stale))
    if check:
        if use_trend:
            reasons.append(_reason("checked", f"Tested on the {check['held_out']} most recent reports: off by "
                                              f"{check['model_error_pct']:g}% on average (no-change guess: "
                                              f"{check['no_change_error_pct']:g}%).", **check))
            if check["model_error_pct"] > 15:
                score -= 1
        else:
            score -= 1
            reasons.append(_reason("no_trend", f"Tested on the {check['held_out']} most recent reports, the trend was "
                                               f"no better than assuming no change ({check['model_error_pct']:g}% vs "
                                               f"{check['no_change_error_pct']:g}%), so the forecast is 'about the same'.",
                                   **check))
    else:
        score -= 1
        reasons.append(_reason("not_checked", "Too few recent reports to test the model on data it has not seen."))
    if span >= 365 and len(rows) >= 100 and check and use_trend and check["model_error_pct"] <= 8 and stale <= 14:
        score = 3
    confidence = {3: "high", 2: "medium"}.get(score, "low")
    direction = "up" if change > 0.01 else "down" if change < -0.01 else "flat"
    return {**base, **stats, "status": "ok", "confidence": confidence, "direction": direction,
            "change_pct": round(change * 100, 1), "range_pct": [round(low * 100, 1), round(high * 100, 1)],
            "weekly_trend_pct": round((math.exp(slope * 7) - 1) * 100, 2), "trend_used": use_trend,
            "backtest": check, "reasons": reasons, "model": "fixed-effects log-price trend (per grade and market)"}


def train(conn: sqlite3.Connection, today: date | None = None) -> list[dict]:
    """Train every animal (country) and every animal × region with reports; store the results."""
    ensure_schema(conn)
    results = []
    for (animal,) in conn.execute("SELECT DISTINCT animal FROM livestock_prices").fetchall():
        rows = _rows(conn, animal)
        results.append(train_one(rows, animal=animal, today=today))
        for region in sorted({r["region"] for r in rows}):
            results.append(train_one([r for r in rows if r["region"] == region], animal=animal, region=region,
                                     today=today))
    trained_at = _now()
    conn.execute("DELETE FROM livestock_forecasts")
    conn.executemany("INSERT INTO livestock_forecasts (animal, region, trained_at, result) VALUES (?,?,?,?)",
                     [(r["animal"], r["region"] or "", trained_at, json.dumps(r)) for r in results])
    conn.commit()
    return results


def forecast(conn: sqlite3.Connection, animal: str, region: str | None = None) -> dict:
    """The stored forecast for the region when it has one, else the country's (trained on the fly if missing)."""
    ensure_schema(conn)
    for reg in ([region] if region else []) + [""]:
        row = conn.execute("SELECT result, trained_at FROM livestock_forecasts WHERE animal=? AND region=?",
                           (animal, reg)).fetchone()
        if row:
            result = json.loads(row[0])
            if reg and result.get("status") != "ok":
                continue                     # region too thin: use the country forecast
            return {**result, "trained_at": row[1]}
    return train_one(_rows(conn, animal), animal=animal)


def animals(conn: sqlite3.Connection) -> list[str]:
    ensure_schema(conn)
    return [r[0] for r in conn.execute("SELECT DISTINCT animal FROM livestock_prices ORDER BY animal")]


def projected(latest: dict, result: dict) -> dict | None:
    """Expected price range 4 weeks after a grade's latest report ({"date", "avg"}), from the animal's forecast."""
    if result.get("status") != "ok":
        return None
    lo, hi = result["range_pct"]
    avg = latest["avg"]
    return {"date": (date.fromisoformat(latest["date"]) + timedelta(days=HORIZON_DAYS)).isoformat(),
            "avg": round(avg * (1 + result["change_pct"] / 100)),
            "low": round(avg * (1 + lo / 100)), "high": round(avg * (1 + hi / 100))}
