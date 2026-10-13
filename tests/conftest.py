"""Shared fixtures: an in-memory platform database and an API client signed in as a given user."""

import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend import admin_areas, audit, erasure, input_trust, platform_db
from backend.advisory.schema import ensure_schema
from backend.db_init import SCHEMA


@pytest.fixture
def platform(monkeypatch):
    """A fresh agri_platform schema in memory, used by pquery/pexecute and get_platform_connection()."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA)
    admin_areas.ensure_schema(conn)
    ensure_schema(conn)
    audit.ensure_schema(conn)
    input_trust.ensure_schema(conn)
    erasure.ensure_schema(conn)
    from backend.routers import review

    review.ensure_schema(conn)
    from backend.routers import abc

    abc.ensure_schema(conn)
    from backend import abc_company

    abc_company.ensure_schema(conn)
    from backend import abc_formation

    abc_formation.ensure_schema(conn)
    from backend import abc_members

    abc_members.ensure_schema(conn)
    from backend import abc_shares

    abc_shares.ensure_schema(conn)
    from backend.routers import estate

    estate.ensure_schema(conn)
    from backend.routers import ngo

    ngo.ensure_schema(conn)
    from backend.routers import credit

    credit.ensure_schema(conn)
    from backend import training_data

    training_data.ensure_schema(conn)
    from backend import tips

    tips.ensure_schema(conn)
    monkeypatch.setattr(platform_db, "_conn", conn)
    yield conn
    conn.close()


def add_user(conn, uid, role="farmer", region="Amhara", name=None, phone=None, **profile):
    """Insert a user (and a farmer_profiles row when profile fields are given); returns the user dict."""
    conn.execute("INSERT INTO users (id, phone, name, password_hash, role, region, language) VALUES (?,?,?,?,?,?, 'en')",
                 (uid, phone or f"09000000{uid:02d}", name or f"User {uid}", "x", role, region))
    if profile:
        cols = ", ".join(["user_id", *profile])
        conn.execute(f"INSERT INTO farmer_profiles ({cols}) VALUES ({', '.join('?' * (len(profile) + 1))})",
                     (uid, *profile.values()))
    conn.commit()
    return dict(conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())


@pytest.fixture
def client_as(platform):
    """client_as(user) -> TestClient whose requests are signed in as `user` (startup tasks not run).

    Each client sets the signed-in user on every request, so several clients can be used side by side."""
    from backend.auth import get_current_user
    from backend.main import app

    class UserClient(TestClient):
        def __init__(self, user: dict):
            super().__init__(app)
            self._user = user

        def request(self, *args, **kwargs):
            app.dependency_overrides[get_current_user] = lambda: self._user
            return super().request(*args, **kwargs)

    yield UserClient
    app.dependency_overrides.clear()
