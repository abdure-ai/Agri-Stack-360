"""
demo_setup.py — Load the demo accounts and demo data into a DEMO deployment (DEMO_MODE=1).

Runs the two demo seeds (scripts/seed_advisory_demo.py, scripts/seed_full_demo.py), then
scripts/presentation_data.py (products and treatment protocols from the MoA wheat manual) and, when
ADMIN_PASSWORD is set in .env, gives the administrator 0900000001 that password instead of the
public default from backend/db_init.py.

Refuses to run unless DEMO_MODE=1: the demo accounts have public passwords.

    docker compose --profile demo run --rm demo          # on the server (the deploy workflow does it once)
    .venv/Scripts/python.exe scripts/demo_setup.py        # locally
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.advisory.config import env  # noqa: E402
from backend.auth import hash_password  # noqa: E402
from backend.demo import demo_mode  # noqa: E402
from backend.platform_db import get_platform_connection  # noqa: E402

ADMIN_PHONE = "0900000001"


def main() -> int:
    if not demo_mode():
        print("DEMO_MODE is not 1 in .env: nothing done (demo accounts have public passwords).")
        return 1
    py = sys.executable
    for args in (["scripts/seed_advisory_demo.py", "--outbreak", "--da-inbox", "--input-trust"],
                 ["scripts/seed_full_demo.py"],
                 ["scripts/presentation_data.py"]):     # MoA-listed products and protocols, no doses
        print("→", " ".join(args))
        if subprocess.run([py, *args], cwd=ROOT).returncode != 0:
            return 1
    password = (env("ADMIN_PASSWORD") or "").strip()
    if password:
        if len(password) < 10:
            print("ADMIN_PASSWORD is shorter than 10 characters: the admin password was not changed.")
        else:
            conn = get_platform_connection()
            with conn:
                n = conn.execute("UPDATE users SET password_hash=? WHERE phone=? AND role='admin'",
                                 (hash_password(password), ADMIN_PHONE)).rowcount
            print(f"Administrator {ADMIN_PHONE}: password set from ADMIN_PASSWORD." if n else
                  f"No administrator {ADMIN_PHONE} found.")
    else:
        print(f"ADMIN_PASSWORD not set: administrator {ADMIN_PHONE} keeps its current password. "
              "If it is still the default from db_init.py, change it now.")
    print("Demo ready. The sign-in page lists the demo accounts while DEMO_MODE=1.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
