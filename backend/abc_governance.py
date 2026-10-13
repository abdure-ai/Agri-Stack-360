"""
abc_governance.py — ABC voting weights, meetings, quorum, weighted votes and minutes (milestone A5; spec 2.2, 2.3).

Voting weight (rules 'voting_land_factor' and 'voting_production_factor', user decision 2026-10-13):
    weight = land_factor × member's land ÷ all members' land + production_factor × member's production ÷ all production
Land = the member's registered plots (farms.area_ha). Production = what the ABC recorded for the member for the season
(estimate or delivered, in quintals; produce intake comes in Phase 2). When no production is recorded the land part
counts alone (noted on the snapshot). Weights are frozen in a snapshot; a general assembly uses the snapshot taken
when it was scheduled, so later changes do not move an open vote.

Meetings: general assembly (members, weighted) or board (board members, one vote each). Quorum: present weight ÷ total
weight (general assembly) or present board members ÷ board size, at least the 'quorum_fraction' rule. A motion passes
when weighted 'yes' is more than 'motion_pass_fraction' of the weight cast (yes + no). Votes are entered by the
secretary at the meeting; a member can confirm their recorded vote in the app. Minutes: draft, then approved by the
chair or a board member. Notices go to members in the app and on Telegram. Everything is audited.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime

from fastapi import HTTPException

from backend import abc_company as core
from backend import audit

KINDS = ("general_assembly", "board")
CHOICES = ("yes", "no", "abstain")

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_production (
    org_id       INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id    INTEGER NOT NULL REFERENCES users(id),
    season       TEXT NOT NULL,                  -- e.g. '2018 E.C. irrigated'
    quantity_qt  REAL NOT NULL CHECK (quantity_qt >= 0),
    source       TEXT NOT NULL CHECK (source IN ('estimate','delivered')),
    recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at  TEXT NOT NULL,
    PRIMARY KEY (org_id, farmer_id, season)
);
CREATE TABLE IF NOT EXISTS abc_weight_snapshots (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id             INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    label              TEXT NOT NULL,
    season             TEXT,
    land_factor        REAL NOT NULL,
    production_factor  REAL NOT NULL,
    land_only          INTEGER NOT NULL DEFAULT 0,
    total_land_ha      REAL NOT NULL,
    total_production_qt REAL NOT NULL,
    created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_weights (
    snapshot_id   INTEGER NOT NULL REFERENCES abc_weight_snapshots(id) ON DELETE CASCADE,
    farmer_id     INTEGER NOT NULL REFERENCES users(id),
    land_ha       REAL NOT NULL,
    production_qt REAL NOT NULL,
    weight        REAL NOT NULL,
    PRIMARY KEY (snapshot_id, farmer_id)
);
CREATE TABLE IF NOT EXISTS abc_meetings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id        INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL CHECK (kind IN ('general_assembly','board')),
    title         TEXT NOT NULL,
    scheduled_at  TEXT NOT NULL,
    location      TEXT,
    agenda        TEXT NOT NULL DEFAULT '[]',    -- JSON list of items
    snapshot_id   INTEGER REFERENCES abc_weight_snapshots(id),
    status        TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','held','cancelled')),
    notice_sent_at TEXT,
    minutes       TEXT,
    minutes_status TEXT NOT NULL DEFAULT 'none' CHECK (minutes_status IN ('none','draft','approved')),
    minutes_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    minutes_approved_at TEXT,
    created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_attendance (
    meeting_id  INTEGER NOT NULL REFERENCES abc_meetings(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TEXT NOT NULL,
    PRIMARY KEY (meeting_id, user_id)
);
CREATE TABLE IF NOT EXISTS abc_motions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id  INTEGER NOT NULL REFERENCES abc_meetings(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    text        TEXT,
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    result      TEXT CHECK (result IN ('passed','failed','no_quorum')),
    closed_at   TEXT,
    created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_votes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    motion_id    INTEGER NOT NULL REFERENCES abc_motions(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    choice       TEXT NOT NULL CHECK (choice IN ('yes','no','abstain')),
    weight       REAL NOT NULL,
    entered_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    entered_at   TEXT NOT NULL,
    confirmed_at TEXT,                          -- the member confirmed this vote in the app
    disputed     INTEGER NOT NULL DEFAULT 0,
    UNIQUE (motion_id, user_id)
);
"""

GOV_RULES = {
    "quorum_fraction": [("*", 0.5, "fraction", "platform default: present weight (assembly) or board members (board); "
                                               "set from the by-laws")],
    "motion_pass_fraction": [("*", 0.5, "fraction", "platform default: weighted yes must be more than this share of "
                                                    "yes + no; set from the by-laws")],
}


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    present = {r[0] for r in conn.execute("SELECT DISTINCT key FROM abc_rules")}
    for key, rows in GOV_RULES.items():
        if key in present:
            continue
        for abc_type, value, unit, note in rows:
            conn.execute("""INSERT INTO abc_rules (key, abc_type, value, unit, effective_from, source, verification_status,
                            note, created_at) VALUES (?,?,?,?,?,?, 'platform_default', ?, ?)""",
                         (key, abc_type, value, unit, core.DRAFT_FROM,
                          "Agri-Stack 360 platform default, chosen by the ABC programme owner", note, _now()))
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


# ── Production and voting weights ─────────────────────────────────────────────

def record_production(conn, ctx: core.AbcContext, actor: dict, farmer_id: int, season: str, quantity_qt: float,
                      source: str) -> None:
    org = ctx.org["id"]
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'", (org, farmer_id)).fetchone():
        raise HTTPException(400, "Only active members have production records.")
    before = conn.execute("SELECT quantity_qt, source FROM abc_production WHERE org_id=? AND farmer_id=? AND season=?",
                          (org, farmer_id, season)).fetchone()
    with conn:
        conn.execute("""INSERT OR REPLACE INTO abc_production (org_id, farmer_id, season, quantity_qt, source, recorded_by,
                        recorded_at) VALUES (?,?,?,?,?,?,?)""", (org, farmer_id, season, quantity_qt, source, actor["id"], _now()))
    _audit(conn, actor, "abc.production.record", org,
           {"farmer_id": farmer_id, "season": season, "quantity_qt": before[0], "source": before[1]} if before else None,
           {"farmer_id": farmer_id, "season": season, "quantity_qt": quantity_qt, "source": source})


def seasons(conn, org_id: int) -> list[str]:
    return [r[0] for r in conn.execute("SELECT DISTINCT season FROM abc_production WHERE org_id=? ORDER BY season DESC", (org_id,))]


def compute_weights(conn, ctx: core.AbcContext, season: str | None) -> dict:
    """Live weights for the active members (not stored)."""
    org = ctx.org["id"]
    land_f = core.rule(conn, "voting_land_factor", ctx.profile["abc_type"])
    prod_f = core.rule(conn, "voting_production_factor", ctx.profile["abc_type"])
    members = _rows(conn, """SELECT u.id AS farmer_id, u.name, d.member_no,
                                    COALESCE((SELECT SUM(COALESCE(f.area_ha, 0)) FROM farms f WHERE f.user_id = u.id), 0) AS land_ha
                             FROM abc_members m JOIN users u ON u.id = m.farmer_id
                             LEFT JOIN abc_member_details d ON d.org_id = m.org_id AND d.farmer_id = m.farmer_id
                             WHERE m.org_id=? AND m.status='active' ORDER BY COALESCE(d.member_no, 99999), u.name""", (org,))
    season = season or (seasons(conn, org) or [None])[0]
    prod = dict(conn.execute("SELECT farmer_id, quantity_qt FROM abc_production WHERE org_id=? AND season=?",
                             (org, season)).fetchall()) if season else {}
    total_land = sum(m["land_ha"] for m in members)
    total_prod = sum(prod.get(m["farmer_id"], 0.0) for m in members)
    land_only = total_prod <= 0
    lf = 1.0 if land_only else land_f.value / (land_f.value + prod_f.value)
    pf = 0.0 if land_only else prod_f.value / (land_f.value + prod_f.value)
    for m in members:
        m["production_qt"] = prod.get(m["farmer_id"], 0.0)
        share_land = m["land_ha"] / total_land if total_land else 0.0
        share_prod = m["production_qt"] / total_prod if total_prod else 0.0
        m["weight"] = round(lf * share_land + pf * share_prod, 6)
    if not total_land and not total_prod and members:
        for m in members:                       # nothing recorded yet: equal weights (shown as such)
            m["weight"] = round(1 / len(members), 6)
    return {"season": season, "land_factor": land_f.value, "production_factor": prod_f.value, "land_only": land_only,
            "equal_weights": not total_land and not total_prod, "total_land_ha": round(total_land, 2),
            "total_production_qt": round(total_prod, 2), "members": members,
            "rule_status": [land_f.verification_status, prod_f.verification_status]}


def snapshot(conn, ctx: core.AbcContext, actor: dict, label: str, season: str | None = None) -> int:
    w = compute_weights(conn, ctx, season)
    org = ctx.org["id"]
    with conn:
        sid = conn.execute("""INSERT INTO abc_weight_snapshots (org_id, label, season, land_factor, production_factor,
                              land_only, total_land_ha, total_production_qt, created_by, created_at)
                              VALUES (?,?,?,?,?,?,?,?,?,?)""",
                           (org, label, w["season"], w["land_factor"], w["production_factor"], int(w["land_only"]),
                            w["total_land_ha"], w["total_production_qt"], actor["id"], _now())).lastrowid
        conn.executemany("INSERT INTO abc_weights (snapshot_id, farmer_id, land_ha, production_qt, weight) VALUES (?,?,?,?,?)",
                         [(sid, m["farmer_id"], m["land_ha"], m["production_qt"], m["weight"]) for m in w["members"]])
    _audit(conn, actor, "abc.voting.snapshot", org, None, {"snapshot_id": sid, "label": label, "season": w["season"],
                                                          "members": len(w["members"]), "land_only": w["land_only"]}, 201)
    return sid


def snapshot_weights(conn, snapshot_id: int) -> dict[int, float]:
    return dict(conn.execute("SELECT farmer_id, weight FROM abc_weights WHERE snapshot_id=?", (snapshot_id,)).fetchall())


# ── Meetings ──────────────────────────────────────────────────────────────────

def _meeting(conn, org_id: int, meeting_id: int) -> dict:
    rows = _rows(conn, "SELECT * FROM abc_meetings WHERE id=? AND org_id=?", (meeting_id, org_id))
    if not rows:
        raise HTTPException(404, "Meeting not found")
    m = rows[0]
    m["agenda"] = json.loads(m["agenda"])
    return m


def board_ids(conn, org_id: int) -> list[int]:
    return [r[0] for r in conn.execute("SELECT DISTINCT user_id FROM abc_roles WHERE org_id=? AND role IN ('chair','board_member')",
                                       (org_id,))]


def create_meeting(conn, ctx: core.AbcContext, actor: dict, *, kind: str, title: str, scheduled_at: datetime,
                   location: str | None, agenda: list[str]) -> dict:
    org = ctx.org["id"]
    sid = snapshot(conn, ctx, actor, f"{title} ({scheduled_at:%Y-%m-%d})") if kind == "general_assembly" else None
    with conn:
        mid = conn.execute("""INSERT INTO abc_meetings (org_id, kind, title, scheduled_at, location, agenda, snapshot_id,
                              created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)""",
                           (org, kind, title.strip(), scheduled_at.isoformat(sep=" ", timespec="minutes"), location,
                            json.dumps([a.strip() for a in agenda if a.strip()]), sid, actor["id"], _now())).lastrowid
    _audit(conn, actor, "abc.meeting.create", org, None, {"meeting_id": mid, "kind": kind, "title": title,
                                                         "scheduled_at": str(scheduled_at), "snapshot_id": sid}, 201)
    return meeting_detail(conn, ctx, mid)


def voters(conn, org_id: int, m: dict) -> dict[int, float]:
    """Who may vote in this meeting and with what weight."""
    if m["kind"] == "board":
        return {uid: 1.0 for uid in board_ids(conn, org_id)}
    return snapshot_weights(conn, m["snapshot_id"])


def quorum(conn, ctx: core.AbcContext, m: dict) -> dict:
    org = ctx.org["id"]
    eligible = voters(conn, org, m)
    present = {r[0] for r in conn.execute("SELECT user_id FROM abc_attendance WHERE meeting_id=?", (m["id"],))}
    total = sum(eligible.values())
    here = sum(w for uid, w in eligible.items() if uid in present)
    need = core.rule(conn, "quorum_fraction", ctx.profile["abc_type"]).value
    fraction = here / total if total else 0.0
    return {"eligible": len(eligible), "present": len(present & set(eligible)), "present_weight": round(here, 6),
            "total_weight": round(total, 6), "fraction": round(fraction, 4), "need": need,
            "met": total > 0 and fraction >= need - 1e-9}


def notify(conn, ctx: core.AbcContext, actor: dict, meeting_id: int) -> int:
    """Notice to every voter (members for an assembly, board members for a board meeting): app and Telegram."""
    org = ctx.org["id"]
    m = _meeting(conn, org, meeting_id)
    sent = 0
    with conn:
        for uid in voters(conn, org, m):
            channel = conn.execute("SELECT alert_channel FROM farmer_profiles WHERE user_id=?", (uid,)).fetchone()
            cur = conn.execute("""INSERT OR IGNORE INTO alerts (type, farmer_id, severity, message_key, payload, channel,
                                  status, dedupe_key, created_at) VALUES ('abc_meeting', ?, 'info', ?, ?, ?, 'queued', ?, ?)""",
                               (uid, "abc_meeting_notice_board" if m["kind"] == "board" else "abc_meeting_notice",
                                json.dumps({"org": ctx.org["name"], "title": m["title"], "when": m["scheduled_at"],
                                            "place": m["location"] or "—", "agenda": "; ".join(m["agenda"]) or "—"}),
                                (channel[0] if channel else None) or "app", f"abc_meeting:{meeting_id}:{uid}", _now()))
            sent += cur.rowcount
        conn.execute("UPDATE abc_meetings SET notice_sent_at=? WHERE id=?", (_now(), meeting_id))
    _audit(conn, actor, "abc.meeting.notice", org, None, {"meeting_id": meeting_id, "sent": sent})
    return sent


def set_attendance(conn, ctx: core.AbcContext, actor: dict, meeting_id: int, present: list[int]) -> dict:
    org = ctx.org["id"]
    m = _meeting(conn, org, meeting_id)
    if m["status"] == "cancelled":
        raise HTTPException(400, "This meeting was cancelled.")
    eligible = voters(conn, org, m)
    unknown = [uid for uid in present if uid not in eligible]
    if unknown:
        raise HTTPException(400, "Only members who can vote in this meeting can be marked present.")
    before = sorted(r[0] for r in conn.execute("SELECT user_id FROM abc_attendance WHERE meeting_id=?", (meeting_id,)))
    with conn:
        conn.execute("DELETE FROM abc_attendance WHERE meeting_id=?", (meeting_id,))
        conn.executemany("INSERT INTO abc_attendance (meeting_id, user_id, recorded_by, recorded_at) VALUES (?,?,?,?)",
                         [(meeting_id, uid, actor["id"], _now()) for uid in sorted(set(present))])
        if m["status"] == "scheduled":
            conn.execute("UPDATE abc_meetings SET status='held' WHERE id=?", (meeting_id,))
    _audit(conn, actor, "abc.meeting.attendance", org, {"meeting_id": meeting_id, "present": before},
           {"meeting_id": meeting_id, "present": sorted(set(present))})
    return quorum(conn, ctx, _meeting(conn, org, meeting_id))


def add_motion(conn, ctx: core.AbcContext, actor: dict, meeting_id: int, title: str, text: str | None) -> int:
    org = ctx.org["id"]
    m = _meeting(conn, org, meeting_id)
    if m["status"] == "cancelled":
        raise HTTPException(400, "This meeting was cancelled.")
    with conn:
        mid = conn.execute("INSERT INTO abc_motions (meeting_id, title, text, created_at) VALUES (?,?,?,?)",
                           (meeting_id, title.strip(), text, _now())).lastrowid
    _audit(conn, actor, "abc.motion.create", org, None, {"meeting_id": meeting_id, "motion_id": mid, "title": title}, 201)
    return mid


def _motion(conn, org_id: int, motion_id: int) -> tuple[dict, dict]:
    rows = _rows(conn, """SELECT mo.* FROM abc_motions mo JOIN abc_meetings me ON me.id = mo.meeting_id
                          WHERE mo.id=? AND me.org_id=?""", (motion_id, org_id))
    if not rows:
        raise HTTPException(404, "Motion not found")
    return rows[0], _meeting(conn, org_id, rows[0]["meeting_id"])


def record_votes(conn, ctx: core.AbcContext, actor: dict, motion_id: int, votes: list[dict]) -> dict:
    org = ctx.org["id"]
    motion, m = _motion(conn, org, motion_id)
    if motion["status"] != "open":
        raise HTTPException(400, "Voting on this motion is closed.")
    eligible = voters(conn, org, m)
    present = {r[0] for r in conn.execute("SELECT user_id FROM abc_attendance WHERE meeting_id=?", (m["id"],))}
    for v in votes:
        if v["choice"] not in CHOICES:
            raise HTTPException(400, f"Unknown choice '{v['choice']}'.")
        if v["user_id"] not in eligible:
            raise HTTPException(400, "Only voters of this meeting can vote.")
        if v["user_id"] not in present:
            raise HTTPException(400, "Mark the voter present first.")
    with conn:
        for v in votes:
            conn.execute("""INSERT INTO abc_votes (motion_id, user_id, choice, weight, entered_by, entered_at)
                            VALUES (?,?,?,?,?,?) ON CONFLICT(motion_id, user_id) DO UPDATE SET choice=excluded.choice,
                            entered_by=excluded.entered_by, entered_at=excluded.entered_at, confirmed_at=NULL, disputed=0""",
                         (motion_id, v["user_id"], v["choice"], eligible[v["user_id"]], actor["id"], _now()))
    _audit(conn, actor, "abc.motion.votes", org, None, {"motion_id": motion_id, "votes": len(votes)})
    return tally(conn, ctx, motion_id)


def tally(conn, ctx: core.AbcContext, motion_id: int) -> dict:
    org = ctx.org["id"]
    motion, m = _motion(conn, org, motion_id)
    sums = {c: 0.0 for c in CHOICES}
    counts = {c: 0 for c in CHOICES}
    for choice, weight in conn.execute("SELECT choice, weight FROM abc_votes WHERE motion_id=?", (motion_id,)):
        sums[choice] += weight
        counts[choice] += 1
    cast = sums["yes"] + sums["no"]
    need = core.rule(conn, "motion_pass_fraction", ctx.profile["abc_type"]).value
    q = quorum(conn, ctx, m)
    passing = cast > 0 and sums["yes"] > need * cast + 1e-12
    return {"motion_id": motion_id, "weights": {k: round(v, 6) for k, v in sums.items()}, "counts": counts,
            "pass_fraction": need, "would_pass": passing, "quorum": q, "status": motion["status"], "result": motion["result"]}


def close_motion(conn, ctx: core.AbcContext, actor: dict, motion_id: int) -> dict:
    org = ctx.org["id"]
    motion, _ = _motion(conn, org, motion_id)
    if motion["status"] != "open":
        raise HTTPException(400, "Already closed.")
    t = tally(conn, ctx, motion_id)
    result = "no_quorum" if not t["quorum"]["met"] else "passed" if t["would_pass"] else "failed"
    with conn:
        conn.execute("UPDATE abc_motions SET status='closed', result=?, closed_at=? WHERE id=?", (result, _now(), motion_id))
    _audit(conn, actor, "abc.motion.close", org, {"motion_id": motion_id, "status": "open"},
           {"motion_id": motion_id, "result": result, "weights": t["weights"], "quorum": t["quorum"]["fraction"]})
    return tally(conn, ctx, motion_id)


def save_minutes(conn, ctx: core.AbcContext, actor: dict, meeting_id: int, text: str) -> None:
    org = ctx.org["id"]
    m = _meeting(conn, org, meeting_id)
    if m["minutes_status"] == "approved":
        raise HTTPException(400, "These minutes are approved and can no longer change.")
    with conn:
        conn.execute("UPDATE abc_meetings SET minutes=?, minutes_status='draft' WHERE id=?", (text, meeting_id))
    _audit(conn, actor, "abc.minutes.draft", org, {"meeting_id": meeting_id, "length": len(m["minutes"] or "")},
           {"meeting_id": meeting_id, "length": len(text)})


def approve_minutes(conn, ctx: core.AbcContext, actor: dict, meeting_id: int) -> None:
    org = ctx.org["id"]
    m = _meeting(conn, org, meeting_id)
    if m["minutes_status"] != "draft":
        raise HTTPException(400, "Write the minutes first.")
    with conn:
        conn.execute("UPDATE abc_meetings SET minutes_status='approved', minutes_approved_by=?, minutes_approved_at=? WHERE id=?",
                     (actor["id"], _now(), meeting_id))
    _audit(conn, actor, "abc.minutes.approve", org, {"meeting_id": meeting_id, "minutes_status": "draft"},
           {"meeting_id": meeting_id, "minutes_status": "approved"})


def cancel_meeting(conn, ctx: core.AbcContext, actor: dict, meeting_id: int) -> None:
    org = ctx.org["id"]
    m = _meeting(conn, org, meeting_id)
    if m["status"] != "scheduled":
        raise HTTPException(400, "Only a meeting that has not taken place can be cancelled.")
    with conn:
        conn.execute("UPDATE abc_meetings SET status='cancelled' WHERE id=?", (meeting_id,))
    _audit(conn, actor, "abc.meeting.cancel", org, {"meeting_id": meeting_id, "status": "scheduled"},
           {"meeting_id": meeting_id, "status": "cancelled"})


def meetings(conn, org_id: int) -> list[dict]:
    rows = _rows(conn, """SELECT id, kind, title, scheduled_at, location, status, notice_sent_at, minutes_status
                          FROM abc_meetings WHERE org_id=? ORDER BY scheduled_at DESC""", (org_id,))
    return rows


def meeting_detail(conn, ctx: core.AbcContext, meeting_id: int) -> dict:
    org = ctx.org["id"]
    m = _meeting(conn, org, meeting_id)
    eligible = voters(conn, org, m)
    names = dict(conn.execute(f"SELECT id, name FROM users WHERE id IN ({','.join('?' * len(eligible)) or 'NULL'})",
                              tuple(eligible)).fetchall()) if eligible else {}
    present = {r[0] for r in conn.execute("SELECT user_id FROM abc_attendance WHERE meeting_id=?", (meeting_id,))}
    motions = []
    for mo in _rows(conn, "SELECT * FROM abc_motions WHERE meeting_id=? ORDER BY id", (meeting_id,)):
        votes = {r["user_id"]: r for r in _rows(conn, "SELECT user_id, choice, confirmed_at, disputed FROM abc_votes WHERE motion_id=?",
                                               (mo["id"],))}
        motions.append({**mo, "tally": tally(conn, ctx, mo["id"]), "votes": votes})
    approver = conn.execute("SELECT name FROM users WHERE id=?", (m["minutes_approved_by"],)).fetchone() if m["minutes_approved_by"] else None
    return {**m, "minutes_approved_by_name": approver[0] if approver else None,
            "voters": [{"user_id": uid, "name": names.get(uid, str(uid)), "weight": round(w, 6), "present": uid in present}
                       for uid, w in sorted(eligible.items(), key=lambda x: names.get(x[0], ""))],
            "quorum": quorum(conn, ctx, m), "motions": motions}


# ── Member side ───────────────────────────────────────────────────────────────

def my_votes(conn, user_id: int) -> list[dict]:
    return _rows(conn, """SELECT v.id, v.choice, v.weight, v.entered_at, v.confirmed_at, v.disputed, mo.title AS motion,
                                 me.title AS meeting, me.scheduled_at, o.name AS org
                          FROM abc_votes v JOIN abc_motions mo ON mo.id = v.motion_id JOIN abc_meetings me ON me.id = mo.meeting_id
                          JOIN organisations o ON o.id = me.org_id WHERE v.user_id=? ORDER BY v.id DESC LIMIT 50""", (user_id,))


def confirm_vote(conn, user: dict, vote_id: int, correct: bool) -> None:
    row = conn.execute("SELECT v.user_id, me.org_id FROM abc_votes v JOIN abc_motions mo ON mo.id = v.motion_id "
                       "JOIN abc_meetings me ON me.id = mo.meeting_id WHERE v.id=?", (vote_id,)).fetchone()
    if not row or row[0] != user["id"]:
        raise HTTPException(404, "Vote not found")
    with conn:
        conn.execute("UPDATE abc_votes SET confirmed_at=?, disputed=? WHERE id=?", (_now(), 0 if correct else 1, vote_id))
    _audit(conn, user, "abc.vote.confirm", row[1], None, {"vote_id": vote_id, "correct": correct})
