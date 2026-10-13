"""
maps.py — Map layers (web map page and mobile API): diseases, crop markets, agro-dealer shops, farms.

Every layer follows the platform's existing rules:
  * Disease: outbreak hotspots per woreda (reports.outbreak_hotspots): counts at the woreda centre, never farm
    points, 1-4 shown as "<5". Admins see the country, government users their area, everyone else their region.
  * Markets (market:read): NMIS crop markets with the latest retail price of one crop. Markets whose name
    could not be matched to a woreda sit at their region's centre and are marked approximate.
  * Shops (inputs:verify, supplier, dealer or regulator): active agro-dealer shops at their woreda centre
    (marked approximate), verified-seller badge, products in stock with the shop's price. The regulator also gets
    counterfeit warnings and fake reports per woreda.
  * Farms: a farmer sees their own farm point; a DA (da:work) the farmers they work with who gave data consent,
    with the visit priority; admins and government users only counts per woreda (small numbers hidden).
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta

from backend import reports
from backend.database import query as nmis_query
from backend.permissions import P, has_permission

LAYERS = ("disease", "markets", "shops", "farms")
MARKET_MAX_AGE_DAYS = 120


def _rows(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _can(user: dict, *perms: str) -> bool:
    return any(has_permission(user["role"], p) for p in perms)


def available(user: dict) -> list[str]:
    out = ["disease"]
    if _can(user, P.MARKET_READ):
        out.append("markets")
    if _can(user, P.INPUTS_VERIFY, P.SUPPLIER_MANAGE, P.DEALER_MANAGE, P.REGISTRY_MANAGE):
        out.append("shops")
    if _can(user, P.FARMS_MANAGE_OWN, P.DA_WORK, P.FARMS_MANAGE_ALL, P.REPORTS_READ):
        out.append("farms")
    return out


def area_scope(user: dict) -> str | None:
    """P-code prefix of the area the user's aggregated layers cover; '' = nothing (no region on the account)."""
    if has_permission(user["role"], P.FARMS_MANAGE_ALL):
        return None
    if user["role"] == "government":
        return user.get("woreda_pcode") or user.get("zone_pcode") or user.get("region_pcode") or None
    return user.get("region_pcode") or ""


def disease_layer(conn: sqlite3.Connection, user: dict, days: int, now: datetime, names: dict[str, str]) -> dict:
    area = area_scope(user)
    rows = [] if area == "" else reports.outbreak_hotspots(conn, area or None, days, now)
    for r in rows:
        r["disease"] = names.get(r["disease_key"], r["disease_key"])
    return {"days": days, "area": area or None, "hotspots": [r for r in rows if r["latitude"] is not None]}


def market_crops() -> list[str]:
    return [r["crop_name"] for r in nmis_query("SELECT crop_name FROM crops ORDER BY crop_name")]


def markets_layer(conn: sqlite3.Connection, crop: str, today) -> dict:
    since = (today - timedelta(days=MARKET_MAX_AGE_DAYS)).isoformat()
    latest = nmis_query(
        """SELECT p.market_id, MAX(p.collection_date) AS d FROM prices p JOIN varieties v ON v.id = p.variety_id
           JOIN crops c ON c.id = v.crop_id WHERE lower(c.crop_name) = lower(?) AND p.collection_date >= ?
             AND p.price_retail_min IS NOT NULL GROUP BY p.market_id""", (crop, since))
    prices = {}
    for r in latest:
        q = nmis_query(
            """SELECT AVG((p.price_retail_min + p.price_retail_max) / 2.0) AS price, MAX(v.unit) AS unit
               FROM prices p JOIN varieties v ON v.id = p.variety_id JOIN crops c ON c.id = v.crop_id
               WHERE p.market_id = ? AND lower(c.crop_name) = lower(?) AND p.collection_date = ?
                 AND p.price_retail_min IS NOT NULL""", (r["market_id"], crop, r["d"]))
        if q and q[0]["price"]:
            unit = q[0]["unit"] or "Quintal"
            per_q = q[0]["price"] * (100 if unit.lower() in ("kg", "kilogram") else 1)   # 1 quintal = 100 kg
            prices[r["market_id"]] = (round(q[0]["price"]), unit, r["d"], round(per_q))
    out = []
    for m in _rows(conn, "SELECT market_id, market_name, nmis_region, latitude, longitude, method FROM market_locations "
                         "WHERE latitude IS NOT NULL"):
        p = prices.get(m["market_id"])
        out.append({"id": m["market_id"], "name": m["market_name"], "region": m["nmis_region"],
                    "latitude": m["latitude"], "longitude": m["longitude"],
                    "approximate": m["method"] == "region_centre",
                    "price_etb": p[0] if p else None, "unit": p[1] if p else None, "date": p[2] if p else None,
                    "price_per_quintal": p[3] if p else None})
    priced = sorted(m["price_per_quintal"] for m in out if m["price_per_quintal"])
    # Colour scale from the 5th to the 95th percentile: one mistyped report (e.g. a kg price entered per
    # quintal) must not squeeze every other market into one colour. Prices outside get the end colours.
    lo, hi = ((priced[len(priced) // 20], priced[-1 - len(priced) // 20]) if len(priced) >= 10
              else (priced[0], priced[-1]) if priced else (None, None))
    return {"crop": crop, "markets": out, "price_min": lo, "price_max": hi, "source": "NMIS market price data"}


def _spread(points: list[dict]) -> None:
    """Shops in the same woreda sit on the same centre: fan them out a little so each can be clicked."""
    seen: dict[tuple, int] = {}
    for p in points:
        key = (p["latitude"], p["longitude"])
        i = seen.get(key, 0)
        seen[key] = i + 1
        if i:
            p["latitude"] += 0.012 * ((i % 3) - 1 or 1)
            p["longitude"] += 0.012 * (1 + i // 3)


def shops_layer(conn: sqlite3.Connection, user: dict, days: int, now: datetime) -> dict:
    shops = _rows(conn, """SELECT o.id, o.name, o.phone, o.verified, o.woreda_pcode, w.name AS woreda,
                                  w.latitude, w.longitude FROM organisations o JOIN admin_areas w ON w.pcode = o.woreda_pcode
                           WHERE o.type = 'agro_dealer' AND o.status = 'active' AND w.latitude IS NOT NULL
                           ORDER BY o.name""")
    stock = _rows(conn, """SELECT sp.org_id, p.product_name, sp.price_etb, sp.pack_size, sp.price_is_sample
                           FROM shop_products sp JOIN approved_products p ON p.id = sp.product_id
                           WHERE sp.in_stock = 1 AND p.status = 'registered' ORDER BY p.product_name""")
    by_shop: dict[int, list] = {}
    for s in stock:
        by_shop.setdefault(s["org_id"], []).append({k: s[k] for k in ("product_name", "price_etb", "pack_size")} |
                                                  {"price_is_sample": bool(s["price_is_sample"])})
    out = [{"id": s["id"], "name": s["name"], "phone": s["phone"], "verified": bool(s["verified"]),
            "woreda": s["woreda"], "latitude": s["latitude"], "longitude": s["longitude"], "approximate": True,
            "products": by_shop.get(s["id"], [])} for s in shops]
    _spread(out)
    layer = {"shops": out}
    if _can(user, P.REGISTRY_MANAGE):
        since = (now - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")
        per: dict[str, dict] = {}
        for r in _rows(conn, """SELECT woreda_pcode AS pcode, COUNT(*) AS n FROM verifications WHERE created_at >= ?
                                AND result = 'warning' AND woreda_pcode IS NOT NULL GROUP BY woreda_pcode""", (since,)):
            per.setdefault(r["pcode"], {"warnings": 0, "fake_reports": 0})["warnings"] = r["n"]
        for r in _rows(conn, """SELECT woreda_pcode AS pcode, COUNT(*) AS n FROM fake_reports WHERE created_at >= ?
                                AND woreda_pcode IS NOT NULL GROUP BY woreda_pcode""", (since,)):
            per.setdefault(r["pcode"], {"warnings": 0, "fake_reports": 0})["fake_reports"] = r["n"]
        areas = {a["pcode"]: a for a in _rows(
            conn, f"SELECT pcode, name, latitude, longitude FROM admin_areas WHERE pcode IN ({','.join('?' * len(per)) or "''"})",
            tuple(per))}
        layer["counterfeits"] = [{"pcode": k, "woreda": areas[k]["name"], "latitude": areas[k]["latitude"],
                                  "longitude": areas[k]["longitude"], **v} for k, v in per.items()
                                 if k in areas and areas[k]["latitude"] is not None]
    return layer


def farms_counts(conn: sqlite3.Connection, area: str | None) -> list[dict]:
    """Farmers, farms and hectares per woreda (government / admin view), small numbers hidden."""
    where, params = ("AND u.woreda_pcode LIKE ?", (f"{area}%",)) if area else ("", ())
    rows = _rows(conn, f"""SELECT u.woreda_pcode AS pcode, w.name AS woreda, w.latitude, w.longitude,
                                  COUNT(DISTINCT u.id) AS farmers, COUNT(f.id) AS farms, COALESCE(SUM(f.area_ha), 0) AS ha
                           FROM users u JOIN admin_areas w ON w.pcode = u.woreda_pcode
                           LEFT JOIN farms f ON f.user_id = u.id
                           WHERE u.role = 'farmer' AND u.is_active = 1 AND w.latitude IS NOT NULL {where}
                           GROUP BY u.woreda_pcode""", params)
    return [{"pcode": r["pcode"], "woreda": r["woreda"], "latitude": r["latitude"], "longitude": r["longitude"],
             "farmers": reports.suppress(r["farmers"]), "farms": reports.suppress(r["farms"]),
             "hectares": round(r["ha"], 1) if r["farmers"] >= reports.SUPPRESS_BELOW else None,
             "band": "high" if r["farmers"] >= 20 else "medium" if r["farmers"] >= 5 else "low"} for r in rows]


def farmer_points(conn: sqlite3.Connection, farmer_ids: list[int]) -> dict[int, dict]:
    """Farm point per farmer: the profile's GPS point, else the woreda centre (approximate)."""
    if not farmer_ids:
        return {}
    marks = ",".join("?" * len(farmer_ids))
    rows = _rows(conn, f"""SELECT u.id, p.latitude AS lat, p.longitude AS lon, w.latitude AS wlat, w.longitude AS wlon,
                                  w.name AS woreda
                           FROM users u LEFT JOIN farmer_profiles p ON p.user_id = u.id
                           LEFT JOIN admin_areas w ON w.pcode = u.woreda_pcode WHERE u.id IN ({marks})""",
                 tuple(farmer_ids))
    out = {}
    for r in rows:
        if r["lat"] is not None:
            out[r["id"]] = {"latitude": r["lat"], "longitude": r["lon"], "approximate": False, "woreda": r["woreda"]}
        elif r["wlat"] is not None:
            out[r["id"]] = {"latitude": r["wlat"], "longitude": r["wlon"], "approximate": True, "woreda": r["woreda"]}
    return out


def farms_of(conn: sqlite3.Connection, farmer_ids: list[int]) -> dict[int, list[dict]]:
    if not farmer_ids:
        return {}
    marks = ",".join("?" * len(farmer_ids))
    out: dict[int, list[dict]] = {}
    for f in _rows(conn, f"""SELECT user_id, field_name, crop_name, area_ha, irrigated, status FROM farms
                             WHERE user_id IN ({marks}) ORDER BY id""", tuple(farmer_ids)):
        out.setdefault(f["user_id"], []).append({k: f[k] for k in ("field_name", "crop_name", "area_ha", "irrigated",
                                                                    "status")})
    return out
