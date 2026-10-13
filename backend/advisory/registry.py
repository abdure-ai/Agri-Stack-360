"""
registry.py — Pick provider implementations from environment variables.

The advisory core asks the registry for providers instead of constructing
them, so tests inject fakes and deployments switch providers by config.
"""

from __future__ import annotations

import sqlite3
from datetime import date

from backend.advisory.config import env


LLM_PROVIDERS = ("gemini", "deepseek")


def llm_provider(conn: sqlite3.Connection | None = None) -> str:
    """Engine for written answers, chosen by an admin on the AI API Keys page (default Gemini)."""
    from backend.advisory.config import setting

    try:
        value = setting("llm_provider", "gemini", conn)
    except sqlite3.Error:
        value = "gemini"
    return value if value in LLM_PROVIDERS else "gemini"


def _engine(provider: str):
    if provider == "deepseek":
        from backend.advisory.adapters.deepseek import DeepSeekLLM

        return DeepSeekLLM()
    from backend.advisory.adapters.gemini import GeminiLLM

    return GeminiLLM()


class FallbackLLM:
    """The chosen engine; if it fails (no key, out of credit, down), the other one when it has a usable key."""

    def __init__(self, primary, secondary=None):
        self.primary, self.secondary = primary, secondary
        self.name = primary.name

    def generate(self, system, turns, *, temperature: float = 0.2, response_json: bool = False) -> str:
        from backend.ai_keys import has_usable_key
        from backend.advisory.providers import ProviderError

        try:
            return self.primary.generate(system, turns, temperature=temperature, response_json=response_json)
        except ProviderError:
            if self.secondary is None or not has_usable_key(self.secondary.name):
                raise
            return self.secondary.generate(system, turns, temperature=temperature, response_json=response_json)


def text_llm(conn: sqlite3.Connection | None = None):
    """Engine for written answers (selected provider, with the other as fallback when enabled)."""
    from backend.advisory.config import setting_int

    provider = llm_provider(conn)
    other = "deepseek" if provider == "gemini" else "gemini"
    try:
        fallback = setting_int("llm_fallback", 1, conn) == 1
    except sqlite3.Error:
        fallback = True
    return FallbackLLM(_engine(provider), _engine(other) if fallback else None)


def llm():
    """LLM wrapped so live answers are recorded and replayed offline (demo kit)."""
    from backend.advisory.adapters.cache import RecordingLLM

    inner = None if env("ADVISORY_LLM_PROVIDER", "gemini") == "replay" else text_llm()
    return RecordingLLM(inner)


def generate_text(prompt: str, *, system: str = "", history: list | None = None, temperature: float = 0.4) -> str:
    """One written answer from the selected engine (no recording): for short AI texts outside the advisor."""
    from backend.advisory.providers import ChatTurn

    turns = list(history or []) + [ChatTurn("user", prompt)]
    return text_llm().generate(system, turns, temperature=temperature)


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
    """Agro-dealer shops in the platform; ADVISORY_INPUT_HUB=stub keeps the old CSV file (tests, offline kits)."""
    from backend.advisory.adapters.platform import ShopInputHub, StubInputHub

    return StubInputHub(conn) if env("ADVISORY_INPUT_HUB", "shops") == "stub" else ShopInputHub(conn)


def market(conn: sqlite3.Connection, today: date | None = None):
    from backend.advisory.adapters.market_nmis import NMISMarket

    return NMISMarket(conn, today)
