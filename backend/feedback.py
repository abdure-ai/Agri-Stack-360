"""
feedback.py — Visitor feedback and page-view counts for the public website (landing, /feedback).

Feedback is stored with the visitor's consent (required to submit) and read only by admins
(permission feedback:manage). Nothing here goes to an external AI.

Spam: a hidden honeypot field (bots fill it; the visitor sees a normal thank-you and nothing is stored),
a per-IP rate limit held in memory only (no IP is stored), and identical repeat submissions within
10 minutes count once (double taps, retries after a lost reply). The limit is generous on purpose:
exhibition Wi-Fi and mobile carriers put many visitors behind one IP.

Page views are counts per day, page and source (?src=expo) only: no IP, no cookies, no user agent.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import threading
import time
from collections import deque
from datetime import datetime, timezone

VISITOR_TYPES = ("farmer", "development_agent", "government", "research", "development_partner", "input_supplier",
                 "agribusiness", "investor", "media", "student", "other")
LIKED = ("disease_detection", "ai_advisory", "local_languages", "input_trust", "market_prices", "other")
INTERESTS = ("partnership", "pilot", "investment", "using_the_app", "media", "just_exploring")
STATUSES = ("new", "contacted", "closed")
PAGES = ("/", "/feedback", "/privacy")

MAX_COMMENTS = 1000
DUPLICATE_WINDOW_S = 600

_EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[A-Za-z]{2,}$")
_SOURCE_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS feedback (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            organisation  TEXT,
            visitor_type  TEXT NOT NULL,
            email         TEXT,
            phone         TEXT,
            rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            liked         TEXT NOT NULL DEFAULT '[]',     -- JSON list of LIKED
            comments      TEXT,
            interests     TEXT NOT NULL DEFAULT '[]',     -- JSON list of INTERESTS
            may_contact   INTEGER NOT NULL DEFAULT 0,
            consent       INTEGER NOT NULL CHECK (consent = 1),
            source        TEXT,
            user_agent    TEXT,
            fingerprint   TEXT,                            -- hash of the answers, for the duplicate check
            status        TEXT NOT NULL DEFAULT 'new',
            notes         TEXT,
            created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at    TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
        CREATE TABLE IF NOT EXISTS page_views (
            day     TEXT NOT NULL,
            path    TEXT NOT NULL,
            source  TEXT NOT NULL DEFAULT '',
            views   INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (day, path, source)
        );
    """)
    conn.commit()


# ── Validation ────────────────────────────────────────────────────────────────

def normalise_phone(raw: str) -> str | None:
    """Ethiopian 09… / 07… / +251… / 251… numbers become +251XXXXXXXXX; other countries need a leading +."""
    digits = re.sub(r"[\s\-().]", "", raw or "")
    if re.fullmatch(r"0[79]\d{8}", digits):
        return "+251" + digits[1:]
    if re.fullmatch(r"(\+?251)[79]\d{8}", digits):
        return "+251" + digits[-9:]
    if re.fullmatch(r"\+[1-9]\d{7,14}", digits):
        return digits
    return None


def _source(raw: str | None) -> str | None:
    return raw if raw and _SOURCE_RE.fullmatch(raw) else None


def validate(data: dict) -> tuple[dict, dict[str, str]]:
    """Clean the submitted answers. Returns (row, errors by field); errors are short, friendly English."""
    errors: dict[str, str] = {}
    name = (data.get("name") or "").strip()
    if not name:
        errors["name"] = "Please enter your name."
    elif len(name) > 120:
        errors["name"] = "Please keep your name under 120 characters."
    organisation = (data.get("organisation") or "").strip() or None
    if organisation and len(organisation) > 160:
        errors["organisation"] = "Please keep the organisation under 160 characters."
    visitor_type = data.get("visitor_type")
    if visitor_type not in VISITOR_TYPES:
        errors["visitor_type"] = "Please choose who you are."

    email = (data.get("email") or "").strip() or None
    if email and (len(email) > 200 or not _EMAIL_RE.fullmatch(email)):
        errors["email"] = "This email address doesn't look right."
    phone_raw = (data.get("phone") or "").strip()
    phone = normalise_phone(phone_raw) if phone_raw else None
    if phone_raw and not phone:
        errors["phone"] = "Use a number like 0911 234 567 or +251 911 234 567 (other countries: start with +)."
    if not email and not phone_raw and "email" not in errors:
        errors["contact"] = "Please give an email address or a phone number."

    rating = data.get("rating")
    if not isinstance(rating, int) or isinstance(rating, bool) or not 1 <= rating <= 5:
        errors["rating"] = "Please choose a rating from 1 to 5 stars."
    liked = data.get("liked") or []
    interests = data.get("interests") or []
    if not isinstance(liked, list) or any(x not in LIKED for x in liked):
        errors["liked"] = "Unknown choice."
    if not isinstance(interests, list) or any(x not in INTERESTS for x in interests):
        errors["interests"] = "Unknown choice."
    comments = (data.get("comments") or "").strip() or None
    if comments and len(comments) > MAX_COMMENTS:
        errors["comments"] = f"Please keep comments under {MAX_COMMENTS:,} characters."
    if data.get("consent") is not True:
        errors["consent"] = "Please tick the consent box so we may store your answers."

    row = {
        "name": name, "organisation": organisation, "visitor_type": visitor_type, "email": email, "phone": phone,
        "rating": rating,
        "liked": json.dumps(sorted(set(liked))) if isinstance(liked, list) else "[]",
        "interests": json.dumps(sorted(set(interests))) if isinstance(interests, list) else "[]",
        "comments": comments, "may_contact": 1 if data.get("may_contact") is True else 0, "consent": 1,
        "source": _source(data.get("source")),
        "user_agent": (data.get("user_agent") or "")[:300] or None,
    }
    return row, errors


# ── Spam protection ───────────────────────────────────────────────────────────

class RateLimiter:
    """At most `limit` hits per key in `window_s` seconds. In memory only (keys are never written anywhere)."""

    def __init__(self, limit: int, window_s: float):
        self.limit, self.window_s = limit, window_s
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        with self._lock:
            if len(self._hits) > 10_000:       # forget idle keys
                self._hits = {k: q for k, q in self._hits.items() if q and now - q[-1] < self.window_s}
            q = self._hits.setdefault(key, deque())
            while q and now - q[0] >= self.window_s:
                q.popleft()
            if len(q) >= self.limit:
                return False
            q.append(now)
            return True


submit_limiter = RateLimiter(int(os.getenv("FEEDBACK_RATE_LIMIT", "30")), 600)
view_limiter = RateLimiter(600, 600)


def _fingerprint(row: dict) -> str:
    keys = ("name", "email", "phone", "rating", "liked", "comments", "interests", "visitor_type")
    return hashlib.sha256(json.dumps([row[k] for k in keys]).encode()).hexdigest()


# ── Store and read ────────────────────────────────────────────────────────────

def submit(conn: sqlite3.Connection, row: dict) -> int:
    """Insert a validated row; an identical submission in the last 10 minutes returns the earlier id."""
    fp = _fingerprint(row)
    since = datetime.fromtimestamp(time.time() - DUPLICATE_WINDOW_S, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    dup = conn.execute("SELECT id FROM feedback WHERE fingerprint=? AND created_at>=?", (fp, since)).fetchone()
    if dup:
        return dup[0]
    cols = [*row, "fingerprint"]
    cur = conn.execute(f"INSERT INTO feedback ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                       (*row.values(), fp))
    conn.commit()
    return cur.lastrowid


def _public(r: sqlite3.Row | dict) -> dict:
    d = dict(r)
    d.pop("fingerprint", None)
    d["liked"] = json.loads(d.get("liked") or "[]")
    d["interests"] = json.loads(d.get("interests") or "[]")
    d["may_contact"] = bool(d["may_contact"])
    d["consent"] = bool(d["consent"])
    return d


def _where(filters: dict) -> tuple[str, list]:
    clauses, args = [], []
    for col in ("visitor_type", "status", "source"):
        if filters.get(col):
            clauses.append(f"{col} = ?")
            args.append(filters[col])
    if filters.get("interest"):
        clauses.append("EXISTS (SELECT 1 FROM json_each(feedback.interests) WHERE value = ?)")
        args.append(filters["interest"])
    if filters.get("min_rating"):
        clauses.append("rating >= ?")
        args.append(filters["min_rating"])
    if filters.get("date_from"):
        clauses.append("created_at >= ?")
        args.append(filters["date_from"])
    if filters.get("date_to"):
        clauses.append("created_at < date(?, '+1 day')")
        args.append(filters["date_to"])
    return (" WHERE " + " AND ".join(clauses)) if clauses else "", args


def list_feedback(conn: sqlite3.Connection, filters: dict, limit: int = 1000) -> list[dict]:
    where, args = _where(filters)
    rows = conn.execute(f"SELECT * FROM feedback{where} ORDER BY created_at DESC, id DESC LIMIT ?", (*args, limit))
    return [_public(r) for r in rows.fetchall()]


def get(conn: sqlite3.Connection, feedback_id: int) -> dict | None:
    r = conn.execute("SELECT * FROM feedback WHERE id=?", (feedback_id,)).fetchone()
    return _public(r) if r else None


def update(conn: sqlite3.Connection, feedback_id: int, status: str | None, notes: str | None) -> dict | None:
    if not get(conn, feedback_id):
        return None
    if status is not None:
        conn.execute("UPDATE feedback SET status=?, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?",
                     (status, feedback_id))
    if notes is not None:
        conn.execute("UPDATE feedback SET notes=?, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?",
                     (notes.strip() or None, feedback_id))
    conn.commit()
    return get(conn, feedback_id)


def summary(conn: sqlite3.Connection, filters: dict) -> dict:
    """Count, average rating, liked features, interests, visitor types (same filters as the list) and page views."""
    rows = list_feedback(conn, filters, limit=100_000)

    def tally(values) -> dict[str, int]:
        out: dict[str, int] = {}
        for v in values:
            out[v] = out.get(v, 0) + 1
        return dict(sorted(out.items(), key=lambda kv: (-kv[1], kv[0])))

    views = conn.execute("SELECT path, source, SUM(views) AS views FROM page_views GROUP BY path, source "
                         "ORDER BY views DESC").fetchall()
    return {
        "count": len(rows),
        "average_rating": round(sum(r["rating"] for r in rows) / len(rows), 2) if rows else None,
        "ratings": {str(n): sum(1 for r in rows if r["rating"] == n) for n in range(1, 6)},
        "liked": tally(x for r in rows for x in r["liked"]),
        "interests": tally(x for r in rows for x in r["interests"]),
        "visitor_types": tally(r["visitor_type"] for r in rows),
        "sources": tally(r["source"] or "direct" for r in rows),
        "page_views": [{"path": v["path"], "source": v["source"] or "direct", "views": v["views"]} for v in views],
    }


CSV_COLUMNS = ("id", "created_at", "name", "organisation", "visitor_type", "email", "phone", "rating", "liked",
               "interests", "comments", "may_contact", "source", "status", "notes")


def csv_rows(conn: sqlite3.Connection, filters: dict) -> list[list]:
    out = []
    for r in list_feedback(conn, filters, limit=100_000):
        r = {**r, "liked": "; ".join(r["liked"]), "interests": "; ".join(r["interests"]),
             "may_contact": "yes" if r["may_contact"] else "no"}
        out.append([r.get(c) for c in CSV_COLUMNS])
    return out


def record_view(conn: sqlite3.Connection, path: str, source: str | None) -> bool:
    """Count one page view; unknown pages are ignored."""
    if path not in PAGES:
        return False
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn.execute("INSERT INTO page_views (day, path, source, views) VALUES (?,?,?,1) "
                 "ON CONFLICT(day, path, source) DO UPDATE SET views = views + 1", (day, path, _source(source) or ""))
    conn.commit()
    return True
