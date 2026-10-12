"""Demo accounts on the sign-in page of a demo deployment (DEMO_MODE=1), never the admin."""

from fastapi.testclient import TestClient

from backend import demo
from tests.conftest import add_user


def _client():
    from backend.main import app

    return TestClient(app)


def test_hidden_unless_demo_mode(platform, monkeypatch):
    add_user(platform, 1, phone="0944000001")
    monkeypatch.setattr(demo, "env", lambda name, default=None: "0" if name == "DEMO_MODE" else default)
    assert _client().get("/api/auth/demo-accounts").json() == {"enabled": False, "accounts": []}


def test_lists_existing_demo_accounts_without_admin(platform, monkeypatch):
    monkeypatch.setattr(demo, "env", lambda name, default=None: "1" if name == "DEMO_MODE" else default)
    add_user(platform, 1, phone="0944000001")                       # pitch farmer
    add_user(platform, 2, role="agent", phone="0944000002")
    add_user(platform, 3, role="admin", phone="0900000001")
    add_user(platform, 4, role="farmer", phone="0944000006")        # role changed by an admin: not listed
    r = _client().get("/api/auth/demo-accounts").json()
    assert r["enabled"] is True
    assert [a["phone"] for a in r["accounts"]] == ["0944000001", "0944000002"]
    assert all(a["role"] != "admin" for a in demo.ACCOUNTS)
    assert r["accounts"][0]["password"] == "demo1234"


def test_disabled_accounts_are_not_listed(platform, monkeypatch):
    monkeypatch.setattr(demo, "env", lambda name, default=None: "1" if name == "DEMO_MODE" else default)
    add_user(platform, 1, phone="0944000001")
    platform.execute("UPDATE users SET is_active=0 WHERE id=1"); platform.commit()
    assert _client().get("/api/auth/demo-accounts").json()["accounts"] == []
