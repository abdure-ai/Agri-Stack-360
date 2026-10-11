"""Assistant pipeline (spec F3) with a scripted fake LLM: grounding, guardrails, escalation, storage."""

import json
import sqlite3
from datetime import datetime
from pathlib import Path

import pytest

from backend.advisory.assistant import ask, context_summary, record_feedback
from backend.advisory.knowledge.search import invalidate_cache
from backend.advisory.knowledge.store import DocumentMeta, ingest_pdf
from backend.advisory.providers import ProviderError
from backend.advisory.schema import ensure_schema
from backend.advisory.seed_loader import load_seed
from tests.advisory.test_knowledge import FakeEmbedder

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / "data" / "knowledge" / "moa" / "bread-and-duram-wheat-package-2016.pdf"
NOW = datetime(2026, 10, 5, 9, 0)


class FakeLLM:
    """Returns queued replies and records the prompts it was given."""
    name = "fake"

    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls = []

    def generate(self, system, turns, *, temperature=0.2, response_json=False, replay_key=None):
        self.calls.append((system, turns))
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply if isinstance(reply, str) else json.dumps(reply, ensure_ascii=False)


@pytest.fixture(scope="module")
def conn():
    if not PACKAGE.exists():
        pytest.skip("wheat package PDF not present")
    c = sqlite3.connect(":memory:", check_same_thread=False)
    c.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT, language TEXT);
        CREATE TABLE farms (id INTEGER PRIMARY KEY, user_id INTEGER);
        INSERT INTO users VALUES (1, 'Farmer', 'farmer', 'am'), (2, 'DA', 'agent', 'am');
    """)
    ensure_schema(c)
    load_seed(c, ROOT / "data" / "advisory_seed")
    c.execute("INSERT INTO farmer_profiles (user_id, assigned_da_id) VALUES (1, 2)")
    ingest_pdf(c, PACKAGE, DocumentMeta(title="MoA Bread and Durum Wheat Production Package", crops=["wheat"],
                                        version_label="2016 E.C."), FakeEmbedder())
    c.commit()
    yield c
    invalidate_cache()


USER = {"id": 1, "role": "farmer", "language": "am"}


def run(conn, llm, question, **kw):
    return ask(conn, user=USER, question=question, farmer_id=1, llm=llm, embedder=FakeEmbedder(),
               build_ctx=lambda fid: None, now=NOW, **kw)


def test_grounded_answer_keeps_citation_and_cited_dose(conn):
    llm = FakeLLM({"answerable": True, "confidence": "high",
                   "answer": "On black soil apply 200 - 250 kg/ha urea: one third at sowing and the rest 30 to 35 days "
                             "after sowing, after weeding [S1]."})
    r = run(conn, llm, "How much urea for bread wheat?", language="en")
    assert r.kind == "answer" and r.escalated is False
    assert "200 - 250 kg/ha" in r.answer
    assert r.sources[0]["citation"].startswith("MoA Bread and Durum Wheat Production Package, 2016 E.C., p.")
    assert r.confidence == "high"
    system, turns = llm.calls[0]
    assert "Reply in English" in system
    assert "<sources>" in turns[-1].content and "Urea" in turns[-1].content


def test_uncited_answer_becomes_dont_know_and_escalates(conn):
    r = run(conn, FakeLLM({"answerable": True, "confidence": "high", "answer": "Use more urea, it is good."}),
            "How much urea for bread wheat?", language="en")
    assert r.kind == "dont_know" and r.escalated and r.escalation_reason == "no_knowledge"
    assert "Development Agent" in r.answer and "8028" in r.answer
    row = conn.execute("SELECT reason, assigned_to FROM escalations WHERE message_id=?", (r.message_id,)).fetchone()
    assert row == ("no_knowledge", 2)          # routed to the farmer's assigned DA


def test_not_answerable_escalates(conn):
    r = run(conn, FakeLLM({"answerable": False, "answer": "", "confidence": "low"}),
            "How do I grow mangoes?", language="en")
    assert r.kind == "dont_know" and r.escalated


def test_product_and_dose_from_document_are_stripped(conn):
    llm = FakeLLM({"answerable": True, "confidence": "high",
                   "answer": "Yellow rust is a serious wheat disease [S1]. Spray Natura 250 EW at 0.65 L/ha [S1]. "
                             "Scout your field every week [S1]."})
    r = run(conn, llm, "How do I control yellow rust?", language="en")
    assert r.kind == "answer"
    assert "Natura" not in r.answer and "0.65" not in r.answer
    assert "Scout your field" in r.answer
    assert any(f.startswith("unregistered_product") for f in r.guardrail_flags)
    assert r.confidence in ("medium", "low")


def test_everything_stripped_counts_as_guardrail_block(conn):
    r = run(conn, FakeLLM({"answerable": True, "confidence": "high", "answer": "Spray Tilt 250 EC at 0.5 L/ha [S1]."}),
            "What should I spray for rust?", language="en")
    assert r.kind == "dont_know" and r.escalation_reason == "guardrail_block"


def test_chemical_advice_gets_safety_text(conn):
    llm = FakeLLM({"answerable": True, "confidence": "medium",
                   "answer": "If rust spreads, use an approved fungicide from the treatment plan [S1]."})
    r = run(conn, llm, "Should I spray for rust?", language="en")
    assert r.kind == "answer" and "safety_text_added" in r.guardrail_flags
    assert "seek medical help immediately" in r.answer


def test_low_confidence_adds_uncertainty_note_in_users_language(conn):
    llm = FakeLLM({"answerable": True, "confidence": "low", "answer": "ማሳዎን በየሳምንቱ ይቃኙ [S1]።"})
    r = run(conn, llm, "ስንዴዬን ምን ላድርግ?")
    assert r.language == "am" and "እርግጠኛ አይደለሁም" in r.answer


def test_poisoning_never_reaches_llm(conn):
    llm = FakeLLM()
    r = run(conn, llm, "My child swallowed the spray, what do I do?", language="en")
    assert r.kind == "poisoning" and llm.calls == [] and "seek medical help immediately" in r.answer


def test_banned_product_request_refused_without_llm(conn):
    llm = FakeLLM()
    r = run(conn, llm, "Where can I buy PLACEHOLDER_BANNED_PRODUCT?", language="en")
    assert r.kind == "product_refusal" and llm.calls == [] and "PLACEHOLDER_FUNGICIDE_A" in r.answer


def test_person_request_escalates_to_da(conn):
    r = run(conn, FakeLLM(), "I want to talk to a person", language="en")
    assert r.kind == "person" and r.escalated and r.escalation_reason == "asked_for_person"


def test_llm_outage_saves_question_and_escalates(conn):
    r = run(conn, FakeLLM(ProviderError("down")), "How much urea for bread wheat?", language="en")
    assert r.kind == "unavailable" and r.escalated and "llm_unavailable" in r.guardrail_flags


def test_follow_up_uses_conversation_history(conn):
    first = run(conn, FakeLLM({"answerable": True, "confidence": "high",
                               "answer": "Use 200 - 250 kg/ha urea on black soil [S1]."}),
                "How much urea for bread wheat?", language="en")
    llm = FakeLLM({"answerable": True, "confidence": "medium", "answer": "Apply one third at sowing [S1]."})
    second = run(conn, llm, "And when?", language="en", conversation_id=first.conversation_id)
    assert second.conversation_id == first.conversation_id
    turns = llm.calls[0][1]
    assert turns[0].role == "user" and "How much urea" in turns[0].content


def test_message_is_logged_with_sources_and_flags(conn):
    r = run(conn, FakeLLM({"answerable": True, "confidence": "high",
                           "answer": "Use 200 - 250 kg/ha urea on black soil [S1]."}),
            "How much urea for bread wheat?", language="en")
    row = conn.execute("SELECT question, language, retrieved_chunk_ids, sources, escalated FROM messages WHERE id=?",
                       (r.message_id,)).fetchone()
    assert row[0] == "How much urea for bread wheat?" and row[1] == "en" and row[4] == 0
    assert json.loads(row[2]) and json.loads(row[3])[0]["ref"] == "S1"


def test_feedback_not_helpful_escalates_once(conn):
    r = run(conn, FakeLLM({"answerable": True, "confidence": "high",
                           "answer": "Use 200 - 250 kg/ha urea on black soil [S1]."}),
            "How much urea for bread wheat?", language="en")
    assert record_feedback(conn, r.message_id, 1, "not_helpful", "did not work")
    assert record_feedback(conn, r.message_id, 1, "not_helpful", None)
    n = conn.execute("SELECT COUNT(*) FROM escalations WHERE message_id=? AND reason='advice_failed'",
                     (r.message_id,)).fetchone()[0]
    assert n == 1
    assert record_feedback(conn, r.message_id, 2, "helpful", None) is False      # not your message


def test_context_summary_without_context():
    assert context_summary(None) == "No farm information available."
