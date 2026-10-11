"""
routers/review.py — Agronomist / content reviewer (checklist 1.3). All routes need content:review.

  GET  /api/review/escalations?status=forwarded      questions DAs could not answer
  POST /api/review/escalations/{id}/answer            reply to the farmer; optionally add to the knowledge base
  GET  /api/review/content/{table}.csv                download calendar / protocols / dosage as CSV
  POST /api/review/content/{table}                    upload a CSV (validated by the seed loader)
  GET  /api/review/corrections                        photo checks a DA corrected (model vs DA)
  GET  /api/review/diagnoses/{id}/image               the photo
  POST /api/review/corrections/{id}/label             confirm the label for retraining
  GET  /api/review/training-labels.csv                export image + label
  GET  /api/review/translations/advisory              advisory message texts in the 4 languages
  GET  /api/review/translations/reviews               review decisions so far
  PUT  /api/review/translations                       approve a text or suggest a better one
  GET  /api/review/translations.csv                   export decisions for merging into the files
  GET  /api/review/dataset/summary                    training photos (farmers' training consent): counts
  GET  /api/review/dataset/images                     list; /{id}/file the photo; POST /{id}/status exclude/include
  GET  /api/review/dataset/export.zip                 images by label + metadata.csv for retraining
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import tempfile
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from backend.advisory.config import ROOT, local_now
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(prefix="/review", tags=["review"])
_review = require_permission(P.CONTENT_REVIEW)
UPLOADS = ROOT / "data" / "uploads"
I18N_DIR = ROOT / "data" / "advisory_i18n"

SCHEMA = """
CREATE TABLE IF NOT EXISTS training_labels (
    diagnosis_id INTEGER PRIMARY KEY REFERENCES diagnoses(id) ON DELETE CASCADE,
    label        TEXT NOT NULL,
    reviewer_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note         TEXT,
    created_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS translation_reviews (
    source      TEXT NOT NULL CHECK (source IN ('ui','advisory')),
    lang        TEXT NOT NULL CHECK (lang IN ('am','om','ti')),
    key         TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('approved','changes')),
    suggestion  TEXT,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (source, lang, key)
);
"""


def ensure_schema(conn) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return local_now().isoformat(sep=" ", timespec="seconds")


# ── Review queue ──────────────────────────────────────────────────────────────

@router.get("/escalations")
async def queue(status: Literal["forwarded", "answered", "closed"] = "forwarded", _user=Depends(_review)):
    return pquery("""SELECT e.id, e.reason, e.status, e.resolution AS note, e.created_at, e.resolved_at, e.assigned_to,
                            u.woreda AS farmer_woreda, m.question, m.answer, m.language AS question_language,
                            d.disease_key, d.verified_disease
                     FROM escalations e JOIN users u ON u.id = e.farmer_id
                     LEFT JOIN messages m ON m.id = e.message_id LEFT JOIN diagnoses d ON d.id = e.diagnosis_id
                     WHERE e.status = ? ORDER BY e.created_at LIMIT 200""", (status,))


class ReviewAnswer(BaseModel):
    text: str = Field(..., min_length=2, max_length=2000)
    # Optional: add the reviewed answer to the knowledge base, in general wording (no names or places).
    kb_question: str | None = Field(None, max_length=500)
    kb_crop: str | None = Field("wheat", max_length=40)


def promote_to_kb(conn, *, question: str, answer: str, crop: str | None, reviewer: dict, escalation_id: int) -> int:
    """Add a reviewed answer as a small knowledge document, cited as 'Agronomist-reviewed answer #N'."""
    from backend.advisory.knowledge.store import DocumentMeta, embedding_input, to_blob
    from backend.advisory.knowledge.tagging import tag

    title = f"Agronomist-reviewed answer #{escalation_id}"
    text = f"Question: {question.strip()}\nAnswer: {answer.strip()}"
    digest = hashlib.sha256(f"reviewed:{escalation_id}:{text}".encode()).hexdigest()
    meta = DocumentMeta(title=title, crops=[crop] if crop else [], version_label=f"reviewed {local_now().date()}",
                        uploaded_by=reviewer["id"])
    vector = model_id = None
    try:
        from backend.advisory.adapters.gemini import GeminiEmbedder

        emb = GeminiEmbedder()
        vector = emb.embed([embedding_input(title, "Reviewed answer", text)], task="document")[0]
        model_id = getattr(emb, "model_id", emb.name)
    except Exception:
        pass                                   # searchable by keywords now; "Re-index" adds the vector later
    topic, stage = tag(text, "Reviewed answer")
    with conn:
        doc_id = conn.execute(
            """INSERT INTO knowledge_documents (title, source_url, file_path, file_sha256, language, crops, topics,
                 version_label, page_count, uploaded_by) VALUES (?,?,?,?,?,?,?,?,1,?)""",
            (title, None, f"reviewed-answer:{escalation_id}", digest, "en" if question.isascii() else "mixed",
             json.dumps(meta.crops), json.dumps([topic] if topic != "general" else []), meta.version_label,
             reviewer["id"])).lastrowid
        conn.execute(
            """INSERT INTO knowledge_chunks (document_id, chunk_index, text, page_start, page_end, section, language,
                 crop, topic, crop_stage, token_estimate, embedding, embedding_model) VALUES (?,0,?,1,1,?,?,?,?,?,?,?,?)""",
            (doc_id, text, "Reviewed answer", "en" if question.isascii() else "mixed", crop, topic, stage,
             len(text.split()), to_blob(vector) if vector else None, model_id))
    from backend.advisory.knowledge.search import invalidate_cache

    invalidate_cache()
    return doc_id


@router.post("/escalations/{escalation_id}/answer")
async def answer(escalation_id: int, req: ReviewAnswer, user: dict = Depends(_review)):
    from backend.routers.da import send_answer

    e = pquery_one("SELECT * FROM escalations WHERE id = ?", (escalation_id,))
    if not e:
        raise HTTPException(404, "Escalation not found")
    if e["status"] not in ("open", "forwarded"):
        raise HTTPException(409, f"This case is already {e['status']}.")
    send_answer(e, req.text.strip(), user, "expert_answer")
    doc_id = None
    if req.kb_question and req.kb_question.strip():
        doc_id = promote_to_kb(get_platform_connection(), question=req.kb_question, answer=req.text, crop=req.kb_crop,
                               reviewer=user, escalation_id=escalation_id)
    return {"id": escalation_id, "status": "answered", "knowledge_document_id": doc_id}


# ── Content tables (CSV in / out, validated by the seed loader) ───────────────

TABLES = {
    "calendar": ("crop_calendar_rules.csv",
                 """SELECT crop, variety, altitude_min_m, altitude_max_m, season, stage_key, stage_name, day_start, day_end,
                           actions, source_page AS source_document, '' AS source_page, verification_status
                    FROM crop_calendar_rules ORDER BY crop, altitude_min_m, day_start"""),
    "protocols": ("treatment_protocols.csv",
                  """SELECT disease_key, crop, cultural_practices, recommended_active_ingredients, scouting_advice, source,
                            verification_status FROM treatment_protocols ORDER BY disease_key"""),
    "dosage": ("dosage_rules.csv",
               """SELECT p.product_name, p.formulation, d.crop, d.target, d.dose_per_ha, d.dose_per_knapsack,
                         d.water_volume_l_per_ha, d.max_applications, d.interval_days, d.pre_harvest_interval_days,
                         d.re_entry_hours, d.rain_free_hours, d.ppe_required, d.source, d.verification_status
                  FROM dosage_rules d JOIN approved_products p ON p.id = d.product_id ORDER BY p.product_name"""),
}
LIST_COLUMNS = {"actions", "cultural_practices", "recommended_active_ingredients", "ppe_required"}


def _csv_cell(col: str, value) -> str:
    if value is None:
        return ""
    if col in LIST_COLUMNS and isinstance(value, str) and value.startswith("["):
        try:
            return "|".join(json.loads(value))       # same '|' list format as the seed CSVs
        except ValueError:
            return value
    return str(value)


@router.get("/content/{table}.csv")
async def download_table(table: str, _user=Depends(_review)):
    if table not in TABLES:
        raise HTTPException(404, "Unknown table")
    name, sql = TABLES[table]
    rows = pquery(sql)
    buf = io.StringIO()
    if rows:
        w = csv.DictWriter(buf, fieldnames=list(rows[0]))
        w.writeheader()
        for r in rows:
            w.writerow({k: _csv_cell(k, v) for k, v in r.items()})
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.post("/content/{table}")
async def upload_table(table: str, file: UploadFile = File(...), _user=Depends(_review)):
    """Validate and load one table. Rows without a source stay PLACEHOLDER_VERIFY (the loader's rule)."""
    from backend.advisory.seed_loader import SeedError, load_seed

    if table not in TABLES:
        raise HTTPException(404, "Unknown table")
    data = await file.read(2 * 1024 * 1024 + 1)
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(413, "File too large (2 MB max).")
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / TABLES[table][0]).write_bytes(data)
        try:
            report = load_seed(get_platform_connection(), Path(tmp))
        except SeedError as e:
            raise HTTPException(400, str(e))
    key = {"calendar": "crop_calendar_rules", "protocols": "treatment_protocols", "dosage": "dosage_rules"}[table]
    return {"loaded": report.loaded.get(key, 0), "placeholders": report.placeholders.get(key, 0)}


# ── Diagnosis corrections → training labels ──────────────────────────────────

@router.get("/corrections")
async def corrections(_user=Depends(_review)):
    return pquery("""SELECT d.id, d.disease_key AS model_disease, d.verified_disease AS da_disease, d.confidence,
                            d.created_at, d.image_ref IS NOT NULL AS has_image, l.label, l.created_at AS labelled_at
                     FROM diagnoses d LEFT JOIN training_labels l ON l.diagnosis_id = d.id
                     WHERE d.verified_disease IS NOT NULL AND d.source != 'simulated'
                       AND (d.disease_key IS NULL OR d.verified_disease != d.disease_key)
                     ORDER BY l.label IS NOT NULL, d.created_at DESC LIMIT 300""")


@router.get("/diseases")
async def diseases(language: str | None = None, user: dict = Depends(_review)):
    """Label choices (the disease table), names in the reviewer's language."""
    from backend.advisory.diagnosis import disease_names

    names = disease_names(get_platform_connection(), language or user.get("language") or "en")
    return [{"key": r["key"], "name": names.get(r["key"], r["key"])}
            for r in pquery("SELECT key FROM diseases WHERE key != 'invalid_image' ORDER BY is_disease DESC, key")]


@router.get("/diagnoses/{diagnosis_id}/image")
async def diagnosis_image(diagnosis_id: int, _user=Depends(_review)):
    d = pquery_one("SELECT image_ref FROM diagnoses WHERE id = ?", (diagnosis_id,))
    if not d or not d["image_ref"]:
        raise HTTPException(404, "No photo")
    path = (UPLOADS / d["image_ref"]).resolve()
    if UPLOADS.resolve() not in path.parents or not path.exists():
        raise HTTPException(404, "No photo")
    return FileResponse(path)


class LabelIn(BaseModel):
    label: str
    note: str | None = Field(None, max_length=500)


@router.post("/corrections/{diagnosis_id}/label")
async def label(diagnosis_id: int, req: LabelIn, user: dict = Depends(_review)):
    if not pquery_one("SELECT id FROM diagnoses WHERE id = ?", (diagnosis_id,)):
        raise HTTPException(404, "Diagnosis not found")
    if not pquery_one("SELECT key FROM diseases WHERE key = ?", (req.label,)):
        raise HTTPException(400, "Unknown disease")
    conn = get_platform_connection()
    with conn:
        conn.execute("""INSERT INTO training_labels (diagnosis_id, label, reviewer_id, note, created_at) VALUES (?,?,?,?,?)
                        ON CONFLICT(diagnosis_id) DO UPDATE SET label=excluded.label, reviewer_id=excluded.reviewer_id,
                          note=excluded.note, created_at=excluded.created_at""",
                     (diagnosis_id, req.label, user["id"], req.note, _now()))
    return {"diagnosis_id": diagnosis_id, "label": req.label}


@router.get("/training-labels.csv")
async def training_labels(_user=Depends(_review)):
    rows = pquery("""SELECT d.image_ref, l.label, d.disease_key AS model_prediction, d.model_label, l.created_at
                     FROM training_labels l JOIN diagnoses d ON d.id = l.diagnosis_id
                     WHERE d.image_ref IS NOT NULL ORDER BY l.created_at""")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["image_file", "label", "model_prediction", "model_label", "labelled_at"])
    for r in rows:
        w.writerow([f"data/uploads/{r['image_ref']}", r["label"], r["model_prediction"], r["model_label"], r["created_at"]])
    return Response(buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="training_labels.csv"'})


# ── Translation approval ──────────────────────────────────────────────────────

@router.get("/translations/advisory")
async def advisory_texts(_user=Depends(_review)):
    """Advisory message texts (alerts, safety, bot) per language, plus which keys are marked draft."""
    out = {}
    for lang in ("en", "am", "om", "ti"):
        d = json.loads((I18N_DIR / f"{lang}.json").read_text(encoding="utf-8"))
        meta = d.pop("_meta", {})
        out[lang] = {"texts": {k: v for k, v in d.items() if isinstance(v, str)}, "status": meta.get("status"),
                     "draft_keys": meta.get("draft_keys", [])}
    return out


@router.get("/translations/reviews")
async def reviews(_user=Depends(_review)):
    return pquery("""SELECT r.*, u.name AS reviewer FROM translation_reviews r LEFT JOIN users u ON u.id = r.reviewer_id
                     ORDER BY r.updated_at DESC""")


class TranslationReview(BaseModel):
    source: Literal["ui", "advisory"]
    lang: Literal["am", "om", "ti"]
    key: str = Field(..., min_length=1, max_length=200)
    status: Literal["approved", "changes"]
    suggestion: str | None = Field(None, max_length=4000)


@router.put("/translations")
async def review_translation(req: TranslationReview, user: dict = Depends(_review)):
    if req.status == "changes" and not (req.suggestion or "").strip():
        raise HTTPException(400, "Write the better text when asking for changes.")
    conn = get_platform_connection()
    with conn:
        conn.execute("""INSERT INTO translation_reviews (source, lang, key, status, suggestion, reviewer_id, updated_at)
                        VALUES (?,?,?,?,?,?,?) ON CONFLICT(source, lang, key) DO UPDATE SET status=excluded.status,
                          suggestion=excluded.suggestion, reviewer_id=excluded.reviewer_id, updated_at=excluded.updated_at""",
                     (req.source, req.lang, req.key, req.status,
                      (req.suggestion or "").strip() or None if req.status == "changes" else None, user["id"], _now()))
    return {"ok": True}


@router.get("/translations.csv")
async def translations_csv(_user=Depends(_review)):
    rows = pquery("""SELECT r.source, r.lang, r.key, r.status, r.suggestion, u.name AS reviewer, r.updated_at
                     FROM translation_reviews r LEFT JOIN users u ON u.id = r.reviewer_id ORDER BY r.source, r.lang, r.key""")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["source", "lang", "key", "status", "suggestion", "reviewer", "updated_at"])
    for r in rows:
        w.writerow([r[k] for k in ("source", "lang", "key", "status", "suggestion", "reviewer", "updated_at")])
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="translation_reviews.csv"'})



# ── Training dataset (photos kept with the farmer's training consent) ────────

@router.get("/dataset/summary")
async def dataset_summary(_user=Depends(_review)):
    from backend import training_data

    return training_data.summary(get_platform_connection())


@router.get("/dataset/images")
async def dataset_images(status: Literal["included", "excluded"] | None = None, labelled: bool | None = None,
                         limit: int = 60, offset: int = 0, _user=Depends(_review)):
    from backend import training_data

    return training_data.rows(get_platform_connection(), status=status, labelled=labelled,
                              limit=max(1, min(limit, 200)), offset=max(0, offset))


@router.get("/dataset/images/{image_id}/file")
async def dataset_image_file(image_id: int, _user=Depends(_review)):
    from backend import training_data

    row = pquery_one("SELECT file FROM training_images WHERE id = ?", (image_id,))
    path = (training_data.DATASET_DIR / row["file"]).resolve() if row else None
    if not path or training_data.DATASET_DIR.resolve() not in path.parents or not path.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(path, media_type="image/jpeg")


class DatasetStatusIn(BaseModel):
    status: Literal["included", "excluded"]
    reason: str | None = Field(None, max_length=200)


@router.post("/dataset/images/{image_id}/status")
async def dataset_image_status(image_id: int, req: DatasetStatusIn, user: dict = Depends(_review)):
    """Exclude a photo that is unusable for training (blurred, not a leaf, wrong crop) or include it again."""
    if not pquery_one("SELECT id FROM training_images WHERE id = ?", (image_id,)):
        raise HTTPException(404, "Image not found")
    if req.status == "excluded" and not (req.reason or "").strip():
        raise HTTPException(400, "Give a reason for excluding the photo")
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE training_images SET status=?, excluded_reason=?, reviewed_by=? WHERE id=?",
                     (req.status, (req.reason or "").strip() or None if req.status == "excluded" else None,
                      user["id"], image_id))
    return {"id": image_id, "status": req.status}


@router.get("/dataset/export.zip")
async def dataset_export(labelled_only: bool = False, _user=Depends(_review)):
    """Images grouped by label + metadata.csv (no names, phones or GPS; photo metadata removed)."""
    from backend import training_data

    data = training_data.export_zip(get_platform_connection(), labelled_only=labelled_only)
    name = f"crop-photo-dataset-{local_now():%Y%m%d}.zip"
    return Response(data, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{name}"'})
