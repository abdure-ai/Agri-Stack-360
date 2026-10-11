"""
config.py — Advisory settings from environment variables (secrets) and the
advisory_settings table (admin-tunable thresholds).

Environment variables (all optional except the API key for online use):
  GEMINI_API_KEY             LLM + embeddings (read from env or .env)
  ADVISORY_LLM_PROVIDER      'gemini' (default) | 'replay' (offline demo)
  ADVISORY_LLM_MODEL         default 'gemini-3.6-flash' (same model the platform already uses)
  ADVISORY_EMBED_PROVIDER    'gemini' (default) | 'none' (keyword search only)
  ADVISORY_EMBED_MODEL       default 'gemini-embedding-001'
  ADVISORY_WEATHER_PROVIDER  'open_meteo' (default) | 'fixture'
  ADVISORY_DISEASE_URL       disease model service, default 'http://localhost:8003'
  ADVISORY_OFFLINE           '1' = never call the network; use cached / replayed data
  ADVISORY_EMERGENCY_CONTACT poisoning emergency number shown in safety text (placeholder until set)
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

# East Africa Time: UTC+3 all year (no daylight saving), so a fixed offset is exact.
EAT = timezone(timedelta(hours=3), "EAT")


def local_now() -> datetime:
    """Current Ethiopian local time as a naive datetime (matches Open-Meteo's local times)."""
    return datetime.now(EAT).replace(tzinfo=None)

ROOT = Path(__file__).resolve().parents[2]
EMERGENCY_CONTACT_PLACEHOLDER = "PLACEHOLDER_VERIFY_EMERGENCY_CONTACT"
HOTLINE_8028 = "8028"


@lru_cache(maxsize=None)
def _dotenv() -> dict[str, str]:
    values: dict[str, str] = {}
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip()
    return values


def env(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name) or _dotenv().get(name) or default


def offline() -> bool:
    return env("ADVISORY_OFFLINE", "0") == "1"


def setting(key: str, default: str | None = None, conn=None) -> str | None:
    """Admin-tunable value from advisory_settings (see schema.DEFAULT_SETTINGS)."""
    if conn is None:
        from backend.platform_db import get_platform_connection

        conn = get_platform_connection()
    row = conn.execute("SELECT value FROM advisory_settings WHERE key=?", (key,)).fetchone()
    return row[0] if row else default


def setting_float(key: str, default: float, conn=None) -> float:
    try:
        return float(setting(key, str(default), conn))
    except (TypeError, ValueError):
        return default


def setting_int(key: str, default: int, conn=None) -> int:
    try:
        return int(float(setting(key, str(default), conn)))
    except (TypeError, ValueError):
        return default
