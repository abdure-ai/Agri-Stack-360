"""Price questions answered from NMIS market data (2026-10-12): recognition in 4 languages, answer, no AI call."""

from datetime import date
from types import SimpleNamespace

import pytest

from backend.advisory import market_answer as ma
from backend.advisory import registry
from backend.advisory.assistant import ask
from tests.conftest import add_user


@pytest.mark.parametrize("question,crops", [
    ("ሽንኩርት ስንት ብር ገባ?", ["Onion"]),
    ("የቀይ ሽንኩርት ዋጋ ስንት ነው?", ["Onion"]),
    ("ነጭ ሽንኩርት ዋጋው ስንት ነው?", ["Garlic"]),          # not also onion
    ("Gatiin qullubbii meeqa?", ["Onion"]),
    ("ዋጋ ስርናይ ክንደይ እዩ?", ["Wheat"]),
    ("What is the price of teff and maize?", ["Teff", "Maize"]),
])
def test_price_questions_are_recognised(question, crops):
    assert ma.crops_in(question) == crops and ma.is_price_question(question)


@pytest.mark.parametrize("question", ["How do I control yellow rust on wheat?", "ስንዴ መቼ ልዝራ?",
                                      "Qamadii yoom facaasuu qaba?", "What is the price of fertilizer?"])
def test_other_questions_are_not_price_answers(question):
    assert not (ma.crops_in(question) and ma.is_price_question(question))


class FakeMarket:
    def __init__(self, near=True):
        self.near = near

    def nearest_markets(self, crop, lat, lon, n):
        return [{"market_id": 1, "market": "Kemise Gebeya", "region": "Amhara", "distance_km": 7.2, "method": "name_match"}] \
            if self.near else []

    def recent_markets(self, crop, region=None, n=3):
        return [{"market_id": 2, "market": "Adama", "region": region or "Oromia", "distance_km": None, "method": "region"}]

    def quote(self, crop, m):
        return SimpleNamespace(crop=crop, market=m["market"], region=m["region"], price_etb=112.0, unit="KG",
                               as_of=date(2026, 9, 30), trend="falling", forecast_change_pct=4.8, forecast_weeks=4,
                               forecast_confidence="medium")


def test_answer_text_in_amharic():
    r = ma.answer(None, crops=["Onion"], lang="am", point=(11.1, 39.8), region="Amhara", market=FakeMarket())
    assert "ቀይ ሽንኩርት" in r["text"] and "Kemise Gebeya (7.2 ኪ.ሜ)" in r["text"] and "112 ብር" in r["text"]
    assert "ኪሎ" in r["text"] and "እየቀነሰ" in r["text"] and "4.8% ይጨምራል" in r["text"]
    assert r["sources"][0]["ref"] == "M" and "NMIS" in r["sources"][0]["citation"]


def test_no_location_uses_the_region():
    r = ma.answer(None, crops=["Teff"], lang="en", point=(None, None), region="Oromia", market=FakeMarket(near=False))
    assert "in Oromia" in r["text"] and "per kg" in r["text"]


def test_ask_answers_prices_without_the_ai(platform, monkeypatch):
    add_user(platform, 1, phone="0933000001")
    monkeypatch.setattr(registry, "market", lambda conn, today=None: FakeMarket())

    class NoAI:
        name = "none"

        def generate(self, *a, **k):
            raise AssertionError("the AI must not be called for a price question")

    r = ask(platform, user={"id": 1, "role": "farmer", "language": "am"}, question="ሽንኩርት ስንት ብር ገባ?",
            farmer_id=1, llm=NoAI(), embedder=None, build_ctx=lambda fid: None, language="am")
    assert r.kind == "answer" and not r.escalated and "market_price" in r.guardrail_flags
    assert "112 ብር" in r.answer
    assert platform.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 0


def test_crops_without_nmis_prices_get_an_honest_answer_not_an_escalation(platform):
    add_user(platform, 1, phone="0933000001")
    q = "ቡና ስንት ብር ይሸጣል አሁን ጊዜ ጅማ ቡና መሸጥ ያዋጣል?"
    assert ma.crops_in(q) == [] and ma.other_crops_in(q) == ["coffee"]

    class NoAI:
        name = "none"

        def generate(self, *a, **k):
            raise AssertionError("no AI call")

    r = ask(platform, user={"id": 1, "role": "farmer", "language": "am"}, question=q, farmer_id=1, llm=NoAI(),
            embedder=None, build_ctx=lambda fid: None, language="am")
    assert r.kind == "answer" and not r.escalated
    assert "ቡና" in r.answer and "ጤፍ" in r.answer and "ቀይ ሽንኩርት" in r.answer      # lists what NMIS does have
    assert platform.execute("SELECT COUNT(*) FROM escalations").fetchone()[0] == 0
    assert ma.other_crops_in("Gatiin bunaa meeqa?") == ["coffee"]
    assert ma.crops_in("የአኩሪ አተር ዋጋ") == ["Soybean"]
