"""
abc_portfolio.py — ATI and government portfolio view of ABCs (milestone A10, docs/abc-pilot-plan.md; spec 2.12).

Read-only, aggregates only: no member names, phones or IDs, ever. Counts of 1-4 are shown as "<5" (same rule as the
area reports). ATI programme officers and admins see every ABC; government users the ABCs in their area (woreda, zone
or region on their account; none = national).

Per ABC: type, status, location, members, women and youth share, shares and capital pledged / paid, subscribed share,
machinery use, input stock blocked by the product check, and compliance alerts driven by the ABC rules:
  members_below_minimum, capital_below_minimum, overdue_pledges, no_assembly_12_months, minutes_unapproved,
  stock_blocked, machinery_out_of_service.
"""

from __future__ import annotations

import sqlite3
from datetime import date, timedelta

from backend import abc_company as core
from backend import reports
from backend.permissions import P, has_permission


def _rows(conn, sql, params=()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def scope(user: dict) -> str | None:
    """P-code prefix the user may see; None = the whole country."""
    if has_permission(user["role"], P.ORGS_MANAGE) or user["role"] == "ati_officer":
        return None
    return user.get("woreda_pcode") or user.get("zone_pcode") or user.get("region_pcode") or None


def _count(conn, sql, params) -> int:
    return int(conn.execute(sql, params).fetchone()[0] or 0)


def abc_row(conn: sqlite3.Connection, org: dict, today: date) -> dict:
    oid = org["id"]
    p = core.profile(conn, oid)
    t = p["abc_type"]
    members = _count(conn, "SELECT COUNT(*) FROM abc_members WHERE org_id=? AND status='active'", (oid,))
    def share(column: str, value: str) -> tuple[int, int]:
        """(matching, recorded) among active members whose `column` is recorded."""
        row = conn.execute(f"""SELECT SUM(d.{column} = ?), COUNT(d.{column}) FROM abc_members m JOIN abc_member_details d
                               ON d.org_id=m.org_id AND d.farmer_id=m.farmer_id
                               WHERE m.org_id=? AND m.status='active'""", (value, oid)).fetchone()
        return int(row[0] or 0), int(row[1] or 0)

    women, with_gender = share("gender", "female")
    youth, with_age = share("age_group", "15-29")
    paid = float(conn.execute("SELECT COALESCE(SUM(amount_etb), 0) FROM abc_share_payments WHERE org_id=? AND status='confirmed'",
                              (oid,)).fetchone()[0])
    pledged_value = float(conn.execute("SELECT COALESCE(SUM(shares * share_value), 0) FROM abc_share_pledges WHERE org_id=? "
                                       "AND status != 'cancelled'", (oid,)).fetchone()[0])
    issued = _count(conn, "SELECT COALESCE(SUM(shares), 0) FROM abc_share_ledger WHERE org_id=?", (oid,))
    overdue = _count(conn, """SELECT COUNT(*) FROM abc_share_pledges s WHERE s.org_id=? AND s.status='open'
                              AND s.due_on IS NOT NULL AND s.due_on < ?""", (oid, today.isoformat()))
    since = (today - timedelta(days=30)).isoformat()
    mach = _rows(conn, "SELECT id, hours_per_week, condition, status FROM abc_machines WHERE org_id=? AND status='active'", (oid,))
    hours = float(conn.execute("SELECT COALESCE(SUM(hours), 0) FROM abc_machine_jobs WHERE org_id=? AND job_date >= ?",
                               (oid, since)).fetchone()[0])
    hectares = float(conn.execute("SELECT COALESCE(SUM(hectares), 0) FROM abc_machine_jobs WHERE org_id=? AND job_date >= ?",
                                  (oid, since)).fetchone()[0])
    available = sum((m["hours_per_week"] or 0) * 30 / 7 for m in mach)
    blocked = _count(conn, "SELECT COUNT(*) FROM abc_stock_lots WHERE org_id=? AND status='quarantined' AND qty_remaining > 0", (oid,))
    held_ga = conn.execute("SELECT MAX(scheduled_at) FROM abc_meetings WHERE org_id=? AND kind='general_assembly' AND status='held'",
                           (oid,)).fetchone()[0]
    unapproved = _count(conn, "SELECT COUNT(*) FROM abc_meetings WHERE org_id=? AND status='held' AND minutes_status != 'approved'", (oid,))
    min_members = core.rule(conn, "min_founding_members", t).value
    min_capital = core.rule(conn, "min_paid_capital_etb", t).value
    alerts = []
    if members < min_members:
        alerts.append("members_below_minimum")
    if paid < min_capital:
        alerts.append("capital_below_minimum")
    if overdue:
        alerts.append("overdue_pledges")
    if p["status"] == "registered" and (not held_ga or held_ga < (today - timedelta(days=365)).isoformat()):
        alerts.append("no_assembly_12_months")
    if unapproved:
        alerts.append("minutes_unapproved")
    if blocked:
        alerts.append("stock_blocked")
    if any(m["condition"] == "out_of_service" for m in mach):
        alerts.append("machinery_out_of_service")
    offered = p.get("shares_offered")
    return {
        "org_id": oid, "name": org["name"], "abc_type": t, "status": p["status"],
        "woreda": org.get("woreda"), "zone": org.get("zone"), "region": org.get("region"),
        "latitude": org.get("latitude"), "longitude": org.get("longitude"), "woreda_pcode": org.get("woreda_pcode"),
        "members": reports.suppress(members), "members_min": min_members,
        # Share among members whose gender / age group is recorded; None when fewer than 5 are recorded.
        "women_percent": round(100 * women / with_gender, 0) if with_gender >= reports.SUPPRESS_BELOW else None,
        "youth_percent": round(100 * youth / with_age, 0) if with_age >= reports.SUPPRESS_BELOW else None,
        "inclusion_recorded": with_gender,
        "capital_pledged_etb": round(pledged_value, 2), "capital_paid_etb": round(paid, 2), "capital_min_etb": min_capital,
        "shares_issued": issued, "subscribed_percent": round(100 * issued / offered, 1) if offered else None,
        "machines": len(mach), "machine_hours_30d": round(hours, 1), "machine_hectares_30d": round(hectares, 2),
        "machine_utilisation_percent": round(100 * hours / available, 1) if available else None,
        "stock_blocked_lots": blocked, "overdue_pledges": reports.suppress(overdue),
        "last_general_assembly": held_ga[:10] if held_ga else None, "alerts": alerts,
    }


def portfolio(conn: sqlite3.Connection, user: dict, area: str | None = None, today: date | None = None) -> dict:
    today = today or date.today()
    mine = scope(user)
    if area and mine and not area.startswith(mine):
        area = mine
    prefix = area or mine
    where, params = ("AND o.woreda_pcode LIKE ?", (f"{prefix}%",)) if prefix else ("", ())
    orgs = _rows(conn, f"""SELECT o.id, o.name, o.woreda_pcode, w.name AS woreda, z.name AS zone, r.name AS region,
                                  w.latitude, w.longitude
                           FROM organisations o LEFT JOIN admin_areas w ON w.pcode = o.woreda_pcode
                           LEFT JOIN admin_areas z ON z.pcode = w.parent_pcode LEFT JOIN admin_areas r ON r.pcode = w.region_pcode
                           WHERE o.type='abc' AND o.status='active' {where} ORDER BY r.name, z.name, o.name""", params)
    rows = [abc_row(conn, o, today) for o in orgs]
    total_members = sum(_count(conn, "SELECT COUNT(*) FROM abc_members WHERE org_id=? AND status='active'", (r["org_id"],))
                        for r in rows)
    by_status: dict[str, int] = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
    return {"area": prefix, "abcs": rows,
            "totals": {"abcs": len(rows), "by_status": by_status, "members": reports.suppress(total_members),
                       "capital_paid_etb": round(sum(r["capital_paid_etb"] for r in rows), 2),
                       "capital_pledged_etb": round(sum(r["capital_pledged_etb"] for r in rows), 2),
                       "machines": sum(r["machines"] for r in rows),
                       "machine_hectares_30d": round(sum(r["machine_hectares_30d"] for r in rows), 2),
                       "with_alerts": sum(1 for r in rows if r["alerts"])}}
