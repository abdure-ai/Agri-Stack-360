"""
extract.py — PDF -> ordered blocks (heading / text / table) with page numbers.

Tuned on the MoA wheat packages (Word documents saved as PDF): headings are
set larger than body text (14 pt / 13 pt over 12 pt body), tables in 10 pt.
Headings are detected relative to the document's own body size, so other
layouts work without code changes. Tables are rebuilt row by row; their text
is removed from the running text so it is not indexed twice.
"""

from __future__ import annotations

import collections
import re
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

CAPTION_RE = re.compile(r"^\s*(ሠንጠረዥ|ሰንጠረዥ|ሰንጠረዠ|table)\b", re.IGNORECASE)
MAX_HEADING_CHARS = 140
# Table-of-contents entry: "1. መግቢያ ........ 20"
TOC_RE = re.compile(r"(\.\s?){4,}\s*\d*\s*$|…{2,}\s*\d*\s*$")
FIGURE_RE = re.compile(r"^\s*(ስዕል|ሥዕል|ምስል|figure|fig\.)", re.IGNORECASE)


@dataclass
class Block:
    page: int                  # 1-based
    kind: str                  # 'heading' | 'text' | 'table'
    text: str
    level: int = 0             # headings: 1 = largest
    y: float = 0.0
    rows: list[list[str]] = field(default_factory=list)   # tables only


@dataclass
class ExtractedDocument:
    path: Path
    page_count: int
    blocks: list[Block]
    pages_without_text: list[int]     # candidates for OCR (scanned pages)


def _clean(s: str) -> str:
    return re.sub(r"[ \t ]+", " ", (s or "").replace("\n", " ")).strip()


def _table_rows(raw: list[list[str | None]]) -> list[list[str]]:
    """Clean cells and carry merged cells (blank in the first columns) down from the row above."""
    rows = [[_clean(c or "") for c in r] for r in raw if any((c or "").strip() for c in r)]
    for i in range(1, len(rows)):
        for j in range(min(2, len(rows[i]))):          # merged cells are almost always row labels
            if not rows[i][j] and j < len(rows[i - 1]):
                rows[i][j] = rows[i - 1][j]
    return rows


def format_table(rows: list[list[str]], caption: str | None = None) -> str:
    """One line per data row: 'Header A: value; Header B: value'."""
    if not rows:
        return caption or ""
    header, body = rows[0], rows[1:] or [rows[0]]
    lines = [caption] if caption else []
    for r in body:
        cells = [f"{h}: {v}" if h else v for h, v in zip(header, r) if v]
        lines.append("; ".join(cells))
    return "\n".join(lines)


def extract_pdf(path: Path) -> ExtractedDocument:
    doc = pymupdf.open(str(path))
    raw_lines: list[tuple[int, float, float, bool, str, tuple]] = []   # page, y, size, bold, text, bbox
    tables: dict[int, list] = {}
    sizes: collections.Counter = collections.Counter()
    empty_pages: list[int] = []

    page_heights: dict[int, float] = {}
    for pno, page in enumerate(doc, 1):
        page_heights[pno] = page.rect.height
        found = page.find_tables().tables
        tables[pno] = found
        # Padded: header cells often poke a few points above the detected table edge.
        boxes = [pymupdf.Rect(t.bbox) + (-3, -8, 3, 4) for t in found]
        page_chars = 0
        for b in page.get_text("dict")["blocks"]:
            for line in b.get("lines", []):
                text = _clean("".join(s["text"] for s in line["spans"]))
                if not text or TOC_RE.search(text):
                    continue
                rect = pymupdf.Rect(line["bbox"])
                page_chars += len(text)
                if any(box.contains(rect) or box.intersect(rect).get_area() > 0.6 * rect.get_area() for box in boxes):
                    continue
                main = max(line["spans"], key=lambda s: len(s["text"]))
                size = round(main["size"], 1)
                sizes[size] += len(text)
                raw_lines.append((pno, rect.y0, size, bool(main["flags"] & 16), text, tuple(rect)))
        if page_chars < 20:
            empty_pages.append(pno)

    raw_lines.sort(key=lambda r: (r[0], r[1]))
    body_size = sizes.most_common(1)[0][0] if sizes else 12.0
    heading_sizes = sorted({s for s in sizes if s >= body_size + 0.75}, reverse=True)
    level_of = {s: i + 1 for i, s in enumerate(heading_sizes)}
    standalone_level = len(level_of) + 1
    big_gap = max(10.0, 1.8 * _typical_line_gap(raw_lines, body_size))
    column_width = _column_width(raw_lines, body_size)

    blocks: list[Block] = []
    prev_bottom: dict[int, float] = {}
    for pno, y, size, bold, text, bbox in raw_lines:
        gap_above = y - prev_bottom.get(pno, -1e9)
        prev_bottom[pno] = bbox[3]
        if CAPTION_RE.match(text) or len(text) > MAX_HEADING_CHARS:
            blocks.append(Block(pno, "text", text, y=y))
        elif (size in level_of or (bold and size >= body_size)) and _heading_shape(text, bbox, column_width):
            blocks.append(Block(pno, "heading", text, level=level_of.get(size, standalone_level), y=y))
        elif (_looks_like_standalone_heading(text) and gap_above >= big_gap
              and bbox[2] - bbox[0] < 0.75 * column_width):   # full-width line = wrapped body text
            # Body-size title on its own line, e.g. "ኬሚካል ማዳበሪያ" above a table.
            blocks.append(Block(pno, "heading", text, level=standalone_level, y=y))
        else:
            blocks.append(Block(pno, "text", text, y=y))

    # Insert tables at their position. A caption just above becomes part of the table; a table
    # at the top of a page with the same columns as the one ending the previous page continues it.
    last: dict | None = None
    for pno in sorted(tables):
        for t in tables[pno]:
            rows = _table_rows(t.extract())
            if not rows:
                continue
            ncols = len(rows[0])
            continues = (
                last is not None and last["page"] == pno - 1 and last["cols"] == ncols
                and t.bbox[1] < 0.2 * page_heights[pno] and last["bottom"] > 0.6 * page_heights[pno - 1]
            )
            if continues:
                header = last["header"]
                if rows[0] == header:          # header repeated on the new page
                    rows = rows[1:]
                rows = [header] + rows
                caption = last["caption"]
            else:
                caption = None
                near = [b for b in blocks if b.page == pno and b.kind == "text" and 0 <= t.bbox[1] - b.y < 60
                        and CAPTION_RE.match(b.text)]
                if near:
                    cap = max(near, key=lambda b: b.y)
                    caption = cap.text
                    blocks.remove(cap)
            blocks.append(Block(pno, "table", format_table(rows, caption), y=t.bbox[1], rows=rows))
            last = {"page": pno, "cols": ncols, "header": rows[0], "caption": caption, "bottom": t.bbox[3]}

    blocks.sort(key=lambda b: (b.page, b.y))
    _demote_heading_runs(blocks)
    merged = _drop_table_duplicates(_merge_paragraphs(blocks))
    return ExtractedDocument(Path(path), doc.page_count, merged, empty_pages)


_TOKEN_RE = re.compile(r"[\wሀ-᎟]+")


def _drop_table_duplicates(blocks: list[Block], overlap: float = 0.7) -> list[Block]:
    """Drop paragraphs that repeat a table on the same or next page.

    The table detector sometimes misses part of a table's area, so those cells
    also come through as scrambled running text.
    """
    table_tokens: dict[int, set[str]] = {}
    for b in blocks:
        if b.kind == "table":
            toks = set(_TOKEN_RE.findall(b.text.lower()))
            for p in (b.page, b.page + 1):
                table_tokens.setdefault(p, set()).update(toks)
    out = []
    for b in blocks:
        if b.kind == "text" and b.page in table_tokens:
            toks = _TOKEN_RE.findall(b.text.lower())
            if len(toks) >= 8 and sum(t in table_tokens[b.page] for t in toks) / len(toks) >= overlap:
                continue
        out.append(b)
    return out


_SENTENCE_END = ("።", "፡፡", "::", ":", ".", ";", "፣", ",", "፤", "?", "!")
_BULLETS = ("❖", "➢", "✓", "•", "", "", "-", "*", "o ")   # ❖ ➢ ✓ • and Wingdings bullets


def _demote_heading_runs(blocks: list[Block], min_run: int = 3) -> None:
    """Three or more same-level "headings" in a row with no text between them are figure
    labels or cells of an undetected table, not section titles."""
    i = 0
    while i < len(blocks):
        j = i
        while (j < len(blocks) and blocks[j].kind == "heading" and blocks[j].page == blocks[i].page
               and blocks[j].level == blocks[i].level and not _NUMBERED_RE.match(blocks[j].text)):
            j += 1
        if j - i >= min_run:
            for b in blocks[i:j]:
                b.kind = "text"
        i = max(j, i + 1)


_NUMBERED_RE = re.compile(r"^\s*\d+(\.\s?\d+)*\.\s+\S")


def _heading_shape(text: str, bbox: tuple, column_width: float) -> bool:
    """A larger/bold line that still reads like a title, not a paragraph or a table cell.

    Some documents set whole paragraphs or undetected tables one point larger than the body.
    """
    t = text.strip()
    if _NUMBERED_RE.match(t) and not t.endswith(_SENTENCE_END[:3]):
        return True                                      # "5.6. የማዳበሪያና ኖራ አጠቃቀም"
    return (
        not t.endswith(_SENTENCE_END[:3] + ("-", "–", "/"))
        and not re.fullmatch(r"[\d\s.,/%()*+=-]+", t)   # "1", "0.78** 55"
        and "=" not in t                                 # equations / table formulas
        and not t.startswith(_BULLETS)
        and bbox[2] - bbox[0] < 0.85 * column_width
    )


def _looks_like_standalone_heading(text: str) -> bool:
    t = text.strip()
    return (
        0 < len(t) <= 60
        and 2 <= len(t.split()) <= 6
        and not FIGURE_RE.match(t)
        and not re.fullmatch(r"\d+\s+\S+", t)          # "1 ጃለኔ": a table row remnant
        and not t.endswith(_SENTENCE_END)
        and not t.endswith(("-", "–", "/"))             # wrapped mid-number/word: "ከ121-"
        and not t.startswith(_BULLETS)
        and not re.fullmatch(r"[\d\s.,/%()-]+", t)      # numbers only (table remnants)
    )


def _column_width(raw_lines: list, body_size: float) -> float:
    """Width of a full body-text line (90th percentile), used to tell wrapped lines from titles."""
    widths = sorted(r[5][2] - r[5][0] for r in raw_lines if r[2] == body_size)
    return widths[int(0.9 * (len(widths) - 1))] if widths else 400.0


def _typical_line_gap(raw_lines: list, body_size: float) -> float:
    """Median vertical gap between consecutive body lines on the same page."""
    gaps = []
    for a, b in zip(raw_lines, raw_lines[1:]):
        if a[0] == b[0] and a[2] == body_size == b[2]:
            g = b[1] - a[5][3]
            if 0 <= g < 40:
                gaps.append(g)
    gaps.sort()
    return gaps[len(gaps) // 2] if gaps else 6.0


def _merge_paragraphs(blocks: list[Block]) -> list[Block]:
    """Join consecutive text lines on the same page into one paragraph block."""
    out: list[Block] = []
    for b in blocks:
        prev = out[-1] if out else None
        if b.kind == "text" and prev is not None and prev.kind == "text" and prev.page == b.page:
            prev.text = f"{prev.text} {b.text}"
        else:
            out.append(Block(b.page, b.kind, b.text, b.level, b.y, b.rows))
    return out
