"""ABC machinery (A8): register, member bookings, scheduling in route order, job log charged to the member's account,
fuel and maintenance as expenses, utilisation, roles."""

from datetime import date, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from tests.conftest import add_user

DEWA = "ET031001"


@pytest.fixture
def world(platform, client_as):
    admin_areas.import_boundaries(platform)
    org = platform.execute("INSERT INTO organisations (name, type, woreda_pcode) VALUES ('Jiru ABC', 'abc', ?)", (DEWA,)).lastrowid
    users = {"gm": add_user(platform, 2, phone="0911000002"), "mech": add_user(platform, 3, phone="0911000003"),
             "store": add_user(platform, 4, phone="0911000004")}
    for uid, role in ((2, "general_manager"), (3, "machinery_coordinator"), (4, "store_keeper")):
        platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, ?, ?, 'x')", (org, uid, role))
    for uid, kebele in ((10, "02"), (11, "01")):
        users[uid] = add_user(platform, uid, phone=f"09110000{uid}", name=f"Member {uid}", kebele=kebele)
        platform.execute("UPDATE users SET woreda_pcode=? WHERE id=?", (DEWA, uid))
        platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, ?, 'active', 'x')", (org, uid))
    farm = platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha) VALUES (10, 'Main plot', 'wheat', 0.75)").lastrowid
    users[12] = add_user(platform, 12, phone="0911000012")                         # not a member
    platform.commit()
    return {"org": org, "farm": farm, "platform": platform, **{k: client_as(v) for k, v in users.items()}}


def test_machine_booking_job_and_charge(world, platform):
    mech, gm, org = world["mech"], world["gm"], world["org"]
    m = mech.post("/api/abc/machinery", json={"name": "Tractor 1 (ATI)", "kind": "tractor", "ownership": "ati_provided",
                                              "rate_per_ha_etb": 3000, "hours_per_week": 40}).json()
    assert world["store"].post("/api/abc/machinery", json={"name": "Truck", "kind": "truck"}).status_code == 403
    day = (date.today() + timedelta(days=3)).isoformat()
    b10 = world[10].post("/api/abc/my/bookings", json={"org_id": org, "service": "ploughing", "farm_id": world["farm"],
                                                       "requested_date": day}).json()["booking_id"]
    assert world[11].post("/api/abc/my/bookings", json={"org_id": org, "service": "ploughing", "farm_id": world["farm"],
                                                        "requested_date": day}).status_code == 400      # not their plot
    world[11].post("/api/abc/my/bookings", json={"org_id": org, "service": "ploughing", "area_ha": 0.5, "requested_date": day})
    assert world[12].post("/api/abc/my/bookings", json={"org_id": org, "service": "ploughing", "requested_date": day}).status_code == 403
    assert world[10].post("/api/abc/my/bookings", json={"org_id": org, "service": "ploughing",
                                                        "requested_date": "2020-01-01"}).status_code == 400
    queue = mech.get("/api/abc/machinery/bookings").json()
    assert [b["kebele"] for b in queue] == ["01", "02"]                            # route order: kebele
    assert queue[1]["area_ha"] == 0.75 and queue[1]["field_name"] == "Main plot"
    assert mech.post(f"/api/abc/machinery/bookings/{b10}/schedule", json={"machine_id": m["id"], "scheduled_date": day}).json()["status"] == "scheduled"
    job = mech.post("/api/abc/machinery/jobs", json={"machine_id": m["id"], "booking_id": b10, "job_date": date.today().isoformat(),
                                                     "hectares": 0.75, "operator": "Kebede", "fuel_litres": 9,
                                                     "fuel_cost_etb": 1100}).json()
    assert job["charge_etb"] == 2250 and job["member_txn_id"]
    acc = {a["farmer_id"]: a for a in gm.get("/api/abc/finance/members").json()}
    assert acc[10]["services_etb"] == 2250 and acc[10]["balance_etb"] == 2250
    assert gm.get("/api/abc/finance/summary").json()["expense_etb"] == 1100       # fuel
    mine = world[10].get("/api/abc/my/bookings").json()
    assert mine[0]["status"] == "done" and mine[0]["machine"] == "Tractor 1 (ATI)"
    assert mech.post("/api/abc/machinery/jobs", json={"machine_id": m["id"], "booking_id": b10,
                                                      "job_date": date.today().isoformat(), "hectares": 1}).status_code == 400


def test_utilisation_maintenance_and_out_of_service(world):
    mech, gm = world["mech"], world["gm"]
    m = mech.post("/api/abc/machinery", json={"name": "Pump", "kind": "pump", "rate_per_hour_etb": 200, "hours_per_week": 14}).json()
    mech.post("/api/abc/machinery/jobs", json={"machine_id": m["id"], "farmer_id": 11, "job_date": date.today().isoformat(),
                                               "service": "other", "hours": 6})
    row = mech.get("/api/abc/machinery").json()["machines"][0]
    assert row["hours_30d"] == 6 and row["available_hours_30d"] == 60 and row["utilisation_percent"] == 10.0
    assert mech.post("/api/abc/machinery/jobs", json={"machine_id": m["id"], "job_date": date.today().isoformat()}).status_code == 400
    mech.post(f"/api/abc/machinery/{m['id']}/maintenance", json={"service_date": date.today().isoformat(), "description": "Seal replaced",
                                                                 "cost_etb": 800, "next_due": (date.today() - timedelta(days=1)).isoformat(),
                                                                 "condition": "out_of_service"})
    row = mech.get("/api/abc/machinery").json()["machines"][0]
    assert row["service_due"] and row["condition"] == "out_of_service"
    assert gm.get("/api/abc/finance/summary").json()["expense_etb"] == 800
    bid = mech.post("/api/abc/machinery/bookings", json={"farmer_id": 11, "service": "other", "area_ha": 0.5,
                                                         "requested_date": date.today().isoformat()}).json()["booking_id"]
    assert mech.post(f"/api/abc/machinery/bookings/{bid}/schedule", json={"machine_id": m["id"],
                                                                         "scheduled_date": date.today().isoformat()}).status_code == 400
    assert world[10].post(f"/api/abc/my/bookings/{bid}/cancel").status_code == 404     # not their booking
    assert mech.post(f"/api/abc/machinery/bookings/{bid}/cancel").json()["cancelled"]
    actions = {h["action"] for h in gm.get("/api/abc/history").json()}
    assert {"abc.machine.add", "abc.machine.job", "abc.machine.maintenance", "abc.booking.cancel"} <= actions
