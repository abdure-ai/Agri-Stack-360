"""
demo.py — Demo accounts shown on the sign-in page of a demo deployment.

Switched on with DEMO_MODE=1 in .env (off by default). Then:
  - GET /api/auth/demo-accounts lists these accounts with their passwords, for one-tap sign-in;
  - the deploy workflow seeds them once (scripts/demo_setup.py).
Only accounts that exist and are active are listed. The administrator is never listed: its password
comes from ADMIN_PASSWORD in .env (scripts/demo_setup.py) and is not shown anywhere.

These passwords are public (repository and sign-in page). Use DEMO_MODE only on a demo site, and turn it
off (and remove the demo accounts) before real users join.
"""

from __future__ import annotations

import sqlite3

from backend.advisory.config import env

ACCOUNTS: list[dict] = [
    {"role": "farmer", "phone": "0944000001", "password": "demo1234", "note": "signin.demo.pitchFarmer"},
    {"role": "farmer", "phone": "0944000003", "password": "demo1234", "note": "signin.demo.farmerCases"},
    {"role": "farmer", "phone": "0945000023", "password": "demo1234", "note": "signin.demo.oromiaFarmer"},
    {"role": "agent", "phone": "0944000002", "password": "demo1234"},
    {"role": "agronomist", "phone": "0944000006", "password": "demo1234"},
    {"role": "government", "phone": "0944000004", "password": "demo1234"},
    {"role": "trader", "phone": "0933456789", "password": "trader123"},
    {"role": "supplier", "phone": "0944000005", "password": "demo1234"},
    {"role": "agro_dealer", "phone": "0944000007", "password": "demo1234"},
    {"role": "abc_manager", "phone": "0944000008", "password": "demo1234"},
    {"role": "farm_manager", "phone": "0944000009", "password": "demo1234"},
    {"role": "regulator", "phone": "0944000010", "password": "demo1234"},
    {"role": "ngo_staff", "phone": "0944000011", "password": "demo1234"},
    {"role": "lender", "phone": "0944000012", "password": "demo1234"},
    {"role": "ati_officer", "phone": "0944000013", "password": "demo1234"},
]


def demo_mode() -> bool:
    return env("DEMO_MODE", "0") == "1"


def listed_accounts(conn: sqlite3.Connection) -> list[dict]:
    """The demo accounts that exist and are active (empty unless DEMO_MODE=1)."""
    if not demo_mode():
        return []
    phones = [a["phone"] for a in ACCOUNTS]
    marks = ",".join("?" * len(phones))
    active = {r[0]: r[1] for r in conn.execute(
        f"SELECT phone, role FROM users WHERE is_active = 1 AND phone IN ({marks})", phones)}
    # Listed only if the role still matches (an admin may have changed it).
    return [a for a in ACCOUNTS if active.get(a["phone"]) == a["role"]]
