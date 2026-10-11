"""
admin_areas.py — Ethiopian administrative areas (region > zone > woreda).

Source: data/reference/eth_admin_boundaries.xlsx (official P-coded admin
boundaries, version v04, valid from 2025-01-01). Import or refresh with
    python scripts/import_admin_boundaries.py
Every address in the platform (users, farms, advisory, markets) refers to an
area by P-code, e.g. ET031001 = Dewa Cheffa woreda, Oromo Nationality
Administration zone, Amhara region. Kebeles are not in the dataset and stay
free text until the ATI Farmer Profile System provides them.

NMIS market data still uses the region names from before the 2023 SNNP split,
so NMIS_REGION maps official regions to the name NMIS uses.
"""

from __future__ import annotations

import math
import sqlite3
from dataclasses import dataclass
from pathlib import Path

SOURCE_FILE = Path(__file__).resolve().parents[1] / "data" / "reference" / "eth_admin_boundaries.xlsx"

LEVEL_NAMES = {1: "region", 2: "zone", 3: "woreda"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS admin_areas (
    pcode        TEXT PRIMARY KEY,      -- e.g. ET03, ET0310, ET031001
    level        INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
    name         TEXT NOT NULL,
    parent_pcode TEXT REFERENCES admin_areas(pcode),
    region_pcode TEXT NOT NULL,
    latitude     REAL,
    longitude    REAL,
    area_sqkm    REAL,
    version      TEXT,
    valid_on     TEXT
);
CREATE INDEX IF NOT EXISTS ix_admin_areas_parent ON admin_areas(parent_pcode, name);
CREATE INDEX IF NOT EXISTS ix_admin_areas_name ON admin_areas(name);
"""

# Official region name -> region name used in NMIS price data (None = no NMIS data).
NMIS_REGION = {
    "Tigray": "Tigray",
    "Amhara": "Amhara",
    "Oromia": "Oromia",
    "Sidama": "Sidama",
    "Central Ethiopia": "SNNP",
    "South Ethiopia": "SNNP",
    "South West Ethiopia": "South West",
}

# Columns added to users so addresses are stored as P-codes.
_USER_COLUMNS = ("region_pcode", "zone_pcode", "woreda_pcode")


@dataclass
class Area:
    pcode: str
    level: int
    name: str
    parent_pcode: str | None
    region_pcode: str
    latitude: float | None
    longitude: float | None

    @property
    def level_name(self) -> str:
        return LEVEL_NAMES[self.level]


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    existing = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
    for col in _USER_COLUMNS:
        if col not in existing:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT REFERENCES admin_areas(pcode)")
    conn.commit()


def import_boundaries(conn: sqlite3.Connection, xlsx: Path = SOURCE_FILE) -> dict[str, int]:
    """Load regions, zones and woredas (with centre points) from the boundaries workbook."""
    import pandas as pd  # only needed for import

    book = pd.ExcelFile(xlsx)
    points = book.parse("eth_adminpoints")
    centre: dict[str, tuple[float, float]] = {}
    for _, p in points.iterrows():
        lvl = int(p["admin_level"])
        if lvl in (1, 2, 3):
            pcode = p[f"adm{lvl}_pcode"]
            if isinstance(pcode, str):
                centre[pcode] = (float(p["y_coord"]), float(p["x_coord"]))

    rows = []
    for lvl in (1, 2, 3):
        df = book.parse(f"eth_admin{lvl}")
        for _, r in df.iterrows():
            pcode = r[f"adm{lvl}_pcode"]
            lat, lon = centre.get(pcode, (None, None))
            rows.append((
                pcode, lvl, str(r[f"adm{lvl}_name"]).strip(),
                r[f"adm{lvl - 1}_pcode"] if lvl > 1 else None,
                r["adm1_pcode"], lat, lon,
                float(r["area_sqkm"]) if r.get("area_sqkm") == r.get("area_sqkm") else None,
                str(r.get("version") or ""), str(r.get("valid_on") or "")[:10],
            ))

    ensure_schema(conn)
    with conn:
        conn.executemany(
            """INSERT INTO admin_areas (pcode, level, name, parent_pcode, region_pcode, latitude, longitude,
                                        area_sqkm, version, valid_on)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(pcode) DO UPDATE SET level=excluded.level, name=excluded.name,
                 parent_pcode=excluded.parent_pcode, region_pcode=excluded.region_pcode,
                 latitude=excluded.latitude, longitude=excluded.longitude, area_sqkm=excluded.area_sqkm,
                 version=excluded.version, valid_on=excluded.valid_on""",
            rows,
        )
    counts = {LEVEL_NAMES[l]: sum(1 for r in rows if r[1] == l) for l in (1, 2, 3)}
    counts["with_centre_point"] = sum(1 for r in rows if r[5] is not None)
    return counts


# ── Lookups ────────────────────────────────────────────────────────────────────

def _query(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    """Rows as sqlite3.Row without changing the (shared) connection's row_factory."""
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    return cur.execute(sql, params).fetchall()


def _row(r) -> Area:
    return Area(r["pcode"], r["level"], r["name"], r["parent_pcode"], r["region_pcode"], r["latitude"], r["longitude"])


def get_area(conn: sqlite3.Connection, pcode: str) -> Area | None:
    rows = _query(conn, "SELECT * FROM admin_areas WHERE pcode=?", (pcode,))
    return _row(rows[0]) if rows else None


def children(conn: sqlite3.Connection, parent_pcode: str | None) -> list[Area]:
    if parent_pcode is None:
        rows = _query(conn, "SELECT * FROM admin_areas WHERE level=1 ORDER BY name")
    else:
        rows = _query(conn, "SELECT * FROM admin_areas WHERE parent_pcode=? ORDER BY name", (parent_pcode,))
    return [_row(r) for r in rows]


def search(conn: sqlite3.Connection, q: str, limit: int = 20) -> list[Area]:
    rows = _query(conn, "SELECT * FROM admin_areas WHERE name LIKE ? ORDER BY level, name LIMIT ?", (f"%{q}%", limit))
    return [_row(r) for r in rows]


def lineage(conn: sqlite3.Connection, pcode: str) -> list[Area]:
    """[region, zone, woreda] down to the given area."""
    out: list[Area] = []
    current = get_area(conn, pcode)
    while current is not None:
        out.insert(0, current)
        current = get_area(conn, current.parent_pcode) if current.parent_pcode else None
    return out


def nmis_region(region_name: str | None) -> str | None:
    """Official region name -> NMIS region name (for market data)."""
    if not region_name:
        return None
    return NMIS_REGION.get(region_name, region_name if region_name in NMIS_REGION.values() else None)


def address_fields(conn: sqlite3.Connection, pcode: str) -> dict:
    """users columns for an address chosen as a region, zone or woreda P-code.

    `region` keeps the NMIS region name (market data and agent scoping use it);
    regions without NMIS data keep their official name. Raises LookupError.
    """
    chain = lineage(conn, pcode)
    if not chain:
        raise LookupError(f"Unknown area P-code: {pcode}")
    names = [a.name for a in chain] + [None, None]
    codes = [a.pcode for a in chain] + [None, None]
    return {
        "region": nmis_region(names[0]) or names[0], "zone": names[1], "woreda": names[2],
        "region_pcode": codes[0], "zone_pcode": codes[1], "woreda_pcode": codes[2],
    }


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance (haversine)."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
