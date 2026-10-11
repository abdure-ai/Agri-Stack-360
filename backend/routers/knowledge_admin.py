"""
routers/knowledge_admin.py — Manage the advisory knowledge base (spec §9, §10).

  POST  /api/admin/knowledge/upload      upload a PDF with metadata, extract, chunk, embed
  GET   /api/admin/knowledge             list documents
  PATCH /api/admin/knowledge/{id}        edit metadata / archive / restore
  POST  /api/admin/knowledge/reindex     embed chunks that have no embedding yet
  GET   /api/admin/knowledge/search?q=   try a query (to check what the advisor will find)

PDF only: Word files are saved as PDF first so page numbers can be cited.
"""

from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from backend.advisory.adapters.gemini import GeminiEmbedder
from backend.advisory.knowledge.search import invalidate_cache, search
from backend.advisory.knowledge.store import DocumentMeta, ingest_pdf, reindex_missing_embeddings, sha256
from backend.advisory.providers import ProviderError
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(prefix="/admin/knowledge", tags=["knowledge"])
_manage = require_permission(P.KNOWLEDGE_MANAGE)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "knowledge" / "uploads"
MAX_UPLOAD_BYTES = 60 * 1024 * 1024
LANGUAGES = {"am", "en", "om", "ti", "mixed"}


def _doc_out(d: dict) -> dict:
    d = dict(d)
    d["crops"] = json.loads(d.get("crops") or "[]")
    d["topics"] = json.loads(d.get("topics") or "[]")
    d.pop("file_sha256", None)
    return d


def _split(value: str | None) -> list[str]:
    return [p.strip().lower() for p in re.split(r"[|,]", value or "") if p.strip()]


@router.get("")
async def list_documents(_user=Depends(_manage)):
    rows = pquery(
        """SELECT d.*, COUNT(c.id) AS chunk_count, SUM(c.embedding IS NOT NULL) AS embedded_count
           FROM knowledge_documents d LEFT JOIN knowledge_chunks c ON c.document_id = d.id
           GROUP BY d.id ORDER BY d.created_at DESC"""
    )
    return [_doc_out(r) for r in rows]


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    crops: str = Form(..., description="Comma or | separated, e.g. 'wheat'"),
    language: str | None = Form(None, description="am / en / om / ti / mixed; detected when empty"),
    version_label: str | None = Form(None, description="e.g. '2016 E.C.'"),
    source_url: str | None = Form(None),
    user=Depends(_manage),
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Upload a PDF. Save Word documents as PDF first so page numbers can be cited.")
    if language and language not in LANGUAGES:
        raise HTTPException(400, f"Language must be one of: {', '.join(sorted(LANGUAGES))}")
    crop_list = _split(crops)
    if not title.strip() or not crop_list:
        raise HTTPException(400, "Title and at least one crop are required.")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "PDF is larger than 60 MB.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "The file is not a PDF.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60] or "document"
    tmp = UPLOAD_DIR / f".incoming-{slug}.pdf"
    tmp.write_bytes(data)
    path = UPLOAD_DIR / f"{sha256(tmp)[:12]}-{slug}.pdf"
    tmp.replace(path)

    meta = DocumentMeta(title=title.strip(), crops=crop_list, source_url=source_url or None,
                        language=language or None, version_label=version_label or None, uploaded_by=user["id"])
    conn = get_platform_connection()
    warning = None
    try:
        result = await asyncio.to_thread(ingest_pdf, conn, path, meta, GeminiEmbedder())
    except ProviderError as e:
        result = await asyncio.to_thread(ingest_pdf, conn, path, meta, None)
        warning = f"Indexed for keyword search only; embeddings failed ({e}). Use re-index when online."
    except ValueError as e:
        raise HTTPException(422, str(e))
    doc = pquery_one("SELECT * FROM knowledge_documents WHERE id=?", (result.document_id,))
    return {
        "document": _doc_out(doc),
        "pages": result.pages,
        "chunks": result.chunks,
        "embedded": result.embedded,
        "pages_needing_ocr": result.pages_without_text,
        "warning": warning,
    }


class DocumentUpdate(BaseModel):
    title: str | None = None
    crops: list[str] | None = None
    language: str | None = None
    version_label: str | None = None
    source_url: str | None = None
    status: str | None = None   # 'active' | 'archived'


@router.patch("/{doc_id}")
async def update_document(doc_id: int, req: DocumentUpdate, _user=Depends(_manage)):
    if not pquery_one("SELECT id FROM knowledge_documents WHERE id=?", (doc_id,)):
        raise HTTPException(404, "Document not found")
    changes = req.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] not in ("active", "archived"):
        raise HTTPException(400, "Status must be 'active' or 'archived'.")
    if "language" in changes and changes["language"] not in LANGUAGES:
        raise HTTPException(400, f"Language must be one of: {', '.join(sorted(LANGUAGES))}")
    if "title" in changes and not (changes["title"] or "").strip():
        raise HTTPException(400, "Title cannot be empty.")
    if "crops" in changes:
        crops = [c.strip().lower() for c in changes["crops"] or [] if c.strip()]
        if not crops:
            raise HTTPException(400, "At least one crop is required.")
        changes["crops"] = json.dumps(crops)
    conn = get_platform_connection()
    if changes:
        # Column names come from DocumentUpdate, never from the request body.
        conn.execute(f"UPDATE knowledge_documents SET {', '.join(f'{k}=?' for k in changes)} WHERE id=?",
                     (*changes.values(), doc_id))
        if "crops" in changes:  # chunk-level crop follows the document
            conn.execute("UPDATE knowledge_chunks SET crop=? WHERE document_id=?",
                         (json.loads(changes["crops"])[0], doc_id))
        conn.commit()
        invalidate_cache()
    return _doc_out(pquery_one("SELECT * FROM knowledge_documents WHERE id=?", (doc_id,)))


REINDEX_BATCH = 25


@router.post("/reindex")
async def reindex(_user=Depends(_manage)):
    """Embed missing chunks in small batches, keeping finished batches if the quota runs out."""
    conn = get_platform_connection()
    embedder = GeminiEmbedder()
    done, error = 0, None
    while True:
        try:
            n = await asyncio.to_thread(reindex_missing_embeddings, conn, embedder, REINDEX_BATCH)
        except ProviderError as e:
            error = str(e)
            break
        if not n:
            break
        done += n
    remaining = conn.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NULL").fetchone()[0]
    if error and not done:
        raise HTTPException(503, f"Embedding service unavailable: {error}")
    return {"embedded": done, "remaining": remaining,
            "warning": f"Stopped early: {error}. Try again in a minute." if error else None}


@router.get("/search")
async def try_search(q: str = Query(..., min_length=2), crop: str | None = None, k: int = Query(5, ge=1, le=20),
                     _user=Depends(_manage)):
    hits = await asyncio.to_thread(search, get_platform_connection(), q, k=k, crop=crop, embedder=GeminiEmbedder())
    return [
        {"citation": h.citation(), "section": h.section, "topic": h.topic, "language": h.language,
         "score": round(h.score, 4), "keyword_rank": h.keyword_rank, "vector_rank": h.vector_rank,
         "text": h.text}
        for h in hits
    ]
