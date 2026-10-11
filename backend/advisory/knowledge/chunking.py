"""
chunking.py — Blocks -> retrieval chunks of ~300-800 tokens, split by section.

Each chunk records its section path ("Crop protection > Wheat diseases") and
page range so answers can cite "document title, page". Tables are their own
chunks (split by rows if long, repeating the caption).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from backend.advisory.knowledge.extract import Block

TARGET_TOKENS = 550
MAX_TOKENS = 800
MIN_TOKENS = 120


def estimate_tokens(text: str) -> int:
    """Rough token count: Ge'ez syllables tokenise far denser than Latin letters."""
    ethiopic = len(re.findall(r"[ሀ-᎟ⶀ-⷟]", text))
    other = len(text) - ethiopic
    return int(ethiopic / 1.6 + other / 4) + 1


@dataclass
class Chunk:
    index: int
    text: str
    page_start: int
    page_end: int
    section: str
    kind: str          # 'text' | 'table'

    @property
    def tokens(self) -> int:
        return estimate_tokens(self.text)


def _split_long(text: str, limit: int) -> list[str]:
    """Split a long paragraph at sentence ends (Ethiopic '።' or '.') to stay under `limit` tokens."""
    sentences = re.split(r"(?<=[።!?.])\s+|(?<=::)\s+|(?<=፡፡)\s+", text)
    parts, cur = [], ""
    for s in sentences:
        if cur and estimate_tokens(cur + " " + s) > limit:
            parts.append(cur.strip())
            cur = s
        else:
            cur = f"{cur} {s}" if cur else s
    if cur.strip():
        parts.append(cur.strip())
    return parts


def chunk_blocks(blocks: list[Block]) -> list[Chunk]:
    chunks: list[Chunk] = []
    path: dict[int, str] = {}
    buf: list[str] = []
    buf_pages: list[int] = []

    def section() -> str:
        return " > ".join(path[k] for k in sorted(path))

    def flush() -> None:
        nonlocal buf, buf_pages
        text = "\n".join(buf).strip()
        if text:
            chunks.append(Chunk(len(chunks), text, min(buf_pages), max(buf_pages), section(), "text"))
        buf, buf_pages = [], []

    for b in blocks:
        if b.kind == "heading":
            # A new heading closes the previous section's text unless it is still tiny.
            if buf and estimate_tokens("\n".join(buf)) >= MIN_TOKENS:
                flush()
            path = {k: v for k, v in path.items() if k < b.level}
            path[b.level] = b.text
            if buf:  # tiny leftover: keep it, but record the heading inline
                buf.append(b.text)
                buf_pages.append(b.page)
            continue

        if b.kind == "table":
            flush()
            lines = b.text.split("\n")
            caption = lines[0] if lines and not (":" in lines[0] and ";" in lines[0]) else None
            rows = lines[1:] if caption else lines
            part: list[str] = []
            for row in rows:
                candidate = "\n".join(([caption] if caption else []) + part + [row])
                if part and estimate_tokens(candidate) > MAX_TOKENS:
                    chunks.append(Chunk(len(chunks), "\n".join(([caption] if caption else []) + part),
                                        b.page, b.page, section(), "table"))
                    part = []
                part.append(row)
            if part:
                chunks.append(Chunk(len(chunks), "\n".join(([caption] if caption else []) + part),
                                    b.page, b.page, section(), "table"))
            continue

        for piece in (_split_long(b.text, MAX_TOKENS) if estimate_tokens(b.text) > MAX_TOKENS else [b.text]):
            if buf and estimate_tokens("\n".join(buf + [piece])) > TARGET_TOKENS:
                flush()
            buf.append(piece)
            buf_pages.append(b.page)
    flush()
    return chunks
