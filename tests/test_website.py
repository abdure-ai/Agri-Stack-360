"""Public website partners and logos (backend/website.py, backend/routers/website.py)."""

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend import website
from tests.conftest import add_user


@pytest.fixture
def logos(tmp_path, monkeypatch):
    monkeypatch.setattr(website, "LOGO_DIR", tmp_path / "partners")
    return tmp_path / "partners"


@pytest.fixture
def admin(platform, client_as, logos):
    return client_as(add_user(platform, 1, role="admin"))


def png(w=1200, h=400, fmt="PNG") -> bytes:
    out = io.BytesIO()
    Image.new("RGBA" if fmt == "PNG" else "RGB", (w, h), (11, 93, 46, 255) if fmt == "PNG" else (11, 93, 46)).save(out, format=fmt)
    return out.getvalue()


def public_client():
    from backend.main import app

    return TestClient(app)


def test_default_partners_world_bank_after_ati(platform):
    names = [p["name"] for p in public_client().get("/api/site/partners").json()]
    assert names[:3] == ["Agricultural Transformation Institute (ATI)", "World Bank", "UNDP"]
    assert len(names) == 6


def test_defaults_are_not_restored_after_the_list_is_emptied(platform):
    platform.execute("DELETE FROM website_partners")
    website.ensure_schema(platform)
    assert platform.execute("SELECT COUNT(*) FROM website_partners").fetchone()[0] == 0


def test_add_partner_with_logo_shows_on_the_website(admin, logos):
    r = admin.post("/api/admin/partners", data={"name": "FAO"}, files={"logo": ("fao.jpg", png(fmt="JPEG"), "image/jpeg")})
    assert r.status_code == 201
    p = r.json()
    assert p["name"] == "FAO" and p["logo_url"].startswith(f"/site/partners/{p['id']}/logo?v=")

    pub = public_client()
    listed = {x["name"]: x for x in pub.get("/api/site/partners").json()}
    assert listed["FAO"]["logo_url"] == p["logo_url"]
    img = pub.get("/api" + p["logo_url"])
    assert img.status_code == 200 and img.headers["content-type"] == "image/png"
    stored = Image.open(io.BytesIO(img.content))
    assert stored.format == "PNG" and stored.size[0] <= 480 and stored.size[1] <= 240   # re-encoded, resized


@pytest.mark.parametrize("data,msg", [
    (b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "PNG, JPG or WebP"),
    (b"not an image", "PNG, JPG or WebP"),
    (b"x" * (website.MAX_LOGO_BYTES + 10), "3 MB"),
])
def test_bad_logos_are_refused(admin, data, msg):
    r = admin.post("/api/admin/partners", data={"name": "Bad"}, files={"logo": ("x.svg", data, "image/svg+xml")})
    assert r.status_code == 400 and msg in r.json()["detail"]


def test_name_is_required(admin):
    assert admin.post("/api/admin/partners", data={"name": "  "}).status_code == 400


def test_replace_and_remove_logo_deletes_old_files(admin, logos):
    pid = admin.post("/api/admin/partners", data={"name": "FAO"}, files={"logo": ("a.png", png(), "image/png")}).json()["id"]
    first = set(logos.iterdir())
    replaced = admin.post(f"/api/admin/partners/{pid}/logo", files={"logo": ("b.png", png(800, 800), "image/png")}).json()
    assert replaced["logo_url"] and set(logos.iterdir()) != first and len(list(logos.iterdir())) == 1
    removed = admin.delete(f"/api/admin/partners/{pid}/logo").json()
    assert removed["logo_url"] is None and list(logos.iterdir()) == []


def test_hide_rename_reorder_delete(admin, platform):
    rows = admin.get("/api/admin/partners").json()
    ati, wb = rows[0]["id"], rows[1]["id"]
    assert admin.patch(f"/api/admin/partners/{wb}", json={"active": False}).json()["active"] is False
    assert "World Bank" not in [p["name"] for p in public_client().get("/api/site/partners").json()]
    assert admin.patch(f"/api/admin/partners/{ati}", json={"name": "ATI"}).json()["name"] == "ATI"

    order = admin.put("/api/admin/partners/order", json={"ids": [wb, ati]}).json()
    assert [p["id"] for p in order][:2] == [wb, ati]

    assert admin.delete(f"/api/admin/partners/{ati}").status_code == 204
    assert admin.delete(f"/api/admin/partners/{ati}").status_code == 404
    assert ati not in [p["id"] for p in admin.get("/api/admin/partners").json()]


@pytest.mark.parametrize("role", ["farmer", "agent", "government", "supplier"])
def test_only_admins_manage_partners(platform, client_as, role):
    c = client_as(add_user(platform, 2, role=role))
    assert c.get("/api/admin/partners").status_code == 403
    assert c.post("/api/admin/partners", data={"name": "X"}).status_code == 403
