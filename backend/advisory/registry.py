"""
registry.py — Pick provider implementations from environment variables.

The advisory core asks the registry for providers instead of constructing
them, so tests inject fakes and deployments switch providers by config.
"""

from __future__ import annotations

import sqlite3
from datetime import date

from backend.advisory.config import env


def llm():
    """LLM wrapped so live answers are recorded and replayed offline (demo kit)."""
    from backend.advisory.adapters.cache import RecordingLLM
    from backend.advisory.adapters.gemini import GeminiLLM

    inner = None if env("ADVISORY_LLM_PROVIDER", "gemini") == "replay" else GeminiLLM()
    return RecordingLLM(inner)


def embedder():
    if env("ADVISORY_EMBED_PROVIDER", "gemini") == "none":
        return None
    from backend.advisory.adapters.cache import CachingEmbedder
    from backend.advisory.adapters.gemini import GeminiEmbedder

    return CachingEmbedder(GeminiEmbedder())


def weather():
    from backend.advisory.adapters import weather as w

    if env("ADVISORY_WEATHER_PROVIDER", "open_meteo") == "fixture":
        path = env("ADVISORY_WEATHER_FIXTURE")
        if not path:
            raise RuntimeError("ADVISORY_WEATHER_FIXTURE must point to a JSON file when using the fixture provider.")
        from pathlib import Path

        return w.FixtureWeather.from_file(Path(path))
    return w.OpenMeteoWeather()


def farmer_profiles(conn: sqlite3.Connection):
    from backend.advisory.adapters import platform as p

    if env("ADVISORY_PROFILE_PROVIDER", "local") == "ati":
        return p.ATIFarmerProfileSource(conn)
    return p.LocalFarmerProfileSource(conn)


def input_hub(conn: sqlite3.Connection):
    from backend.advisory.adapters.platform import StubInputHub

    return StubInputHub(conn)


def market(conn: sqlite3.Connection, today: date | None = None):
    from backend.advisory.adapters.market_nmis import NMISMarket

    return NMISMarket(conn, today)
