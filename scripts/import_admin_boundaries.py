"""
Import Ethiopian admin boundaries (regions, zones, woredas with P-codes and
centre points) into agri_platform.db.

    python scripts/import_admin_boundaries.py                       # data/reference/eth_admin_boundaries.xlsx
    python scripts/import_admin_boundaries.py path/to/file.xlsx     # a newer release

Safe to re-run: rows are updated in place by P-code.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.admin_areas import SOURCE_FILE, import_boundaries  # noqa: E402
from backend.platform_db import get_platform_connection  # noqa: E402

if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE_FILE
    counts = import_boundaries(get_platform_connection(), path)
    print(f"Imported from {path.name}: " + ", ".join(f"{v} {k}" for k, v in counts.items()))
