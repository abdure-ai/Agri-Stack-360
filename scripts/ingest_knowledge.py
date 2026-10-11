"""
Bulk-load guideline PDFs into the advisory knowledge base.

    python scripts/ingest_knowledge.py                      # data/knowledge/moa/
    python scripts/ingest_knowledge.py path/to/folder --crop maize
    python scripts/ingest_knowledge.py --no-embed           # keyword search only (offline)

Metadata (title, crops, version, source URL) comes from manifest.csv in the
folder; PDFs not listed use their file name as title and --crop as crop.
Word files must be saved as PDF first (scripts/convert_word_to_pdf.ps1 or
File > Save As > PDF) so page numbers can be cited.
"""

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.advisory.adapters.gemini import GeminiEmbedder  # noqa: E402
from backend.advisory.knowledge.store import DocumentMeta, ingest_pdf  # noqa: E402
from backend.advisory.providers import ProviderError  # noqa: E402
from backend.advisory.schema import ensure_schema  # noqa: E402
from backend.platform_db import get_platform_connection  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", nargs="?", default=str(ROOT / "data" / "knowledge" / "moa"))
    ap.add_argument("--crop", default="wheat", help="crop for PDFs not in manifest.csv")
    ap.add_argument("--no-embed", action="store_true", help="skip embeddings (keyword search only)")
    args = ap.parse_args()

    folder = Path(args.folder)
    manifest = {}
    if (folder / "manifest.csv").exists():
        with (folder / "manifest.csv").open(encoding="utf-8-sig", newline="") as f:
            manifest = {r["file"]: r for r in csv.DictReader(f)}

    conn = get_platform_connection()
    ensure_schema(conn)
    embedder = None if args.no_embed else GeminiEmbedder()

    pdfs = sorted(folder.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs in {folder}")
        return 1
    for missing in sorted(set(manifest) - {p.name for p in pdfs}):
        print(f"waiting  {missing} (listed in manifest.csv, not in folder yet)")

    failures = 0
    for pdf in pdfs:
        m = manifest.get(pdf.name, {})
        meta = DocumentMeta(
            title=m.get("title") or pdf.stem.replace("-", " ").title(),
            crops=[c for c in (m.get("crops") or args.crop).split("|") if c],
            source_url=m.get("source_url") or None,
            language=m.get("language") or None,
            version_label=m.get("version_label") or None,
        )
        try:
            r = ingest_pdf(conn, pdf, meta, embedder)
        except ProviderError as e:
            print(f"embed failed for {pdf.name} ({e}); indexing for keyword search only")
            r = ingest_pdf(conn, pdf, meta, None)
        except Exception as e:  # keep going with the other files
            failures += 1
            print(f"FAILED   {pdf.name}: {e}")
            continue
        ocr = f", {len(r.pages_without_text)} pages need OCR: {r.pages_without_text}" if r.pages_without_text else ""
        print(f"ok       {pdf.name}: '{r.title}' {r.pages} pages, {r.chunks} chunks, {r.embedded} embedded, "
              f"language={r.language}{ocr}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
