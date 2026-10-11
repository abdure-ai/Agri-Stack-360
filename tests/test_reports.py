"""Aggregated area reports (checklist 1.10 government, 1.2 weekly report; Tier 1 M5)."""

from datetime import datetime, timedelta
from pathlib import Path

import pytest

from backend import admin_areas, reports
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"          # Dewa Cheffa, Amhara (ET03)


@pytest.fixture
def area(platform):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    other_amhara = platform.execute("SELECT pcode FROM admin_areas WHERE level=3 AND region_pcode='ET03' AND pcode != ? "
                                    "ORDER BY pcode LIMIT 1", (DEWA,)).fetchone()[0]
    oromia = platform.execute("SELECT pcode FROM admin_areas WHERE level=3 AND region_pcode='ET04' ORDER BY pcode LIMIT 1").fetchone()[0]

    def place(uid, woreda, role="farmer", **kw):
        u = add_user(platform, uid, role=role, name=f"Person {uid}", phone=f"09110000{uid:02d}", **kw)
        chain = admin_areas.lineage(platform, woreda)
        platform.execute("UPDATE users SET region_pcode=?, zone_pcode=?, woreda_pcode=? WHERE id=?",
                         (chain[0].pcode, chain[1].pcode, chain[2].pcode, uid))
        platform.commit()
        return {**u, "region_pcode": chain[0].pcode, "zone_pcode": chain[1].pcode, "woreda_pcode": chain[2].pcode}

    for uid in range(1, 7):
        place(uid, DEWA)                         # 6 farmers in Dewa Cheffa
    place(7, other_amhara)
    place(8, other_amhara)                       # 2 farmers elsewhere in Amhara
    place(9, oromia)
    return {"place": place, "other_amhara": other_amhara, "oromia": oromia}


def _scan(conn, farmer, disease="leaf_rust", days_ago=1, source="model", outcome="unknown"):
    conn.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, source, outcome, created_at) "
                 "VALUES (?,?,0.9,?,?,?)", (farmer, disease, source, outcome,
                                            (datetime.now() - timedelta(days=days_ago)).isoformat(sep=" ", timespec="seconds")))
    conn.commit()


def test_small_numbers_are_hidden():
    assert [reports.suppress(n) for n in (0, 1, 4, 5, 12)] == [0, "<5", "<5", 5, 12]


def test_summary_counts_and_suppression(client_as, area, platform):
    admin = add_user(platform, 50, role="admin")
    for f in (1, 2, 3, 4, 5):
        _scan(platform, f, outcome="improved" if f < 3 else "unknown")
    _scan(platform, 6, source="simulated")                       # demo data never counts
    _scan(platform, 6, days_ago=30)                              # outside the 7-day window
    r = client_as(admin).get("/api/reports/summary", params={"days": 7}).json()
    rows = {w["pcode"]: w for w in r["woredas"]}
    dewa = rows[DEWA]
    assert dewa["woreda"] == "Dewa Cheffa" and dewa["region"] == "Amhara"
    assert dewa["farmers"] == 6 and dewa["farmers_reached"] == 5 and dewa["photo_checks"] == 5
    assert dewa["by_disease"] == {"leaf_rust": 5} and dewa["outcome_improved"] == "<5"
    assert rows[area["other_amhara"]]["farmers"] == "<5"
    assert r["totals"]["farmers"] == 9 and r["disease_names"]["leaf_rust"]
    text = str(r)
    assert "Person" not in text and "091100" not in text           # no names or phones


def test_government_and_agent_scopes(client_as, area, platform):
    gov = area["place"](60, DEWA, role="government")
    rows = client_as(gov).get("/api/reports/summary").json()["woredas"]
    assert [w["pcode"] for w in rows] == [DEWA]
    assert client_as(gov).get("/api/reports/summary", params={"area": "ET04"}).status_code == 403
    agent = area["place"](61, DEWA, role="agent")
    pcodes = {w["pcode"] for w in client_as(agent).get("/api/reports/summary").json()["woredas"]}
    assert pcodes == {DEWA, area["other_amhara"]}                  # whole region, not Oromia
    scope = client_as(agent).get("/api/reports/scope").json()
    assert scope["area"] == "ET03" and scope["level"] == "region"
    no_region = add_user(platform, 62, role="agent")
    assert client_as(no_region).get("/api/reports/summary").status_code == 403
    farmer = dict(platform.execute("SELECT * FROM users WHERE id=1").fetchone())
    assert client_as(farmer).get("/api/reports/summary").status_code == 403


def test_outbreak_hotspots_at_woreda_centre(client_as, area, platform):
    admin = add_user(platform, 50, role="admin")
    for f in (1, 2, 3, 4, 5, 6):
        _scan(platform, f, "leaf_rust")
    _scan(platform, 7, "yellow_rust")
    _scan(platform, 8, "yellow_rust", source="simulated")
    _scan(platform, 1, "healthy")                                  # not a disease
    api = client_as(admin)
    spots = api.get("/api/reports/outbreaks", params={"days": 14}).json()["hotspots"]
    by = {(s["pcode"], s["disease_key"]): s for s in spots}
    dewa = by[(DEWA, "leaf_rust")]
    assert dewa["scans"] == 6 and dewa["scans_band"] == "medium" and dewa["latitude"] == pytest.approx(10.779, abs=0.01)
    assert by[(area["other_amhara"], "yellow_rust")]["scans"] == "<5"
    assert all(k[1] != "healthy" for k in by)
    with_demo = api.get("/api/reports/outbreaks", params={"days": 14, "include_simulated": True}).json()["hotspots"]
    assert any(s["includes_simulated"] for s in with_demo)
