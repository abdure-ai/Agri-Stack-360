"""Daily tips (2026-10-11): AI drafts from the guidelines, guardrails, expert approval, visibility, Telegram /tip."""

import json
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend import telegram_bot as tg
from backend import tips
from backend.advisory.config import local_now
from backend.advisory.knowledge.search import invalidate_cache
from backend.advisory.providers import ProviderError
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user
from tests.test_telegram_bot import CHAT, FakeAPI, msg

ROOT = Path(__file__).resolve().parents[1]
TODAY = local_now().date()


class FakeLLM:
    def __init__(self, reply=None, fail=False):
        self.reply, self.fail, self.prompts = reply, fail, []

    def generate(self, system, turns, **kw):
        self.prompts.append(turns[-1].content)
        if self.fail:
            raise ProviderError("quota")
        return json.dumps(self.reply)


GOOD = {"usable": True,
        "title": {"en": "Weed early", "am": "ቀድመው ያርሙ", "om": "Dafanii aramaa", "ti": "ቀልጢፍኩም ኣረሙ"},
        "tip": {"en": "Remove weeds in the first weeks after sowing [S1].", "am": "ከዘሩ በኋላ ባሉት ሳምንታት አረም ያስወግዱ [S1]።",
                "om": "Torbanoota facaasaa booda aramaa [S1].", "ti": "ድሕሪ ዝርኣት ኣብ ዘለዉ ሰሙናት ኣረም ኣልግሱ [S1]።"}}


@pytest.fixture
def kb(platform):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    platform.execute("""INSERT INTO knowledge_documents (id, title, language, crops, topics, version_label, page_count, status)
                        VALUES (1, 'MoA Wheat Manual', 'en', '["wheat"]', '[]', 'v1', 10, 'active')""")
    platform.execute("""INSERT INTO knowledge_chunks (document_id, chunk_index, text, page_start, page_end, crop, topic, language)
                        VALUES (1, 0, 'Weed control: remove weeds in the first weeks after sowing wheat. Weeding and
                        scouting for rust, seed selection, irrigation scheduling, fertilizer timing and harvest storage
                        all matter.', 3, 3, 'wheat', 'weeds', 'en')""")
    platform.commit()
    invalidate_cache()
    yield platform
    invalidate_cache()


def test_ai_draft_is_cited_translated_and_waits_for_approval(kb):
    llm = FakeLLM(GOOD)
    ids = tips.draft_day(kb, TODAY, llm=llm, count=2)
    assert len(ids) == 2
    t = tips.get(kb, ids[0])
    assert t["status"] == "draft" and t["origin"] == "ai" and set(t["body"]) == {"en", "am", "om", "ti"}
    assert t["sources"][0]["citation"].startswith("MoA Wheat Manual")
    assert "0933" not in llm.prompts[0] and "Abebe" not in llm.prompts[0]          # no personal data
    assert tips.today_or_recent(kb, {"role": "farmer"}, "en") == []                  # nothing before approval
    tips.draft_day(kb, TODAY, llm=llm, count=2)                                       # second run: new topics only
    topics = [r[0] for r in kb.execute("SELECT topic FROM daily_tips")]
    assert len(topics) == 4 and len(set(topics)) == 4


def test_unsafe_or_uncited_ai_tip_is_dropped(kb):
    bad = {**GOOD, "tip": {**GOOD["tip"], "en": "Spray PLACEHOLDER_FUNGICIDE_A at 2 litres per hectare."}}
    assert tips.draft_day(kb, TODAY, llm=FakeLLM(bad), count=1) == []
    assert tips.draft_day(kb, TODAY, llm=FakeLLM({"usable": False}), count=1) == []


def test_calendar_fallback_when_ai_unavailable(kb):
    add_user(kb, 1, phone="0933000001", name="Abebe", altitude_m=1641)
    kb.execute("UPDATE users SET region_pcode='ET03', region='Amhara' WHERE id=1")
    kb.execute("INSERT INTO farms (id, user_id, field_name, crop_name, area_ha) VALUES (5, 1, 'P', 'wheat', 1)")
    kb.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season, status) VALUES (5, 'wheat', ?, 'irrigated', 'active')",
               ((TODAY - timedelta(days=25)).isoformat(),))
    kb.commit()
    ids = tips.draft_day(kb, TODAY, llm=FakeLLM(fail=True), count=1)
    t = tips.get(kb, ids[0])
    assert t["origin"] == "calendar" and t["region_pcode"] == "ET03" and "[S1]" in t["body"]["en"]


def test_review_flow_and_visibility(kb, client_as):
    reviewer = add_user(kb, 3, role="agronomist")
    farmer = add_user(kb, 1, phone="0933000001")
    trader = add_user(kb, 2, role="trader")
    kb.execute("UPDATE users SET region_pcode='ET03' WHERE id=1"); kb.commit()
    r = client_as(reviewer)
    body = {"tip_date": TODAY.isoformat(), "title": {"en": "Check rust"}, "body": {"en": "Look under the leaves [S1]."},
            "audience": ["farmer"], "region_pcode": "ET03"}
    assert r.post("/api/review/tips", json={**body, "body": {"am": "x"}}).status_code == 400   # English needed
    tip = r.post("/api/review/tips", json=body).json()
    assert tip["origin"] == "expert" and tip["status"] == "draft"
    f = client_as({**farmer, "region_pcode": "ET03", "language": "am"})
    assert f.get("/api/tips/today").json() == []
    assert r.post(f"/api/review/tips/{tip['id']}/approve").json()["status"] == "approved"
    shown = f.get("/api/tips/today").json()
    assert shown[0]["title"] == "Check rust" and shown[0]["language"] == "en"           # falls back to English
    assert client_as(trader).get("/api/tips/today").json() == []                         # audience: farmers only
    assert client_as({**farmer, "region_pcode": "ET04"}).get("/api/tips/today").json() == []   # other region
    # Editing an approved tip sends it back for review.
    assert r.put(f"/api/review/tips/{tip['id']}", json=body).json()["status"] == "draft"
    assert f.get("/api/tips/today").json() == []
    assert f.get("/api/review/tips").status_code == 403
    assert f.post("/api/review/tips/draft", json={}).status_code == 403


def test_recent_tips_when_today_has_none(kb, client_as):
    reviewer = add_user(kb, 3, role="agronomist")
    r = client_as(reviewer)
    yesterday = (TODAY - timedelta(days=1)).isoformat()
    tip = r.post("/api/review/tips", json={"tip_date": yesterday, "title": {"en": "Old"}, "body": {"en": "Text."}}).json()
    r.post(f"/api/review/tips/{tip['id']}/approve")
    assert client_as({"id": 1, "role": "farmer"}).get("/api/tips/today").json()[0]["tip_date"] == yesterday


def test_scheduler_drafts_tomorrow_once(kb):
    s = tips.TipScheduler(lambda: kb, lambda: FakeLLM(GOOD), lambda: None)
    morning = datetime.combine(TODAY, datetime.min.time()).replace(hour=6)
    assert len(s.run_once(morning)) == 3
    assert s.run_once(morning) == []
    assert s.run_once(morning.replace(hour=3)) == []
    kb.execute("UPDATE advisory_settings SET value='0' WHERE key='daily_tips_auto'"); kb.commit()
    assert s.run_once(morning + timedelta(days=1)) == []


def test_telegram_tip_command(kb):
    tg.ensure_schema(kb)
    add_user(kb, 1, role="agronomist")
    t = tips.save(kb, None, {"tip_date": TODAY.isoformat(), "title": {"en": "Weed early"},
                             "body": {"en": "Remove weeds [S1]."}}, 1)
    api = FakeAPI()
    bot = tg.Bot(kb, api)
    bot.handle(msg("/tip"))
    assert api.sent[-1][1] == tg.t("tg_no_tip", "am")
    tips.decide(kb, t["id"], True, 1)
    bot.handle(msg("/tip"))
    assert "Weed early" in api.sent[-1][1]


def test_admin_writes_and_publishes_in_one_step(kb, client_as):
    admin = add_user(kb, 9, role="admin")
    a = client_as(admin)
    tip = a.post("/api/review/tips", json={"tip_date": TODAY.isoformat(), "title": {"en": "Clean canals"},
                                           "body": {"en": "Clear field canals before irrigating."}, "publish": True}).json()
    assert tip["status"] == "approved" and tip["reviewed_by"] == 9
    assert client_as({"id": 1, "role": "farmer"}).get("/api/tips/today").json()[0]["title"] == "Clean canals"
    edited = a.put(f"/api/review/tips/{tip['id']}", json={"tip_date": TODAY.isoformat(), "title": {"en": "Clean canals"},
                                                          "body": {"en": "Changed."}}).json()
    assert edited["status"] == "draft"                                  # an edit without publish goes back to review
