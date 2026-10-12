"""
market_nmis.py — Market prices and trends from the NMIS price database (spec F2, F9).

NMIS markets have names and regions but no coordinates. Each market is placed
on the map by matching its name to a woreda/town in the official boundaries
(e.g. 'Kemise Hamus Gebeya' -> 'Kemisie town', 'Bati Segno Gebeya' -> 'Bati'),
stored in market_locations with the method used. Markets that cannot be matched
fall back to their region's centre and are flagged as approximate.

Quotes come from the price data itself (latest week, 4-week trend); the
forecast comes from the existing prediction API on :8001 when it is reachable.
"""

from __future__ import annotations

import difflib
import json
import re
import sqlite3
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta

from backend import admin_areas
from backend.advisory.config import ROOT, env, offline
from backend.advisory.providers import MarketQuote
from backend.database import query as nmis_query

FORECAST_URL = env("ADVISORY_FORECAST_URL", "http://localhost:8001")
FORECAST_TTL_SECONDS = 6 * 3600
FORECAST_CACHE_DIR = ROOT / "data" / "cache" / "forecast"
_FORECAST_CACHE: dict[tuple, tuple[float, tuple]] = {}
MATCH_THRESHOLD = 0.82
_NOISE = {"gebeya", "market", "kebele", "town", "ketema", "woreda", "special", "zone", "the", "of", "hamus", "segno",
          "kidame", "maksegno", "rob", "ehud", "city", "admin"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS market_locations (
    market_id    INTEGER PRIMARY KEY,   -- markets.id in nmis_prices.db
    market_name  TEXT NOT NULL,
    nmis_region  TEXT NOT NULL,
    pcode        TEXT,                  -- matched admin area
    latitude     REAL,
    longitude    REAL,
    method       TEXT NOT NULL          -- 'name_match' | 'region_centre' | 'manual'
);
"""


def _norm_tokens(name: str) -> list[str]:
    words = re.findall(r"[a-z]+", name.lower())
    return [w for w in words if w not in _NOISE and len(w) > 2]


def _best_area(market_name: str, areas: list[admin_areas.Area]) -> tuple[admin_areas.Area | None, float]:
    tokens = _norm_tokens(market_name)
    if not tokens:
        return None, 0.0
    best, best_score = None, 0.0
    for a in areas:
        a_tokens = _norm_tokens(a.name)
        if not a_tokens:
            continue
        score = max(difflib.SequenceMatcher(None, tokens[0], t).ratio() for t in a_tokens)
        full = difflib.SequenceMatcher(None, " ".join(tokens), " ".join(a_tokens)).ratio()
        score = max(score, full)
        if score > best_score or (score == best_score and best is not None and a.level > best.level):
            best, best_score = a, score
    return best, best_score


def build_market_locations(conn: sqlite3.Connection, rebuild: bool = False) -> int:
    """Match every NMIS market to an admin area; manual rows are never overwritten."""
    conn.executescript(SCHEMA)
    if not rebuild and conn.execute("SELECT COUNT(*) FROM market_locations").fetchone()[0]:
        return 0
    regions = admin_areas.children(conn, None)
    official_for_nmis: dict[str, list[admin_areas.Area]] = {}
    for r in regions:
        nmis = admin_areas.nmis_region(r.name)
        if nmis:
            official_for_nmis.setdefault(nmis, []).append(r)
    areas_by_region: dict[str, list[admin_areas.Area]] = {}
    for nmis, regs in official_for_nmis.items():
        areas: list[admin_areas.Area] = []
        for reg in regs:
            for zone in admin_areas.children(conn, reg.pcode):
                areas.append(zone)
                areas.extend(admin_areas.children(conn, zone.pcode))
        areas_by_region[nmis] = areas

    rows = nmis_query("SELECT id, market_name, region FROM markets")
    written = 0
    with conn:
        for m in rows:
            manual = conn.execute("SELECT 1 FROM market_locations WHERE market_id=? AND method='manual'", (m["id"],)).fetchone()
            if manual:
                continue
            area, score = _best_area(m["market_name"], areas_by_region.get(m["region"], []))
            if area is not None and score >= MATCH_THRESHOLD:
                values = (area.pcode, area.latitude, area.longitude, "name_match")
            else:
                reg = (official_for_nmis.get(m["region"]) or [None])[0]
                values = (reg.pcode if reg else None, reg.latitude if reg else None,
                          reg.longitude if reg else None, "region_centre")
            conn.execute(
                """INSERT INTO market_locations (market_id, market_name, nmis_region, pcode, latitude, longitude, method)
                   VALUES (?,?,?,?,?,?,?)
                   ON CONFLICT(market_id) DO UPDATE SET market_name=excluded.market_name, nmis_region=excluded.nmis_region,
                     pcode=excluded.pcode, latitude=excluded.latitude, longitude=excluded.longitude, method=excluded.method""",
                (m["id"], m["market_name"], m["region"], *values),
            )
            written += 1
    return written


def _trend(recent: float | None, previous: float | None) -> str:
    if not recent or not previous:
        return "unknown"
    change = (recent - previous) / previous * 100
    return "rising" if change > 3 else "falling" if change < -3 else "stable"


class NMISMarket:
    """MarketSource over nmis_prices.db + the forecast API."""

    def __init__(self, conn: sqlite3.Connection, today: date | None = None, max_age_days: int = 120):
        self.conn = conn
        self.today = today or date.today()
        self.max_age_days = max_age_days
        build_market_locations(conn)

    def _forecast(self, crop: str, region: str, weeks: int = 4) -> tuple[float | None, str | None]:
        """Regional forecast, cached: it only changes after a data sync, and each call takes seconds."""
        key = (crop.lower(), region, weeks)
        hit = _FORECAST_CACHE.get(key)
        if hit and time.monotonic() - hit[0] < FORECAST_TTL_SECONDS:
            return hit[1]
        result = self._fetch_forecast(crop, region, weeks)
        disk = FORECAST_CACHE_DIR / f"{crop.lower()}_{re.sub(r'[^a-z0-9]+', '_', region.lower())}_{weeks}.json"
        if result[0] is not None:          # do not cache failures
            _FORECAST_CACHE[key] = (time.monotonic(), result)
            FORECAST_CACHE_DIR.mkdir(parents=True, exist_ok=True)
            disk.write_text(json.dumps({"price": result[0], "confidence": result[1]}), encoding="utf-8")
        elif disk.exists():                # offline or API down: last known forecast keeps the demo working
            cached = json.loads(disk.read_text(encoding="utf-8"))
            result = (cached["price"], cached["confidence"])
        return result

    def _fetch_forecast(self, crop: str, region: str, weeks: int) -> tuple[float | None, str | None]:
        if offline():
            return None, None
        url = f"{FORECAST_URL}/predict?" + urllib.parse.urlencode({"crop": crop, "region": region, "weeks_ahead": weeks})
        try:
            with urllib.request.urlopen(url, timeout=6) as r:
                data = json.loads(r.read())
            preds = data.get("predictions") or []
            return (preds[-1]["price_median_etb"] if preds else None), data.get("confidence")
        except Exception:
            return None, None

    def _regional_latest(self, crop: str, region: str) -> float | None:
        """Average retail price across the region's markets in the latest 4 reporting weeks."""
        row = nmis_query(
            """SELECT AVG((p.price_retail_min + p.price_retail_max) / 2.0) AS price
               FROM prices p JOIN varieties v ON v.id = p.variety_id JOIN crops c ON c.id = v.crop_id
               JOIN markets m ON m.id = p.market_id
               WHERE lower(c.crop_name) = lower(?) AND m.region = ? AND p.price_retail_min IS NOT NULL
                 AND p.collection_date >= (
                   SELECT date(MAX(p2.collection_date), '-28 days') FROM prices p2
                   JOIN varieties v2 ON v2.id = p2.variety_id JOIN crops c2 ON c2.id = v2.crop_id
                   JOIN markets m2 ON m2.id = p2.market_id
                   WHERE lower(c2.crop_name) = lower(?) AND m2.region = ?)""",
            (crop, region, crop, region),
        )
        return row[0]["price"] if row and row[0]["price"] else None

    def nearest_markets(self, crop: str, latitude: float, longitude: float, n: int = 3) -> list[dict]:
        since = (self.today - timedelta(days=self.max_age_days)).isoformat()
        with_data = {r["market_id"] for r in nmis_query(
            """SELECT DISTINCT p.market_id FROM prices p JOIN varieties v ON v.id = p.variety_id
               JOIN crops c ON c.id = v.crop_id
               WHERE lower(c.crop_name) = lower(?) AND p.collection_date >= ? AND p.price_retail_min IS NOT NULL""",
            (crop, since))}
        out = []
        for m in self.conn.execute("SELECT market_id, market_name, nmis_region, latitude, longitude, method FROM market_locations"):
            if m[0] in with_data and m[3] is not None:
                out.append({"market_id": m[0], "market": m[1], "region": m[2], "method": m[5],
                            "distance_km": round(admin_areas.distance_km(latitude, longitude, m[3], m[4]), 1)})
        return sorted(out, key=lambda x: x["distance_km"])[:n]

    def recent_markets(self, crop: str, region: str | None = None, n: int = 3) -> list[dict]:
        """Markets (in a region, or anywhere) that reported this crop most recently; no distances."""
        since = (self.today - timedelta(days=self.max_age_days)).isoformat()
        rows = nmis_query(
            f"""SELECT m.id AS market_id, m.market_name AS market, m.region AS region, MAX(p.collection_date) AS last
                FROM prices p JOIN varieties v ON v.id = p.variety_id JOIN crops c ON c.id = v.crop_id
                JOIN markets m ON m.id = p.market_id
                WHERE lower(c.crop_name) = lower(?) AND p.collection_date >= ? AND p.price_retail_min IS NOT NULL
                  {"AND lower(m.region) = lower(?)" if region else ""}
                GROUP BY m.id ORDER BY last DESC, m.market_name LIMIT ?""",
            (crop, since, *([region] if region else []), n))
        return [{"market_id": r["market_id"], "market": r["market"], "region": r["region"], "method": "region",
                 "distance_km": None} for r in rows]

    def quote(self, crop: str, market: dict) -> MarketQuote:
        rows = nmis_query(
            """SELECT p.collection_date AS d, AVG((p.price_retail_min + p.price_retail_max) / 2.0) AS price, MAX(v.unit) AS unit
               FROM prices p JOIN varieties v ON v.id = p.variety_id JOIN crops c ON c.id = v.crop_id
               WHERE p.market_id = ? AND lower(c.crop_name) = lower(?) AND p.price_retail_min IS NOT NULL
               GROUP BY p.collection_date ORDER BY p.collection_date DESC LIMIT 8""",
            (market["market_id"], crop),
        )
        latest = rows[0] if rows else None
        recent = [r["price"] for r in rows[:4] if r["price"]]
        previous = [r["price"] for r in rows[4:8] if r["price"]]
        trend = _trend(sum(recent) / len(recent) if recent else None, sum(previous) / len(previous) if previous else None)
        # The forecast is for the whole region, so compare it with the region's latest
        # average price, not with this one market's price.
        fc_price, fc_conf = self._forecast(crop.title(), market["region"])
        regional_now = self._regional_latest(crop, market["region"])
        change = None
        if fc_price and regional_now:
            change = round((fc_price - regional_now) / regional_now * 100, 1)
        return MarketQuote(
            crop=crop, market=market["market"], region=market["region"],
            price_etb=round(latest["price"], 0) if latest and latest["price"] else None,
            unit=(latest["unit"] if latest else None) or "Quintal",
            as_of=date.fromisoformat(latest["d"]) if latest else None,
            trend=trend, forecast_change_pct=change, forecast_weeks=4 if change is not None else None,
            forecast_confidence=fc_conf,
        )

    def quotes_near(self, crop: str, latitude: float, longitude: float, n: int = 3) -> list[tuple[MarketQuote, dict]]:
        return [(self.quote(crop, m), m) for m in self.nearest_markets(crop, latitude, longitude, n)]
