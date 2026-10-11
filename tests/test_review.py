"""Agronomist / content reviewer (checklist 1.3; M9): queue, KB promotion, content CSV, labels, translations."""

from pathlib import Path

import pytest

from backend.advisory import alerts
from backend.advisory.seed_loader import load_seed
from backend.permissions import has_permission
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def team(platform, monkeypatch):
    load_seed(platform, ROOT / "data" / "advisory_seed")
    import backend.advisory.adapters.gemini as gem

    class NoEmbedder:                                   # never call the network from tests
        def __init__(self, *a, **k):
            raise RuntimeError("offline")

    monkeypatch.setattr(gem, "GeminiEmbedder", NoEmbedder)
    t = {"admin": add_user(platform, 9, role="admin", name="Admin"),
         "agro": add_user(platform, 7, role="agronomist", name="Agro Nomist"),
         "da": add_user(platform, 5, role="agent", name="DA Five"),
         "farmer": add_user(platform, 1, name="Farmer One", consent_data=1, assigned_da_id=5)}
    platform.execute("INSERT INTO conversations (id, user_id) VALUES (3, 1)")
    platform.execute("INSERT INTO messages (id, conversation_id, question, answer) VALUES (4, 3, 'Can I store wheat in plastic bags?', 'I could not answer')")
    platform.execute("INSERT INTO escalations (id, message_id, farmer_id, reason, assigned_to) VALUES (40, 4, 1, 'no_knowledge', 5)")
    platform.commit()
    return t


def test_agronomist_permissions():
    assert has_permission("agronomist", "content:review") and has_permission("agronomist", "knowledge:manage")
    assert not has_permission("agronomist", "users:manage") and not has_permission("agent", "content:review")


def test_forwarded_case_reaches_the_agronomist_and_the_answer_reaches_the_farmer(client_as, team, platform):
    r = client_as(team["da"]).post("/api/da/escalations/40/forward", json={"note": "storage question"})
    assert r.json()["assigned_to"] == 7                                     # agronomist before admin
    agro = client_as(team["agro"])
    queue = agro.get("/api/review/escalations").json()
    assert [e["id"] for e in queue] == [40] and queue[0]["question"].startswith("Can I store")
    assert client_as(team["da"]).get("/api/review/escalations").status_code == 403
    r = agro.post("/api/review/escalations/40/answer", json={"text": "Use hermetic bags; dry the grain first."})
    assert r.status_code == 200 and r.json()["knowledge_document_id"] is None
    assert agro.post("/api/review/escalations/40/answer", json={"text": "again"}).status_code == 409
    alert = dict(platform.execute("SELECT * FROM alerts WHERE farmer_id=1").fetchone())
    text = alerts.render(alert, "en", platform)
    assert text.startswith("An agronomist (Agro Nomist) answered") and "hermetic" in text


def test_reviewed_answer_can_join_the_knowledge_base(client_as, team, platform):
    client_as(team["da"]).post("/api/da/escalations/40/forward", json={})
    r = client_as(team["agro"]).post("/api/review/escalations/40/answer", json={
        "text": "Use hermetic bags and dry the grain to safe moisture first.",
        "kb_question": "How should harvested wheat be stored?", "kb_crop": "wheat"})
    doc_id = r.json()["knowledge_document_id"]
    doc = platform.execute("SELECT title, status FROM knowledge_documents WHERE id=?", (doc_id,)).fetchone()
    assert tuple(doc) == ("Agronomist-reviewed answer #40", "active")
    chunk = platform.execute("SELECT text, crop FROM knowledge_chunks WHERE document_id=?", (doc_id,)).fetchone()
    assert chunk[0].startswith("Question: How should harvested wheat be stored?") and chunk[1] == "wheat"


def test_content_tables_round_trip_and_validation(client_as, team, platform):
    agro = client_as(team["agro"])
    before = platform.execute("SELECT COUNT(*) FROM crop_calendar_rules").fetchone()[0]
    csv_text = agro.get("/api/review/content/calendar.csv").text
    assert "stage_key" in csv_text.splitlines()[0]
    r = agro.post("/api/review/content/calendar", files={"file": ("crop_calendar_rules.csv", csv_text.encode("utf-8"), "text/csv")})
    assert r.status_code == 200, r.text
    assert r.json()["loaded"] == before == platform.execute("SELECT COUNT(*) FROM crop_calendar_rules").fetchone()[0]
    bad = "crop,stage_key\nwheat,x\n".encode()
    assert agro.post("/api/review/content/calendar", files={"file": ("x.csv", bad, "text/csv")}).status_code == 400
    assert agro.get("/api/review/content/nope.csv").status_code == 404
    assert "product_name" in agro.get("/api/review/content/dosage.csv").text.splitlines()[0]


def test_corrections_and_training_labels(client_as, team, platform):
    platform.execute("""INSERT INTO diagnoses (id, farmer_id, disease_key, confidence, verified_disease, image_ref)
                        VALUES (60, 1, 'yellow_rust', 0.6, 'leaf_rust', 'diagnoses/x.jpg'), (61, 1, 'leaf_rust', 0.9, 'leaf_rust', NULL)""")
    platform.commit()
    agro = client_as(team["agro"])
    items = agro.get("/api/review/corrections").json()
    assert [(i["id"], i["model_disease"], i["da_disease"]) for i in items] == [(60, "yellow_rust", "leaf_rust")]
    assert agro.post("/api/review/corrections/60/label", json={"label": "nonsense"}).status_code == 400
    assert agro.post("/api/review/corrections/60/label", json={"label": "leaf_rust"}).status_code == 200
    csv_text = agro.get("/api/review/training-labels.csv").text
    assert "data/uploads/diagnoses/x.jpg,leaf_rust,yellow_rust" in csv_text
    assert agro.get("/api/review/diagnoses/61/image").status_code == 404
    keys = [d["key"] for d in agro.get("/api/review/diseases").json()]
    assert "leaf_rust" in keys and "healthy" in keys and "invalid_image" not in keys


def test_translation_reviews(client_as, team):
    agro = client_as(team["agro"])
    texts = agro.get("/api/review/translations/advisory").json()
    assert "outbreak_alert" in texts["en"]["texts"] and "expert_answer" in texts["am"]["draft_keys"]
    body = {"source": "advisory", "lang": "am", "key": "expert_answer", "status": "changes"}
    assert agro.put("/api/review/translations", json=body).status_code == 400          # changes need a suggestion
    assert agro.put("/api/review/translations", json={**body, "suggestion": "የተሻለ ጽሑፍ {da_name} {text}"}).status_code == 200
    assert agro.put("/api/review/translations", json={**body, "key": "outbreak_alert", "status": "approved"}).status_code == 200
    rows = {r["key"]: r for r in agro.get("/api/review/translations/reviews").json()}
    assert rows["expert_answer"]["status"] == "changes" and rows["outbreak_alert"]["suggestion"] is None
    assert "expert_answer" in agro.get("/api/review/translations.csv").text
