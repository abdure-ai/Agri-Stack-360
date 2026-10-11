"""
Load advisory reference data (diseases, approved products, dosage rules,
treatment protocols, crop calendar rules) from CSV into agri_platform.db.

    python scripts/load_advisory_seed.py                 # data/advisory_seed/
    python scripts/load_advisory_seed.py path/to/folder

Nothing is written if any file has an error.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.advisory.schema import ensure_schema  # noqa: E402
from backend.advisory.seed_loader import SeedError, load_seed  # noqa: E402
from backend.platform_db import get_platform_connection  # noqa: E402


def main() -> int:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "advisory_seed"
    conn = get_platform_connection()
    ensure_schema(conn)
    try:
        report = load_seed(conn, folder)
    except SeedError as e:
        print("Not loaded — fix these problems first:\n" + str(e))
        return 1
    print(report.summary())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
