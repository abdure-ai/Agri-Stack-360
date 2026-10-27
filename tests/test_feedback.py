"""Public website feedback (backend/feedback.py, backend/routers/feedback.py)."""

import pytest
from fastapi.testclient import TestClient

from backend import feedback
from tests.conftest import add_user


@pytest.fixture
def public(platform, monkeypatch):
    """A client with no sign-in, and fresh rate limiters."""
    monkeypatch.setattr(feedback, "submit_limiter", feedback.RateLimiter(30, 600))
    monkeypatch.setattr(feedback, "view_limiter", feedback.RateLimiter(600, 600))
    from backend.main import app

    return TestClient(app)


def form(**over):
    base = {"name": "Abebe Kebede", "organisation": "FAO", "visitor_type": "development_partner",
            "email": "abebe@example.org", "phone": "", "rating": 5, "liked": ["disease_detection", "local_languages"],
            "comments": "Great work", "interests": ["partnership"], "may_contact": True, "consent": True,
            "source": "expo"}
    return {**base, **over}


def test_valid_submission_is_stored(public, platform):
    r = public.post("/api/feedback", json=form(), headers={"user-agent": "PhoneBrowser/1.0"})
    assert r.status_code == 201
    row = dict(platform.execute("SELECT * FROM feedback WHERE id=?", (r.json()["id"],)).fetchone())
    assert row["name"] == "Abebe Kebede" and row["source"] == "expo" and row["status"] == "new"
    assert row["user_agent"] == "PhoneBrowser/1.0" and row["may_contact"] == 1
    assert "ip" not in " ".join(row).lower()     # no IP column


@pytest.mark.parametrize("raw,stored", [
    ("0911 23 45 67", "+251911234567"), ("+251-911-234567", "+251911234567"), ("251711234567", "+251711234567"),
    ("+44 20 7946 0958", "+442079460958"),
])
def test_phone_formats(public, platform, raw, stored):
    r = public.post("/api/feedback", json=form(email="", phone=raw))
    assert r.status_code == 201
    assert platform.execute("SELECT phone FROM feedback").fetchone()[0] == stored


@pytest.mark.parametrize("over,field", [
    ({"name": "  "}, "name"),
    ({"visitor_type": "alien"}, "visitor_type"),
    ({"email": "not-an-email"}, "email"),
    ({"email": "", "phone": "12345"}, "phone"),
    ({"email": "", "phone": ""}, "contact"),
    ({"rating": 0}, "rating"),
    ({"rating": "5"}, "rating"),
    ({"liked": ["teleport"]}, "liked"),
    ({"interests": ["x"]}, "interests"),
    ({"comments": "x" * 1001}, "comments"),
])
def test_invalid_answers_get_a_message_per_field(public, platform, over, field):
    r = public.post("/api/feedback", json=form(**over))
    assert r.status_code == 400
    assert field in r.json()["detail"]["fields"]
    assert platform.execute("SELECT COUNT(*) FROM feedback").fetchone()[0] == 0


@pytest.mark.parametrize("consent", [False, None, "yes"])
def test_consent_is_required(public, platform, consent):
    r = public.post("/api/feedback", json=form(consent=consent))
    assert r.status_code == 400 and "consent" in r.json()["detail"]["fields"]
    assert platform.execute("SELECT COUNT(*) FROM feedback").fetchone()[0] == 0


def test_may_contact_can_be_unticked(public, platform):
    assert public.post("/api/feedback", json=form(may_contact=False)).status_code == 201
    assert platform.execute("SELECT may_contact FROM feedback").fetchone()[0] == 0


def test_honeypot_looks_accepted_but_stores_nothing(public, platform):
    r = public.post("/api/feedback", json=form(website="http://spam.example"))
    assert r.status_code == 201 and r.json() == {"ok": True}
    assert platform.execute("SELECT COUNT(*) FROM feedback").fetchone()[0] == 0


def test_rate_limit_per_network_is_generous_but_finite(public, platform, monkeypatch):
    monkeypatch.setattr(feedback, "submit_limiter", feedback.RateLimiter(3, 600))
    venue = {"x-forwarded-for": "196.188.1.1, 172.18.0.1"}
    for i in range(3):
        assert public.post("/api/feedback", json=form(name=f"Visitor {i}"), headers=venue).status_code == 201
    assert public.post("/api/feedback", json=form(name="Visitor 4"), headers=venue).status_code == 429
    # another network is not affected
    assert public.post("/api/feedback", json=form(name="Visitor 5"), headers={"x-forwarded-for": "196.188.9.9"}).status_code == 201


def test_rate_limiter_window():
    rl = feedback.RateLimiter(2, 600)
    assert rl.allow("a", 0) and rl.allow("a", 1) and not rl.allow("a", 2)
    assert rl.allow("a", 601)


def test_identical_resubmission_counts_once(public, platform):
    first = public.post("/api/feedback", json=form()).json()["id"]
    again = public.post("/api/feedback", json=form()).json()["id"]
    assert first == again
    assert platform.execute("SELECT COUNT(*) FROM feedback").fetchone()[0] == 1


def test_bad_source_is_dropped_not_rejected(public, platform):
    assert public.post("/api/feedback", json=form(source="<script>")).status_code == 201
    assert platform.execute("SELECT source FROM feedback").fetchone()[0] is None


def test_admin_list_filter_update_summary_and_csv(public, platform, client_as):
    public.post("/api/feedback", json=form())
    public.post("/api/feedback", json=form(name="Sara", visitor_type="investor", rating=3, interests=["investment"],
                                           liked=["market_prices"], source=None))
    admin = client_as(add_user(platform, 1, role="admin"))

    rows = admin.get("/api/admin/feedback").json()
    assert [r["name"] for r in rows] == ["Sara", "Abebe Kebede"]
    assert rows[1]["liked"] == ["disease_detection", "local_languages"] and "fingerprint" not in rows[1]
    assert [r["name"] for r in admin.get("/api/admin/feedback", params={"interest": "partnership"}).json()] == ["Abebe Kebede"]
    assert [r["name"] for r in admin.get("/api/admin/feedback", params={"min_rating": 4}).json()] == ["Abebe Kebede"]
    assert [r["name"] for r in admin.get("/api/admin/feedback", params={"source": "expo"}).json()] == ["Abebe Kebede"]

    fid = rows[0]["id"]
    out = admin.patch(f"/api/admin/feedback/{fid}", json={"status": "contacted", "notes": "Called on 30 Oct"}).json()
    assert out["status"] == "contacted" and out["notes"] == "Called on 30 Oct"
    assert admin.patch("/api/admin/feedback/999", json={"status": "closed"}).status_code == 404
    assert admin.patch(f"/api/admin/feedback/{fid}", json={"status": "spam"}).status_code == 422

    s = admin.get("/api/admin/feedback/summary").json()
    assert s["count"] == 2 and s["average_rating"] == 4.0
    assert s["interests"] == {"investment": 1, "partnership": 1}
    assert s["sources"] == {"direct": 1, "expo": 1}

    csv = admin.get("/api/admin/feedback/export.csv")
    assert csv.headers["content-type"].startswith("text/csv")
    lines = csv.text.lstrip("﻿").splitlines()
    assert lines[0].startswith("id,created_at,name") and len(lines) == 3
    assert "disease_detection; local_languages" in csv.text


@pytest.mark.parametrize("role", ["farmer", "agent", "government", "agronomist"])
def test_only_admins_read_feedback(public, platform, client_as, role):
    c = client_as(add_user(platform, 2, role=role))
    assert c.get("/api/admin/feedback").status_code == 403
    assert c.get("/api/admin/feedback/export.csv").status_code == 403


def test_page_views_are_counts_only(public, platform, client_as):
    for _ in range(3):
        assert public.post("/api/visits", json={"path": "/", "source": "expo"}).status_code == 204
    public.post("/api/visits", json={"path": "/feedback"})
    public.post("/api/visits", json={"path": "/admin/users"})       # not a public page: ignored
    rows = [dict(r) for r in platform.execute("SELECT path, source, views FROM page_views ORDER BY path")]
    assert rows == [{"path": "/", "source": "expo", "views": 3}, {"path": "/feedback", "source": "", "views": 1}]
    admin = client_as(add_user(platform, 1, role="admin"))
    views = admin.get("/api/admin/feedback/summary").json()["page_views"]
    assert {"path": "/", "source": "expo", "views": 3} in views
