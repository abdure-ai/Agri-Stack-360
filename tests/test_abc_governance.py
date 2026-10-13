"""ABC governance (A5): voting weights from land and production, frozen snapshots, weighted quorum and votes,
board meetings, member confirmation, minutes, notices, audit."""

import pytest

from tests.conftest import add_user

# member: (land ha, production qt)
MEMBERS = {10: (2.0, 60.0), 11: (1.0, 20.0), 12: (1.0, 20.0)}


@pytest.fixture
def world(platform, client_as):
    org = platform.execute("INSERT INTO organisations (name, type) VALUES ('Jiru ABC', 'abc')").lastrowid
    users = {"gm": add_user(platform, 2, phone="0911000002"), "chair": add_user(platform, 3, phone="0911000003"),
             "board": add_user(platform, 4, phone="0911000004"), "secretary": add_user(platform, 5, phone="0911000005")}
    for uid, role in ((2, "general_manager"), (3, "chair"), (4, "board_member"), (5, "secretary")):
        platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, ?, ?, 'x')", (org, uid, role))
    for uid, (land, _) in MEMBERS.items():
        users[uid] = add_user(platform, uid, phone=f"09110000{uid}", name=f"Member {uid}")
        platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, ?, 'active', 'x')", (org, uid))
        platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha) VALUES (?, 'Plot', 'wheat', ?)", (uid, land))
    platform.commit()
    return {"org": org, "platform": platform, **{k: client_as(v) for k, v in users.items()}}


def test_weights_follow_the_formula(world):
    gm = world["gm"]
    w = gm.get("/api/abc/voting/weights").json()
    assert w["land_only"] and {m["farmer_id"]: m["weight"] for m in w["members"]} == {10: 0.5, 11: 0.25, 12: 0.25}
    for uid, (_, prod) in MEMBERS.items():
        assert gm.post("/api/abc/voting/production", json={"farmer_id": uid, "season": "2018 irrigated",
                                                           "quantity_qt": prod}).status_code == 201
    w = gm.get("/api/abc/voting/weights").json()
    # 0.5 × land share + 0.5 × production share: 10 -> 0.5*0.5 + 0.5*0.6 = 0.55; 11, 12 -> 0.125 + 0.1 = 0.225
    assert {m["farmer_id"]: m["weight"] for m in w["members"]} == {10: 0.55, 11: 0.225, 12: 0.225}
    assert round(sum(m["weight"] for m in w["members"]), 6) == 1.0 and not w["land_only"]
    assert world["chair"].post("/api/abc/voting/production", json={"farmer_id": 10, "season": "2018", "quantity_qt": 1}).status_code == 403


def test_general_assembly_quorum_and_weighted_vote(world, platform):
    gm, sec, chair = world["gm"], world["secretary"], world["chair"]
    for uid, (_, prod) in MEMBERS.items():
        gm.post("/api/abc/voting/production", json={"farmer_id": uid, "season": "2018", "quantity_qt": prod})
    m = sec.post("/api/abc/meetings", json={"kind": "general_assembly", "title": "Annual assembly",
                                            "scheduled_at": "2026-11-01T09:00", "location": "Kemise hall",
                                            "agenda": ["Budget", "Board election", " "]}).json()
    assert m["agenda"] == ["Budget", "Board election"] and m["snapshot_id"]
    # later production change does not move this meeting's weights (frozen snapshot)
    gm.post("/api/abc/voting/production", json={"farmer_id": 11, "season": "2018", "quantity_qt": 500})
    assert {v["user_id"]: v["weight"] for v in m["voters"]} == {10: 0.55, 11: 0.225, 12: 0.225}
    assert sec.post(f"/api/abc/meetings/{m['id']}/notify").json()["sent"] == 3
    assert platform.execute("SELECT COUNT(*) FROM alerts WHERE type='abc_meeting'").fetchone()[0] == 3
    q = sec.put(f"/api/abc/meetings/{m['id']}/attendance", json={"present": [11, 12]}).json()
    assert q["present_weight"] == 0.45 and not q["met"]                              # 45% < 50%
    mo = sec.post(f"/api/abc/meetings/{m['id']}/motions", json={"title": "Approve the 2019 budget"}).json()["motion_id"]
    r = sec.post(f"/api/abc/motions/{mo}/votes", json={"votes": [{"user_id": 10, "choice": "yes"}]})
    assert r.status_code == 400                                                      # not marked present
    sec.post(f"/api/abc/motions/{mo}/votes", json={"votes": [{"user_id": 11, "choice": "yes"}, {"user_id": 12, "choice": "no"}]})
    closed = sec.post(f"/api/abc/motions/{mo}/close").json()
    assert closed["result"] == "no_quorum"
    q = sec.put(f"/api/abc/meetings/{m['id']}/attendance", json={"present": [10, 11, 12]}).json()
    assert q["met"] and q["fraction"] == 1.0
    mo2 = sec.post(f"/api/abc/meetings/{m['id']}/motions", json={"title": "Elect the board"}).json()["motion_id"]
    t = sec.post(f"/api/abc/motions/{mo2}/votes", json={"votes": [
        {"user_id": 10, "choice": "no"}, {"user_id": 11, "choice": "yes"}, {"user_id": 12, "choice": "yes"}]}).json()
    assert t["counts"] == {"yes": 2, "no": 1, "abstain": 0} and t["weights"]["no"] == 0.55 and not t["would_pass"]
    assert sec.post(f"/api/abc/motions/{mo2}/close").json()["result"] == "failed"    # more people, less weight
    assert sec.post(f"/api/abc/motions/{mo2}/votes", json={"votes": [{"user_id": 10, "choice": "yes"}]}).status_code == 400
    assert world[10].get("/api/abc/meetings").status_code == 403                      # members use /abc/my
    mine = world[10].get("/api/abc/my/votes").json()
    assert mine[0]["choice"] == "no" and mine[0]["confirmed_at"] is None
    assert world[10].post(f"/api/abc/my/votes/{mine[0]['id']}/confirm", json={"correct": False}).json()["correct"] is False
    assert world[11].post(f"/api/abc/my/votes/{mine[0]['id']}/confirm", json={}).status_code == 404   # not their vote
    detail = gm.get(f"/api/abc/meetings/{m['id']}").json()
    assert detail["motions"][1]["votes"]["10"]["disputed"] == 1


def test_board_meeting_counts_board_members_and_minutes_need_approval(world):
    gm, sec, chair, board = world["gm"], world["secretary"], world["chair"], world["board"]
    m = gm.post("/api/abc/meetings", json={"kind": "board", "title": "Board meeting October",
                                           "scheduled_at": "2026-10-20T14:00"}).json()
    assert {v["user_id"] for v in m["voters"]} == {3, 4} and m["snapshot_id"] is None
    assert sec.put(f"/api/abc/meetings/{m['id']}/attendance", json={"present": [10]}).status_code == 400   # not on the board
    sec.put(f"/api/abc/meetings/{m['id']}/attendance", json={"present": [3]})
    mo = sec.post(f"/api/abc/meetings/{m['id']}/motions", json={"title": "Buy a second tractor"}).json()["motion_id"]
    t = sec.post(f"/api/abc/motions/{mo}/votes", json={"votes": [{"user_id": 3, "choice": "yes"}]}).json()
    assert t["quorum"]["met"] and t["weights"]["yes"] == 1.0                         # 1 of 2 board members = 50%
    assert sec.post(f"/api/abc/motions/{mo}/close").json()["result"] == "passed"
    assert sec.post(f"/api/abc/meetings/{m['id']}/minutes/approve").status_code == 403   # secretary can't approve
    assert chair.post(f"/api/abc/meetings/{m['id']}/minutes/approve").status_code == 400  # nothing written yet
    sec.put(f"/api/abc/meetings/{m['id']}/minutes", json={"text": "Present: chair. The board agreed to buy a tractor."})
    assert board.post(f"/api/abc/meetings/{m['id']}/minutes/approve").status_code == 200
    assert sec.put(f"/api/abc/meetings/{m['id']}/minutes", json={"text": "Changed afterwards text"}).status_code == 400
    assert gm.post(f"/api/abc/meetings/{m['id']}/cancel").status_code == 400          # already held
    actions = {h["action"] for h in gm.get("/api/abc/history").json()}
    assert {"abc.meeting.create", "abc.meeting.attendance", "abc.motion.close", "abc.minutes.approve"} <= actions
