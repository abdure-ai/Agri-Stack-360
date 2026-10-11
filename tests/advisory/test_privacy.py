"""No personal data in prompts sent to external AI (checklist cross-cutting rule; Proclamation 1321/2024).

Only anonymised farm context may leave the platform: woreda-level location, altitude, crop,
stage, weather, market and nearby activity. Never the farmer's name, phone, kebele, field names
or coordinates.
"""

from backend.advisory.assistant import ask, context_summary
from backend.routers.crop_health import explanation_prompt
from backend.routers.financial import score_explanation_prompt
from tests.advisory.test_assistant import NOW, FakeLLM, conn  # noqa: F401  (fixture)
from tests.advisory.test_context import _context, db  # noqa: F401  (fixture)
from tests.advisory.test_knowledge import FakeEmbedder

# Personal values seeded by the test_context fixture.
PERSONAL = ["Demo Farmer", "0944", "PLACEHOLDER_KEBELE", "Plot A", "10.779", "39.847"]


def _assert_anonymous(text: str):
    for value in PERSONAL:
        assert value not in text, f"personal data {value!r} found in prompt"


def test_context_summary_is_anonymous(db):  # noqa: F811
    summary = context_summary(_context(db))
    _assert_anonymous(summary)
    assert "Dewa Cheffa" in summary and "Field 1: wheat" in summary      # useful facts are kept


def test_advisor_prompt_is_anonymous(conn, db):  # noqa: F811
    ctx = _context(db)
    llm = FakeLLM({"answerable": True, "confidence": "high", "answer": "Apply urea at tillering [S1]."})
    ask(conn, user={"id": 1, "role": "farmer", "language": "en", "name": "Demo Farmer", "phone": "0944"},
        question="When should I apply urea on irrigated wheat?", language="en", farmer_id=1, llm=llm,
        embedder=FakeEmbedder(), build_ctx=lambda fid: ctx, now=NOW)
    assert llm.calls, "the advisor did not call the AI"
    system, turns = llm.calls[0]
    prompt = system + "\n" + "\n".join(str(t) for t in turns)
    assert "Dewa Cheffa" in prompt                 # the farm context really was sent
    _assert_anonymous(prompt)


def test_credit_score_prompt_is_anonymous():
    user = {"name": "Demo Farmer", "phone": "0944", "region": "Amhara", "woreda": "Dewa Cheffa"}
    prompt = score_explanation_prompt(62, user, [{"label": "Has 2 farms"}], [])
    _assert_anonymous(prompt)
    assert "Amhara" in prompt and "62/100" in prompt


def test_crop_health_prompt_is_anonymous():
    disease = {"disease": "Leaf rust", "severity": "medium", "confidence": 80, "recommended_action": "Scout"}
    prompt = explanation_prompt(disease, "wheat", "brown spots on leaves")
    _assert_anonymous(prompt)
    assert "wheat" in prompt
