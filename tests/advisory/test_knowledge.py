"""Knowledge base: extraction, chunking, tagging, language detection and hybrid search."""

import sqlite3
from pathlib import Path

import numpy as np
import pytest

from backend.advisory.knowledge.chunking import MAX_TOKENS, chunk_blocks, estimate_tokens
from backend.advisory.knowledge.extract import Block, _looks_like_standalone_heading, format_table
from backend.advisory.knowledge.search import invalidate_cache, search, tokenize
from backend.advisory.knowledge.store import DocumentMeta, ingest_pdf
from backend.advisory.knowledge.tagging import tag
from backend.advisory.languages import detect_language, document_language
from backend.advisory.schema import ensure_schema

PACKAGE = Path(__file__).resolve().parents[2] / "data" / "knowledge" / "moa" / "bread-and-duram-wheat-package-2016.pdf"


# ── Language ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("text, lang", [
    ("ለዳቦ ስንዴ ምን ያህል ዩሪያ ያስፈልጋል?", "am"),
    ("Qamadii irratti xaa'oo yuuriyaa hangam fayyadamuu qaba?", "om"),
    ("How much urea should I use for wheat?", "en"),
    ("Dhukkubni qamadii koo maal fa'a?", "om"),
])
def test_detect_language(text, lang):
    assert detect_language(text) == lang


def test_geez_respects_tigrinya_preference():
    assert detect_language("ስንዴ ብኸመይ ይዝራእ", preferred="ti") == "ti"


def test_document_language():
    assert document_language("የስንዴ ሰብል ምርታማነት ተግዳሮቶች") == "am"
    assert document_language("Wheat production package") == "en"


# ── Extraction helpers ──────────────────────────────────────────────────────

def test_table_rows_use_header_names():
    text = format_table([["Soil", "Fertilizer", "Rate"], ["Black", "Urea", "200-250"]], "Table 4: fertilizer")
    assert text.splitlines() == ["Table 4: fertilizer", "Soil: Black; Fertilizer: Urea; Rate: 200-250"]


@pytest.mark.parametrize("line, expected", [
    ("ኬሚካል ማዳበሪያ", True),            # body-size title above a table
    ("1 ጃለኔ", False),                   # table row remnant
    ("የዝርያው", False),                  # single word
    ("ስዕል፤ የስንዴ ግንድ ዋግ", False),       # figure caption
    ("መዝራት ይመከራል፡፡", False),           # sentence
    ("❖ የተሻሻሉ ዝርያዎች", False),         # bullet item
])
def test_standalone_heading_rule(line, expected):
    assert _looks_like_standalone_heading(line) is expected


# ── Chunking and tagging ────────────────────────────────────────────────────

def test_chunks_follow_sections_and_keep_pages():
    blocks = [
        Block(1, "heading", "Fertilizer", level=1),
        Block(1, "text", "Apply urea in two splits. " * 40),
        Block(2, "heading", "Weeding", level=1),
        Block(2, "text", "Weed twice before tillering. " * 40),
        Block(3, "table", "Table 5: herbicides\nName: X; Rate: Y"),
    ]
    chunks = chunk_blocks(blocks)
    assert [c.section for c in chunks] == ["Fertilizer", "Weeding", "Weeding"]
    assert [c.kind for c in chunks] == ["text", "text", "table"]
    assert chunks[1].page_start == 2 and chunks[2].page_start == 3


def test_long_text_is_split_under_max_tokens():
    blocks = [Block(1, "heading", "H", level=1), Block(1, "text", "ዩርያ ማዳበሪያ በዘር ወቅት ይጨመራል፡፡ " * 400)]
    chunks = chunk_blocks(blocks)
    assert len(chunks) > 1
    assert all(estimate_tokens(c.text) <= MAX_TOKENS * 1.1 for c in chunks)


def test_long_table_repeats_caption():
    rows = "\n".join(f"Variety: V{i}; Days: {100 + i}; Altitude: 1600-2200; Yield: 40-52; Notes: " + "x " * 40
                     for i in range(60))
    chunks = chunk_blocks([Block(4, "table", "Table: varieties\n" + rows)])
    assert len(chunks) > 1
    assert all(c.text.startswith("Table: varieties") for c in chunks)


@pytest.mark.parametrize("text, section, topic", [
    ("ዩርያ (Urea) 200 - 250 ኪ.ግ/ሄ", "ኬሚካል ማዳበሪያ", "fertilizer"),
    ("ቢጫ ዋግ በሽታ", "የስንዴ በሽታዎች", "disease"),
    ("ምርቱን በደንብ አድርቆ በጎተራ ማከማቸት", "ክምችት", "storage"),
    ("General introduction", "", "general"),
])
def test_tagging(text, section, topic):
    assert tag(text, section)[0] == topic


def test_tokenizer_indexes_amharic_pieces():
    toks = tokenize("የስንዴ")
    assert "የስንዴ" in toks and "ስንዴ" in toks   # 3-letter piece matches the unprefixed word


# ── Ingest + search (real package PDF, offline) ─────────────────────────────

class FakeEmbedder:
    """Deterministic 'meaning' vectors: one dimension per concept keyword."""
    name = "fake"
    model_id = "fake@8"
    dimensions = 8
    CONCEPTS = [("urea", "ዩርያ", "ዩሪያ", "fertilizer", "ማዳበሪያ", "xaa'oo"), ("rust", "ዋግ"), ("store", "ክምችት"),
                ("weed", "አረም"), ("seed", "ዘር"), ("soil", "አፈር"), ("harvest", "አጨዳ"), ("variety", "ዝርያ")]

    def embed(self, texts, *, task):
        out = []
        for t in texts:
            low = t.lower()
            v = [sum(low.count(w) for w in c) for c in self.CONCEPTS]
            out.append([float(x) + 0.01 for x in v])
        return out


@pytest.fixture(scope="module")
def kb():
    if not PACKAGE.exists():
        pytest.skip("wheat package PDF not present")
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.executescript("CREATE TABLE users (id INTEGER PRIMARY KEY); CREATE TABLE farms (id INTEGER PRIMARY KEY);")
    ensure_schema(conn)
    meta = DocumentMeta(title="MoA Bread and Durum Wheat Production Package", crops=["wheat"], version_label="2016 E.C.")
    result = ingest_pdf(conn, PACKAGE, meta, FakeEmbedder())
    assert result.language == "am" and result.chunks > 20 and result.embedded == result.chunks
    yield conn
    invalidate_cache()


def test_acceptance_urea_query_returns_table_with_page(kb):
    """Spec F1: 'how much urea for bread wheat at tillering' -> wheat package chunk with title and page."""
    hits = search(kb, "how much urea for bread wheat at tillering", k=3, crop="wheat", embedder=None)
    top = hits[0]
    assert "Urea" in top.text and "200" in top.text
    assert top.page_start in (8, 9)
    assert top.citation().startswith("MoA Bread and Durum Wheat Production Package, 2016 E.C., p. ")


def test_hybrid_search_uses_vectors_across_languages(kb):
    hits = search(kb, "Qamadii irratti xaa'oo hangam fayyadamuu qaba?", k=3, crop="wheat", embedder=FakeEmbedder())
    assert hits and hits[0].vector_rank is not None
    assert any("Urea" in h.text or "ማዳበሪያ" in h.text for h in hits)


def test_crop_filter_excludes_other_crops(kb):
    assert search(kb, "urea", k=3, crop="maize") == []


def test_reingest_same_file_replaces_chunks(kb):
    before = kb.execute("SELECT COUNT(*) FROM knowledge_chunks").fetchone()[0]
    ingest_pdf(kb, PACKAGE, DocumentMeta(title="MoA Bread and Durum Wheat Production Package", crops=["wheat"],
                                         version_label="2016 E.C."), None)
    assert kb.execute("SELECT COUNT(*) FROM knowledge_documents").fetchone()[0] == 1
    assert kb.execute("SELECT COUNT(*) FROM knowledge_chunks").fetchone()[0] == before
