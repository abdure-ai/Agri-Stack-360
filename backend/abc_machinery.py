"""
abc_machinery.py — ABC machinery and services (milestone A8, docs/abc-pilot-plan.md; spec 2.7).

* Register: machine, kind, ownership (the ABC's own, provided by ATI, rented), registration number, condition,
  rate per hectare and/or per hour, hours available per week.
* Bookings: members (in the app) or staff request ploughing, harvesting, transport, threshing; the coordinator
  assigns a machine and a date. The schedule lists bookings by date, then by kebele and distance from the ABC office so
  one route covers neighbouring plots.
* Job log: hectares or hours, operator, fuel; the charge (rate × hectares or hours, or set by hand) goes to the
  member's account as a service charge (A6); fuel paid in cash is booked as a ledger expense.
* Maintenance: date, work done, cost (ledger expense), next service date (flagged when due).
* Utilisation: hours used in the last 30 days against hours available.
All changes are audited.
"""

from __future__ import annotations

import sqlite3
from datetime import date, datetime, timedelta

from fastapi import HTTPException

from backend import abc_company as core
from backend import abc_finance, admin_areas, audit

KINDS = ("tractor", "combine", "thresher", "truck", "pump", "planter", "sprayer", "other")
SERVICES = ("ploughing", "planting", "spraying", "harvesting", "threshing", "transport", "other")

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_machines (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id           INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    kind             TEXT NOT NULL,
    ownership        TEXT NOT NULL CHECK (ownership IN ('abc','ati_provided','rented')),
    reg_no           TEXT,
    condition        TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good','needs_repair','out_of_service')),
    rate_per_ha_etb  REAL,
    rate_per_hour_etb REAL,
    hours_per_week   REAL NOT NULL DEFAULT 40,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
    note             TEXT,
    created_at       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_machine_bookings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id         INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id      INTEGER NOT NULL REFERENCES users(id),
    service        TEXT NOT NULL,
    farm_id        INTEGER REFERENCES farms(id) ON DELETE SET NULL,
    area_ha        REAL,
    requested_date TEXT NOT NULL,
    machine_id     INTEGER REFERENCES abc_machines(id),
    scheduled_date TEXT,
    status         TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','scheduled','done','cancelled')),
    requested_by   TEXT NOT NULL CHECK (requested_by IN ('member','staff')),
    note           TEXT,
    created_at     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_machine_jobs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id       INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    machine_id   INTEGER NOT NULL REFERENCES abc_machines(id),
    booking_id   INTEGER REFERENCES abc_machine_bookings(id),
    farmer_id    INTEGER REFERENCES users(id),
    job_date     TEXT NOT NULL,
    service      TEXT NOT NULL,
    hectares     REAL,
    hours        REAL,
    operator     TEXT,
    fuel_litres  REAL,
    fuel_cost_etb REAL,
    charge_etb   REAL NOT NULL DEFAULT 0,
    member_txn_id INTEGER,
    note         TEXT,
    recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_machine_maintenance (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id   INTEGER NOT NULL REFERENCES abc_machines(id) ON DELETE CASCADE,
    service_date TEXT NOT NULL,
    description  TEXT NOT NULL,
    parts        TEXT,
    cost_etb     REAL NOT NULL DEFAULT 0,
    next_due     TEXT,
    recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at  TEXT NOT NULL
);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return datetime.now().isoformat(sep=" ", timespec="seconds")


def _rows(conn, sql, params=()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _audit(conn, actor, action, org, before, after, status=200):
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action=action, target_type="abc", target_id=org,
                 status=status, detail={"before": before, "after": after})


def _machine(conn, org_id: int, machine_id: int) -> dict:
    rows = _rows(conn, "SELECT * FROM abc_machines WHERE id=? AND org_id=?", (machine_id, org_id))
    if not rows:
        raise HTTPException(404, "Machine not found")
    return rows[0]


def _member(conn, org_id: int, farmer_id: int) -> None:
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'", (org_id, farmer_id)).fetchone():
        raise HTTPException(400, "Services are for active members.")


# ── Register ──────────────────────────────────────────────────────────────────

def add_machine(conn, ctx: core.AbcContext, actor: dict, data: dict) -> dict:
    org = ctx.org["id"]
    if data["kind"] not in KINDS:
        raise HTTPException(400, f"Unknown machine kind '{data['kind']}'.")
    with conn:
        mid = conn.execute("""INSERT INTO abc_machines (org_id, name, kind, ownership, reg_no, condition, rate_per_ha_etb,
                              rate_per_hour_etb, hours_per_week, note, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                           (org, data["name"].strip(), data["kind"], data["ownership"], data.get("reg_no"),
                            data.get("condition") or "good", data.get("rate_per_ha_etb"), data.get("rate_per_hour_etb"),
                            data.get("hours_per_week") or 40, data.get("note"), _now())).lastrowid
    _audit(conn, actor, "abc.machine.add", org, None, {"machine_id": mid, **{k: data.get(k) for k in ("name", "kind", "ownership")}}, 201)
    return _machine(conn, org, mid)


def update_machine(conn, ctx: core.AbcContext, actor: dict, machine_id: int, changes: dict) -> dict:
    org = ctx.org["id"]
    before = _machine(conn, org, machine_id)
    allowed = ("name", "reg_no", "condition", "rate_per_ha_etb", "rate_per_hour_etb", "hours_per_week", "status", "note")
    sets = {k: v for k, v in changes.items() if k in allowed and before.get(k) != v}
    if sets:
        with conn:
            conn.execute(f"UPDATE abc_machines SET {', '.join(f'{k}=?' for k in sets)} WHERE id=?", (*sets.values(), machine_id))
        _audit(conn, actor, "abc.machine.update", org, {"machine_id": machine_id, **{k: before[k] for k in sets}},
               {"machine_id": machine_id, **sets})
    return _machine(conn, org, machine_id)


def machines(conn, org_id: int, today: date | None = None) -> list[dict]:
    today = today or date.today()
    since = (today - timedelta(days=30)).isoformat()
    out = []
    for m in _rows(conn, "SELECT * FROM abc_machines WHERE org_id=? ORDER BY status, name", (org_id,)):
        used = conn.execute("SELECT COALESCE(SUM(hours), 0), COALESCE(SUM(hectares), 0), COUNT(*) FROM abc_machine_jobs "
                            "WHERE machine_id=? AND job_date >= ?", (m["id"], since)).fetchone()
        available = (m["hours_per_week"] or 0) * 30 / 7
        last = _rows(conn, "SELECT service_date, next_due FROM abc_machine_maintenance WHERE machine_id=? "
                           "ORDER BY service_date DESC LIMIT 1", (m["id"],))
        due = last[0]["next_due"] if last else None
        out.append({**m, "hours_30d": round(used[0], 1), "hectares_30d": round(used[1], 2), "jobs_30d": used[2],
                    "available_hours_30d": round(available, 1),
                    "utilisation_percent": round(100 * used[0] / available, 1) if available else None,
                    "last_service": last[0]["service_date"] if last else None, "next_service": due,
                    "service_due": bool(due and due <= today.isoformat())})
    return out


# ── Bookings ──────────────────────────────────────────────────────────────────

def book(conn, org_id: int, actor: dict, *, farmer_id: int, service: str, farm_id: int | None, area_ha: float | None,
         requested_date: date, by: str, note: str | None) -> dict:
    _member(conn, org_id, farmer_id)
    if service not in SERVICES:
        raise HTTPException(400, f"Unknown service '{service}'.")
    if farm_id:
        f = conn.execute("SELECT user_id, area_ha FROM farms WHERE id=?", (farm_id,)).fetchone()
        if not f or f[0] != farmer_id:
            raise HTTPException(400, "That plot is not this member's.")
        area_ha = area_ha or f[1]
    if requested_date < date.today():
        raise HTTPException(400, "Choose a date from today on.")
    with conn:
        bid = conn.execute("""INSERT INTO abc_machine_bookings (org_id, farmer_id, service, farm_id, area_ha, requested_date,
                              requested_by, note, created_at) VALUES (?,?,?,?,?,?,?,?,?)""",
                           (org_id, farmer_id, service, farm_id, area_ha, requested_date.isoformat(), by, note, _now())).lastrowid
    _audit(conn, actor, "abc.booking.request", org_id, None, {"booking_id": bid, "farmer_id": farmer_id, "service": service,
                                                             "date": requested_date.isoformat(), "by": by}, 201)
    return {"booking_id": bid}


def schedule(conn, ctx: core.AbcContext, actor: dict, booking_id: int, machine_id: int, scheduled_date: date) -> dict:
    org = ctx.org["id"]
    b = _rows(conn, "SELECT * FROM abc_machine_bookings WHERE id=? AND org_id=?", (booking_id, org))
    if not b or b[0]["status"] not in ("requested", "scheduled"):
        raise HTTPException(404, "Open booking not found")
    m = _machine(conn, org, machine_id)
    if m["status"] != "active" or m["condition"] == "out_of_service":
        raise HTTPException(400, "This machine is not available (retired or out of service).")
    with conn:
        conn.execute("UPDATE abc_machine_bookings SET machine_id=?, scheduled_date=?, status='scheduled' WHERE id=?",
                     (machine_id, scheduled_date.isoformat(), booking_id))
    _audit(conn, actor, "abc.booking.schedule", org, {"booking_id": booking_id, "status": b[0]["status"]},
           {"booking_id": booking_id, "machine_id": machine_id, "date": scheduled_date.isoformat()})
    return bookings(conn, org, booking_id=booking_id)[0]


def cancel_booking(conn, org_id: int, actor: dict, booking_id: int, member_only: bool) -> None:
    b = _rows(conn, "SELECT * FROM abc_machine_bookings WHERE id=? AND org_id=?", (booking_id, org_id))
    if not b or (member_only and b[0]["farmer_id"] != actor["id"]):
        raise HTTPException(404, "Booking not found")
    if b[0]["status"] in ("done", "cancelled"):
        raise HTTPException(400, "This booking is closed.")
    with conn:
        conn.execute("UPDATE abc_machine_bookings SET status='cancelled' WHERE id=?", (booking_id,))
    _audit(conn, actor, "abc.booking.cancel", org_id, {"booking_id": booking_id, "status": b[0]["status"]},
           {"booking_id": booking_id, "status": "cancelled"})


def bookings(conn, org_id: int, *, booking_id: int | None = None, farmer_id: int | None = None,
             include_closed: bool = False) -> list[dict]:
    where, params = "WHERE b.org_id=?", [org_id]
    if booking_id:
        where += " AND b.id=?"
        params.append(booking_id)
    if farmer_id:
        where += " AND b.farmer_id=?"
        params.append(farmer_id)
    if not include_closed and not booking_id:
        where += " AND b.status IN ('requested','scheduled')"
    rows = _rows(conn, f"""SELECT b.*, u.name, u.phone, p.kebele, p.latitude, p.longitude, w.latitude AS wlat,
                                  w.longitude AS wlon, f.field_name, m.name AS machine
                           FROM abc_machine_bookings b JOIN users u ON u.id = b.farmer_id
                           LEFT JOIN farmer_profiles p ON p.user_id = u.id
                           LEFT JOIN admin_areas w ON w.pcode = u.woreda_pcode
                           LEFT JOIN farms f ON f.id = b.farm_id LEFT JOIN abc_machines m ON m.id = b.machine_id
                           {where}""", tuple(params))
    office = _rows(conn, "SELECT woreda_pcode FROM organisations WHERE id=?", (org_id,))
    base = admin_areas.get_area(conn, office[0]["woreda_pcode"]) if office and office[0]["woreda_pcode"] else None
    for r in rows:
        lat, lon = (r["latitude"], r["longitude"]) if r["latitude"] is not None else (r["wlat"], r["wlon"])
        r["distance_km"] = (round(admin_areas.distance_km(base.latitude, base.longitude, lat, lon), 1)
                            if base and base.latitude is not None and lat is not None else None)
        for k in ("latitude", "longitude", "wlat", "wlon"):
            r.pop(k, None)
    # Route order: by day, then kebele, then distance from the ABC office.
    return sorted(rows, key=lambda r: (r["scheduled_date"] or r["requested_date"], r["kebele"] or "",
                                       r["distance_km"] if r["distance_km"] is not None else 1e9, r["id"]))


# ── Jobs and maintenance ──────────────────────────────────────────────────────

def log_job(conn, ctx: core.AbcContext, actor: dict, *, machine_id: int, booking_id: int | None, farmer_id: int | None,
            job_date: date, service: str, hectares: float | None, hours: float | None, operator: str | None,
            fuel_litres: float | None, fuel_cost_etb: float | None, charge_etb: float | None, note: str | None) -> dict:
    org = ctx.org["id"]
    m = _machine(conn, org, machine_id)
    if booking_id:
        b = _rows(conn, "SELECT * FROM abc_machine_bookings WHERE id=? AND org_id=?", (booking_id, org))
        if not b or b[0]["status"] in ("done", "cancelled"):
            raise HTTPException(400, "That booking is not open.")
        farmer_id = farmer_id or b[0]["farmer_id"]
        service = service or b[0]["service"]
    if farmer_id:
        _member(conn, org, farmer_id)
    if not hectares and not hours:
        raise HTTPException(400, "Give the hectares or the hours worked.")
    if charge_etb is None:
        charge_etb = round((m["rate_per_ha_etb"] or 0) * (hectares or 0) if hectares and m["rate_per_ha_etb"]
                           else (m["rate_per_hour_etb"] or 0) * (hours or 0), 2)
    with conn:
        jid = conn.execute("""INSERT INTO abc_machine_jobs (org_id, machine_id, booking_id, farmer_id, job_date, service,
                              hectares, hours, operator, fuel_litres, fuel_cost_etb, charge_etb, note, recorded_by, recorded_at)
                              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                           (org, machine_id, booking_id, farmer_id, job_date.isoformat(), service, hectares, hours, operator,
                            fuel_litres, fuel_cost_etb, charge_etb, note, actor["id"], _now())).lastrowid
        if booking_id:
            conn.execute("UPDATE abc_machine_bookings SET status='done', machine_id=COALESCE(machine_id, ?) WHERE id=?",
                         (machine_id, booking_id))
    txn = None
    if farmer_id and charge_etb > 0:
        what = f"{service} · {m['name']} · " + (f"{hectares:g} ha" if hectares else f"{hours:g} h")
        txn = abc_finance.member_txn(conn, ctx, actor, farmer_id=farmer_id, kind="service_charge", amount_etb=charge_etb,
                                     description=what, txn_date=job_date, source="machinery", source_id=jid)["txn_id"]
        with conn:
            conn.execute("UPDATE abc_machine_jobs SET member_txn_id=? WHERE id=?", (txn, jid))
    if fuel_cost_etb:
        abc_finance.add_entry(conn, ctx, actor, kind="expense", category="fuel", amount_etb=fuel_cost_etb, entry_date=job_date,
                              description=f"{m['name']}: {fuel_litres or 0:g} L", source="machinery", source_id=jid)
    _audit(conn, actor, "abc.machine.job", org, None, {"job_id": jid, "machine_id": machine_id, "farmer_id": farmer_id,
                                                      "hectares": hectares, "hours": hours, "charge_etb": charge_etb}, 201)
    return {"job_id": jid, "charge_etb": charge_etb, "member_txn_id": txn}


def jobs(conn, org_id: int, machine_id: int | None = None) -> list[dict]:
    return _rows(conn, f"""SELECT j.*, m.name AS machine, u.name AS member FROM abc_machine_jobs j
                           JOIN abc_machines m ON m.id = j.machine_id LEFT JOIN users u ON u.id = j.farmer_id
                           WHERE j.org_id=? {"AND j.machine_id=?" if machine_id else ""} ORDER BY j.job_date DESC, j.id DESC
                           LIMIT 300""", (org_id, machine_id) if machine_id else (org_id,))


def maintenance(conn, ctx: core.AbcContext, actor: dict, *, machine_id: int, service_date: date, description: str,
                parts: str | None, cost_etb: float, next_due: date | None, condition: str | None) -> dict:
    org = ctx.org["id"]
    m = _machine(conn, org, machine_id)
    with conn:
        mid = conn.execute("""INSERT INTO abc_machine_maintenance (machine_id, service_date, description, parts, cost_etb,
                              next_due, recorded_by, recorded_at) VALUES (?,?,?,?,?,?,?,?)""",
                           (machine_id, service_date.isoformat(), description, parts, cost_etb,
                            next_due.isoformat() if next_due else None, actor["id"], _now())).lastrowid
        if condition:
            conn.execute("UPDATE abc_machines SET condition=? WHERE id=?", (condition, machine_id))
    if cost_etb:
        abc_finance.add_entry(conn, ctx, actor, kind="expense", category="machinery maintenance", amount_etb=cost_etb,
                              entry_date=service_date, description=f"{m['name']}: {description}", source="machinery",
                              source_id=mid)
    _audit(conn, actor, "abc.machine.maintenance", org, None, {"machine_id": machine_id, "cost_etb": cost_etb,
                                                              "next_due": next_due.isoformat() if next_due else None}, 201)
    return {"maintenance_id": mid}


def maintenance_log(conn, org_id: int, machine_id: int) -> list[dict]:
    _machine(conn, org_id, machine_id)
    return _rows(conn, "SELECT * FROM abc_machine_maintenance WHERE machine_id=? ORDER BY service_date DESC", (machine_id,))
