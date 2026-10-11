"""NGO project workspace (checklist 1.12; M15): projects, areas, consent-respecting messages, impact report."""

from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


@pytest.fixture
def ngo(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    admin = add_user(platform, 9, role="admin")
    staff = add_user(platform, 90, role="ngo_staff", phone="0911000090")
    for uid in range(1, 7):                                   # 6 farmers in Dewa Cheffa; 1-3 accept alerts
        add_user(platform, uid, phone=f"09330000{uid:02d}", name=f"Farmer {uid}", consent_alerts=int(uid <= 3))
        chain = admin_areas.lineage(platform, DEWA)
        platform.execute("UPDATE users SET region_pcode=?, zone_pcode=?, woreda_pcode=? WHERE id=?",
                         (chain[0].pcode, chain[1].pcode, chain[2].pcode, uid))
        platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, outcome, created_at) VALUES (?, 'leaf_rust', 0.9, 'improved', ?)",
                         (uid, datetime.now().isoformat(sep=" ", timespec="seconds")))
    platform.commit()
    a = client_as(admin)
    org = a.post("/api/admin/orgs", json={"name": "PLACEHOLDER NGO", "type": "ngo"}).json()["id"]
    assert a.post(f"/api/admin/orgs/{org}/members", json={"phone": "0911000090"}).status_code == 201
    return {"staff": staff}


def test_project_areas_messages_and_impact(client_as, ngo, platform):
    s = client_as(ngo["staff"])
    start = (date.today() - timedelta(days=30)).isoformat()
    assert s.post("/api/ngo/projects", json={"name": "Project", "start_date": start, "end_date": "2020-01-01"}).status_code == 400
    pid = s.post("/api/ngo/projects", json={"name": "Wheat rust project", "start_date": start}).json()["id"]
    assert s.post(f"/api/ngo/projects/{pid}/broadcast", json={"text": "Scout your wheat this week."}).status_code == 400   # no areas
    assert s.get(f"/api/ngo/projects/{pid}/impact").json()["summary"] is None                                       # never the whole country
    assert s.post(f"/api/ngo/projects/{pid}/areas", json={"woreda_pcode": "ET03"}).status_code == 400
    assert s.post(f"/api/ngo/projects/{pid}/areas", json={"woreda_pcode": DEWA}).status_code == 201
    r = s.post(f"/api/ngo/projects/{pid}/broadcast", json={"text": "Scout your wheat this week."}).json()
    assert r == {"sent": "<5", "farmers_in_area": 6, "not_sent": "<5"}                    # 3 sent, 3 without consent
    assert platform.execute("SELECT COUNT(*) FROM alerts WHERE type='ngo_message'").fetchone()[0] == 3
    imp = s.get(f"/api/ngo/projects/{pid}/impact").json()
    assert imp["areas"][0]["woreda"] == "Dewa Cheffa"
    assert imp["summary"]["totals"]["photo_checks"] == 6 and imp["summary"]["totals"]["outcome_improved"] == 6
    assert "Farmer" not in str(imp)
    csv_text = s.get(f"/api/ngo/projects/{pid}/impact.csv").text
    assert "Dewa Cheffa" in csv_text and "TOTAL" in csv_text


def test_ngo_staff_only(client_as, ngo):
    assert client_as({"id": 1, "role": "farmer"}).get("/api/ngo/projects").status_code == 403
