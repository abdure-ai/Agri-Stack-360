"""
search.py — Hybrid retrieval over knowledge_chunks.

Two rankings, merged with reciprocal rank fusion:
  * keyword (BM25) — works offline; Ethiopic words also index 3-letter pieces so
    prefixed/suffixed Amharic forms (የስንዴ / ስንዴ / ስንዴዉ) still match;
  * meaning (embeddings) — cross-language, e.g. an English question finding an
    Amharic table row. Skipped when no embedder is available.

Only chunks of active documents are searched. The corpus is small (thousands
of chunks), so it is held in memory and rebuilt after each ingest.
"""

from __future__ import annotations

import math
import re
import sqlite3
import threading
from collections import Counter
from dataclasses import dataclass

import numpy as np

from backend.advisory.providers import EmbeddingProvider, ProviderError

RRF_K = 60
_WORD_RE = re.compile(r"[a-z0-9]+(?:'[a-z]+)?|[ሀ-᎟ⶀ-⷟]+")
_ETHIOPIC_RE = re.compile(r"[ሀ-᎟ⶀ-⷟]")
_STOP = {"the", "a", "an", "of", "for", "to", "in", "on", "and", "or", "is", "are", "how", "what", "much", "many",
         "my", "do", "i", "should", "can", "at", "with", "be"}


def tokenize(text: str) -> list[str]:
    out: list[str] = []
    for w in _WORD_RE.findall(text.lower()):
        if w in _STOP:
            continue
        out.append(w)
        if _ETHIOPIC_RE.match(w) and len(w) >= 4:
            out.extend(w[i:i + 3] for i in range(len(w) - 2))
    return out


@dataclass
class Hit:
    chunk_id: int
    document_id: int
    title: str
    source_url: str | None
    version_label: str | None
    page_start: int | None
    page_end: int | None
    section: str | None
    text: str
    topic: str | None
    language: str | None
    score: float
    keyword_rank: int | None
    vector_rank: int | None

    def citation(self) -> str:
        pages = f"p. {self.page_start}" if self.page_start == self.page_end else f"pp. {self.page_start}–{self.page_end}"
        version = f", {self.version_label}" if self.version_label else ""
        return f"{self.title}{version}, {pages}"


class _Index:
    def __init__(self, rows: list[sqlite3.Row]):
        self.rows = rows
        self.docs = [tokenize(f"{r['section'] or ''} {r['text']}") for r in rows]
        self.df: Counter = Counter()
        for d in self.docs:
            self.df.update(set(d))
        self.tf = [Counter(d) for d in self.docs]
        self.avgdl = sum(len(d) for d in self.docs) / max(1, len(self.docs))
        # One vector per chunk; chunks not embedded yet get a zero vector (never matched).
        sizes = {len(r["embedding"]) for r in rows if r["embedding"]}
        self.vectors = None
        if len(sizes) == 1:
            dim = sizes.pop() // 4  # float32
            zero = np.zeros(dim, dtype=np.float32)
            self.vectors = np.vstack([
                np.frombuffer(r["embedding"], dtype=np.float32) if r["embedding"] else zero for r in rows
            ])

    def bm25(self, query: list[str], k1: float = 1.4, b: float = 0.75) -> np.ndarray:
        n = len(self.docs)
        scores = np.zeros(n)
        for term in set(query):
            df = self.df.get(term)
            if not df:
                continue
            idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
            for i, tf in enumerate(self.tf):
                f = tf.get(term)
                if f:
                    scores[i] += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len(self.docs[i]) / self.avgdl))
        return scores


_lock = threading.Lock()
_cache: dict[int, _Index] = {}


def invalidate_cache() -> None:
    with _lock:
        _cache.clear()


def _index(conn: sqlite3.Connection) -> _Index:
    key = id(conn)
    with _lock:
        if key not in _cache:
            cur = conn.cursor()
            cur.row_factory = sqlite3.Row
            rows = cur.execute(
                """SELECT c.id, c.document_id, c.text, c.page_start, c.page_end, c.section, c.topic, c.language,
                          c.crop, c.embedding, c.embedding_model, d.title, d.source_url, d.version_label, d.crops
                   FROM knowledge_chunks c JOIN knowledge_documents d ON d.id = c.document_id
                   WHERE d.status = 'active' ORDER BY c.document_id, c.chunk_index"""
            ).fetchall()
            _cache[key] = _Index(rows)
        return _cache[key]


def search(conn: sqlite3.Connection, query: str, *, k: int = 5, crop: str | None = None,
           embedder: EmbeddingProvider | None = None, candidates: int = 30) -> list[Hit]:
    idx = _index(conn)
    if not idx.rows:
        return []
    allowed = np.ones(len(idx.rows), dtype=bool)
    if crop:
        c = crop.lower()
        allowed = np.array([(r["crop"] or "").lower() == c or c in (r["crops"] or "").lower() for r in idx.rows])

    kw = idx.bm25(tokenize(query))
    kw[~allowed] = 0
    kw_order = [i for i in np.argsort(-kw) if kw[i] > 0][:candidates]

    vec_order: list[int] = []
    if embedder is not None and idx.vectors is not None:
        try:
            q = np.asarray(embedder.embed([query], task="query")[0], dtype=np.float32)
            q /= np.linalg.norm(q) or 1.0
            if q.shape[0] == idx.vectors.shape[1]:
                sims = idx.vectors @ q
                sims[~allowed] = -1
                vec_order = [int(i) for i in np.argsort(-sims)[:candidates] if sims[i] > 0]
        except ProviderError:
            vec_order = []   # offline / quota: keyword search still answers

    fused: dict[int, float] = {}
    kw_rank = {i: r for r, i in enumerate(kw_order)}
    vec_rank = {i: r for r, i in enumerate(vec_order)}
    for i in set(kw_order) | set(vec_order):
        fused[i] = sum(1.0 / (RRF_K + rk + 1) for rk in (kw_rank.get(i), vec_rank.get(i)) if rk is not None)

    hits = []
    for i in sorted(fused, key=fused.get, reverse=True)[:k]:
        r = idx.rows[i]
        hits.append(Hit(r["id"], r["document_id"], r["title"], r["source_url"], r["version_label"], r["page_start"],
                        r["page_end"], r["section"], r["text"], r["topic"], r["language"], fused[i],
                        kw_rank.get(i), vec_rank.get(i)))
    return hits
