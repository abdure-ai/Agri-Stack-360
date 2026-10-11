"""
store.py — Ingest documents into knowledge_documents / knowledge_chunks.

Re-ingesting the same file (same SHA-256) replaces its chunks, so tagging or
chunking improvements apply by re-running the script. Embeddings are added
when an embedder is available; chunks without one are still searchable by
keyword and can be embedded later with reindex_missing_embeddings().
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from backend.advisory.knowledge.chunking import chunk_blocks
from backend.advisory.knowledge.extract import extract_pdf
from backend.advisory.knowledge.tagging import tag
from backend.advisory.languages import document_language
from backend.advisory.providers import EmbeddingProvider


@dataclass
class DocumentMeta:
    title: str
    crops: list[str]
    source_url: str | None = None
    language: str | None = None          # detected when empty
    topics: list[str] = field(default_factory=list)
    version_label: str | None = None
    uploaded_by: int | None = None


@dataclass
class IngestResult:
    document_id: int
    title: str
    pages: int
    chunks: int
    embedded: int
    language: str
    pages_without_text: list[int]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def embedding_input(title: str, section: str, text: str) -> str:
    """What gets embedded: document and section give the chunk its context."""
    return f"{title}\n{section}\n\n{text}" if section else f"{title}\n\n{text}"


def to_blob(vec: list[float]) -> bytes:
    v = np.asarray(vec, dtype=np.float32)
    n = np.linalg.norm(v)
    return (v / n if n else v).tobytes()


def ingest_pdf(conn: sqlite3.Connection, path: Path, meta: DocumentMeta,
               embedder: EmbeddingProvider | None = None) -> IngestResult:
    extracted = extract_pdf(path)
    chunks = chunk_blocks(extracted.blocks)
    if not chunks:
        raise ValueError(f"No text found in {path.name}. If it is a scanned PDF it needs OCR first.")
    language = meta.language or document_language(" ".join(c.text for c in chunks[:20]))
    digest = sha256(path)

    tagged = []
    for c in chunks:
        topic, stage = tag(c.text, c.section)
        tagged.append((c, topic, stage))
    topics = sorted({t for _, t, _ in tagged if t != "general"} | set(meta.topics))

    vectors: list[list[float]] | None = None
    model_id = None
    if embedder is not None:
        vectors = embedder.embed([embedding_input(meta.title, c.section, c.text) for c, _, _ in tagged], task="document")
        model_id = getattr(embedder, "model_id", embedder.name)

    primary_crop = meta.crops[0] if meta.crops else None
    with conn:
        row = conn.execute("SELECT id FROM knowledge_documents WHERE file_sha256=?", (digest,)).fetchone()
        if row:
            doc_id = row[0]
            conn.execute(
                """UPDATE knowledge_documents SET title=?, source_url=?, file_path=?, language=?, crops=?, topics=?,
                     version_label=?, page_count=? WHERE id=?""",
                (meta.title, meta.source_url, str(path), language, json.dumps(meta.crops), json.dumps(topics),
                 meta.version_label, extracted.page_count, doc_id),
            )
            conn.execute("DELETE FROM knowledge_chunks WHERE document_id=?", (doc_id,))
        else:
            doc_id = conn.execute(
                """INSERT INTO knowledge_documents (title, source_url, file_path, file_sha256, language, crops, topics,
                     version_label, page_count, uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (meta.title, meta.source_url, str(path), digest, language, json.dumps(meta.crops),
                 json.dumps(topics), meta.version_label, extracted.page_count, meta.uploaded_by),
            ).lastrowid
        for i, (c, topic, stage) in enumerate(tagged):
            conn.execute(
                """INSERT INTO knowledge_chunks (document_id, chunk_index, text, page_start, page_end, section, language,
                     crop, topic, crop_stage, token_estimate, embedding, embedding_model)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (doc_id, c.index, c.text, c.page_start, c.page_end, c.section, language, primary_crop, topic, stage,
                 c.tokens, to_blob(vectors[i]) if vectors else None, model_id),
            )
    from backend.advisory.knowledge.search import invalidate_cache

    invalidate_cache()
    return IngestResult(doc_id, meta.title, extracted.page_count, len(chunks), len(vectors or []), language,
                        extracted.pages_without_text)


def reindex_missing_embeddings(conn: sqlite3.Connection, embedder: EmbeddingProvider, limit: int | None = None) -> int:
    """Embed chunks that have no vector (e.g. ingested offline or with another model).

    `limit` embeds at most that many chunks, so a rate-limited key can work through a
    large backlog in batches without losing finished work.
    """
    model_id = getattr(embedder, "model_id", embedder.name)
    rows = conn.execute(
        """SELECT c.id, d.title, c.section, c.text FROM knowledge_chunks c
           JOIN knowledge_documents d ON d.id = c.document_id
           WHERE c.embedding IS NULL OR c.embedding_model IS NOT ?
           ORDER BY c.id LIMIT ?""",
        (model_id, -1 if limit is None else limit),
    ).fetchall()
    if not rows:
        return 0
    vecs = embedder.embed([embedding_input(t, s or "", x) for _, t, s, x in rows], task="document")
    with conn:
        for (cid, *_), v in zip(rows, vecs):
            conn.execute("UPDATE knowledge_chunks SET embedding=?, embedding_model=? WHERE id=?", (to_blob(v), model_id, cid))
    from backend.advisory.knowledge.search import invalidate_cache

    invalidate_cache()
    return len(rows)
