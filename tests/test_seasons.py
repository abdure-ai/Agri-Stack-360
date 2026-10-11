"""Plots and crop seasons API + crop calendar endpoint (checklist 1.1, Tier 1 M3)."""

from datetime import date, timedelta
from pathlib import Path

import pytest

from backend import consent
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
TODAY = date.today()


@pytest.fixture
def farm(platform):
    load_seed(platform, ROOT / "data" / "advisory_seed")
    owner = add_user(platform, 1, altitude_m=1641)
    platform.execute("INSERT INTO farms (id, user_id, field_name, crop_name) VALUES (10, 1, 'Plot A', 'maize')")
    platform.commit()
    return owner


def _season(days_ago=30, **kw):
    return {"crop": "Wheat", "planting_date": (TODAY - timedelta(days=days_ago)).isoformat(), "season": "irrigated", **kw}


def test_add_season_and_farm_follows_it(client_as, farm, platform):
    api = client_as(farm)
    r = api.post("/api/users/farms/10/seasons", json=_season(variety="Kingbird"))
    assert r.status_code == 201, r.text
    assert r.json()["crop"] == "wheat" and r.json()["status"] == "active"
    f = platform.execute("SELECT crop_name, variety, planted_date, irrigated FROM farms WHERE id=10").fetchone()
    assert tuple(f) == ("wheat", "Kingbird", (TODAY - timedelta(days=30)).isoformat(), 1)
    assert len(api.get("/api/users/farms/10/seasons").json()) == 1


def test_one_crop_growing_per_field(client_as, farm):
    api = client_as(farm)
    first = api.post("/api/users/farms/10/seasons", json=_season()).json()
    assert api.post("/api/users/farms/10/seasons", json=_season(days_ago=5)).status_code == 409
    assert api.put(f"/api/users/farms/10/seasons/{first['id']}", json=_season(status="harvested")).status_code == 200
    assert api.post("/api/users/farms/10/seasons", json=_season(days_ago=5)).status_code == 201
    assert api.delete(f"/api/users/farms/10/seasons/{first['id']}").status_code == 204


@pytest.mark.parametrize("body,code", [
    (_season(days_ago=-200), 400),                                             # too far in the future
    (_season(days_ago=500), 400),                                              # too long ago
    (_season(expected_harvest_date=(TODAY - timedelta(days=40)).isoformat()), 400),   # harvest before planting
    (_season(season="summer"), 422),
    ({**_season(), "crop": "x"}, 422),
])
def test_season_validation(client_as, farm, body, code):
    assert client_as(farm).post("/api/users/farms/10/seasons", json=body).status_code == code


def test_season_access(client_as, farm, platform):
    other = add_user(platform, 2)
    agent = add_user(platform, 5, role="agent")
    assert client_as(other).post("/api/users/farms/10/seasons", json=_season()).status_code == 403
    assert client_as(agent).get("/api/users/farms/10/seasons").status_code == 403          # no data consent
    consent.set_consent(platform, 1, data=True, by=1)
    assert client_as(agent).get("/api/users/farms/10/seasons").status_code == 200
    assert client_as(agent).post("/api/users/farms/10/seasons", json=_season()).status_code == 403   # read only


def test_calendar_endpoint(client_as, farm):
    api = client_as(farm)
    api.post("/api/users/farms/10/seasons", json=_season(days_ago=30))
    [cal] = api.get("/api/advisory/calendar").json()
    assert cal["field_name"] == "Plot A" and cal["days_after_planting"] == 30 and cal["calendar_known"]
    assert cal["current_stage"]["stage_key"] == "tillering" and cal["timing_estimated"]
    assert cal["next_stage"]["stage_key"] == "stem_elongation"
    assert [s["status"] for s in cal["stages"]].count("current") == 1
    task = cal["current_stage"]["tasks"][0]
    assert task["text"] and "[" not in task["text"] and task["source"]                  # citation split out
    assert "E.C." in cal["planting_date_display"]
