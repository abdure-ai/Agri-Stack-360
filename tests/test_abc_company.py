"""ABC company core (A1): legal rules as data, per-ABC roles and capabilities, profile, audit with before/after."""

from datetime import date, timedelta

import pytest

from backend import abc_company as core
from tests.conftest import add_user


@pytest.fixture
def abc(platform, client_as):
    org = platform.execute("INSERT INTO organisations (name, type) VALUES ('Jiru ABC', 'abc')").lastrowid
    other = platform.execute("INSERT INTO organisations (name, type) VALUES ('Other ABC', 'abc')").lastrowid
    users = {
        "admin": add_user(platform, 1, role="admin"),
        "gm": add_user(platform, 2, role="farmer", phone="0911000002"),
        "chair": add_user(platform, 3, role="farmer", phone="0911000003"),
        "farmer": add_user(platform, 4, role="farmer", phone="0911000004"),
        "auditor": add_user(platform, 5, role="farmer", phone="0911000005"),
        "legacy": add_user(platform, 6, role="abc_manager", phone="0911000006"),
    }
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 2, 'general_manager', '2026-10-01')", (org,))
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 3, 'chair', '2026-10-01')", (org,))
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 5, 'auditor', '2026-10-01')", (org,))
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 5, 'auditor', '2026-10-01')", (other,))
    platform.execute("INSERT INTO organisation_members (org_id, user_id, member_role) VALUES (?, 6, 'staff')", (org,))
    platform.commit()
    return {"org": org, "other": other, **{k: client_as(v) for k, v in users.items()}, "users": users}


def test_rules_are_data_with_type_overrides_and_effective_dates(platform):
    assert core.rule(platform, "min_founding_members", "crop_grain").value == 300
    assert core.rule(platform, "min_founding_members", "livestock").value == 150
    assert core.rule(platform, "max_ownership_fraction", "fruit").value == 0.15          # '*' row
    r = core.rule(platform, "share_value_min_etb")
    assert r.verification_status == "PLACEHOLDER_VERIFY" and "Verify" in r.source
    assert core.rule(platform, "voting_land_factor").verification_status == "platform_default"
    with pytest.raises(KeyError):
        core.rule(platform, "min_founding_members", "crop_grain", on=date(2026, 1, 1))   # before the law


def test_admin_rule_change_applies_from_its_date_and_keeps_history(abc, platform):
    later = date.today() + timedelta(days=30)
    r = abc["admin"].post("/api/admin/abc-rules", json={
        "key": "min_founding_members", "abc_type": "crop_grain", "value": 250, "unit": "members",
        "effective_from": later.isoformat(), "source": "Directive No. X/2026, art. 4", "verification_status": "verified"})
    assert r.status_code == 201
    assert core.rule(platform, "min_founding_members", "crop_grain").value == 300                  # today
    assert core.rule(platform, "min_founding_members", "crop_grain", on=later).value == 250       # from the date
    rows = [x for x in abc["admin"].get("/api/admin/abc-rules").json() if x["key"] == "min_founding_members"
            and x["abc_type"] == "crop_grain"]
    assert [x["value"] for x in rows] == [250, 300]
    entry = platform.execute("SELECT detail FROM audit_log WHERE action='abc.rule.add'").fetchone()[0]
    assert '"before"' in entry and "300" in entry and "250" in entry
    assert abc["gm"].post("/api/admin/abc-rules", json={"key": "min_founding_members", "value": 1,
                                                          "effective_from": "2026-11-01", "source": "xxxxx"}).status_code == 403
    assert abc["admin"].post("/api/admin/abc-rules", json={"key": "made_up_rule", "value": 1,
                                                             "effective_from": "2026-11-01", "source": "xxxxx"}).status_code == 400


def test_roles_decide_what_each_person_can_do(abc):
    org = abc["org"]
    me = abc["gm"].get("/api/abc/company").json()                       # single ABC: no org_id needed
    assert me["org"]["id"] == org and me["my_roles"] == ["general_manager"] and "manage" in me["capabilities"]
    assert me["profile"]["status"] == "formation" and me["profile"]["fiscal_year_start"] == "hamle"
    assert {r["key"] for r in me["rules"]} >= {"min_founding_members", "max_ownership_fraction"}
    chair = abc["chair"].get("/api/abc/company").json()
    assert "approve" in chair["capabilities"] and "finance" not in chair["capabilities"]
    assert abc["chair"].put("/api/abc/company", json={"kebele": "X"}).status_code == 403
    assert abc["farmer"].get("/api/abc/company").status_code == 403               # no role
    assert abc["auditor"].get("/api/abc/company").status_code == 400              # two ABCs: must choose
    assert abc["auditor"].get("/api/abc/history", params={"org_id": org}).status_code == 200
    assert abc["auditor"].get("/api/abc/team", params={"org_id": abc["other"]}).status_code == 200
    assert abc["gm"].get("/api/abc/company", params={"org_id": abc["other"]}).status_code == 403   # not theirs
    legacy = abc["legacy"].get("/api/abc/company").json()                       # M12 abc_manager = GM
    assert legacy["my_roles"] == ["general_manager"]
    assert abc["admin"].get("/api/abc/company").status_code == 400
    assert abc["admin"].get("/api/abc/company", params={"org_id": org}).json()["capabilities"]


def test_profile_update_is_audited_with_before_and_after(abc, platform):
    r = abc["gm"].put("/api/abc/company", json={"abc_type": "horticulture", "declared_capital_etb": 2_000_000,
                                                 "board_approval_limit_etb": 50_000})
    assert r.status_code == 200 and r.json()["abc_type"] == "horticulture"
    rules = {x["key"]: x for x in abc["gm"].get("/api/abc/company").json()["rules"]}
    assert rules["min_founding_members"]["value"] == 150                          # follows the new type
    hist = abc["gm"].get("/api/abc/history").json()
    assert hist[0]["action"] == "abc.profile.update"
    assert hist[0]["detail"]["before"]["abc_type"] == "crop_grain" and hist[0]["detail"]["after"]["abc_type"] == "horticulture"
    platform.execute("UPDATE abc_profiles SET status='registered' WHERE org_id=?", (abc["org"],))
    platform.commit()
    assert abc["gm"].put("/api/abc/company", json={"abc_type": "fruit"}).status_code == 400


def test_team_roles_committee_limit_and_payload(abc, platform):
    gm, org = abc["gm"], abc["org"]
    assert gm.post("/api/abc/team", json={"phone": "0911000004", "role": "board_member"}).status_code == 201
    assert "abc:member" in abc["farmer"].get("/api/auth/me").json()["permissions"]
    me = abc["farmer"].get("/api/auth/me").json()["abc_companies"]
    assert me == [{"org_id": org, "name": "Jiru ABC", "org_status": "active", "roles": ["board_member"]}]
    assert gm.post("/api/abc/team", json={"phone": "0999999999", "role": "accountant"}).status_code == 404
    assert gm.post("/api/abc/team", json={"phone": "0911000004", "role": "king"}).status_code == 422
    for uid in range(20, 33):
        add_user(platform, uid, phone=f"09110000{uid}")
        assert gm.post("/api/abc/team", json={"phone": f"09110000{uid}", "role": "organizing_committee"}).status_code == 201
    add_user(platform, 40, phone="0911000040")
    r = gm.post("/api/abc/team", json={"phone": "0911000040", "role": "organizing_committee"})
    assert r.status_code == 400 and "13" in r.json()["detail"]                    # committee max from the rules
    assert gm.delete("/api/abc/team/4/board_member").status_code == 204
    assert gm.delete("/api/abc/team/4/board_member").status_code == 404
    assert abc["chair"].delete("/api/abc/team/2/general_manager").status_code == 204   # chair manages the team
    actions = [h["action"] for h in abc["auditor"].get("/api/abc/history", params={"org_id": org}).json()]
    assert actions.count("abc.role.remove") == 2 and "abc.role.add" in actions


def test_last_team_manager_cannot_remove_themselves(abc, platform):
    platform.execute("DELETE FROM abc_roles WHERE role='chair'")
    platform.execute("DELETE FROM organisation_members WHERE user_id=6")
    platform.commit()
    r = abc["gm"].delete("/api/abc/team/2/general_manager")
    assert r.status_code == 400
