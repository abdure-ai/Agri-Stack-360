"""
providers.py — Interfaces for everything outside the advisory core.

The advisory logic depends only on these Protocols, so a stub can be swapped
for a real service (Farmer Profile, Input Hub, another LLM, EMI weather data)
without touching it. Implementations live in backend/advisory/adapters/ and
are chosen in registry.py from environment variables.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Protocol


# ── LLM and embeddings ─────────────────────────────────────────────────────────

@dataclass
class ChatTurn:
    role: str  # 'user' | 'assistant'
    content: str


class LLMProvider(Protocol):
    name: str

    def generate(self, system: str, turns: list[ChatTurn], *, temperature: float = 0.2) -> str:
        """Return the model's reply. Raise ProviderError on failure."""


class EmbeddingProvider(Protocol):
    name: str
    dimensions: int

    def embed(self, texts: list[str], *, task: str) -> list[list[float]]:
        """task: 'document' when indexing, 'query' when searching."""


# ── Weather ────────────────────────────────────────────────────────────────────

@dataclass
class HourlyWeather:
    time: datetime
    temperature_c: float | None
    relative_humidity_pct: float | None
    precipitation_mm: float | None
    precipitation_probability_pct: float | None


@dataclass
class DailyWeather:
    day: date
    temp_min_c: float | None
    temp_max_c: float | None
    precipitation_mm: float | None
    precipitation_probability_pct: float | None


@dataclass
class WeatherForecast:
    latitude: float
    longitude: float
    source: str
    fetched_at: datetime
    current: HourlyWeather | None
    hourly: list[HourlyWeather] = field(default_factory=list)
    daily: list[DailyWeather] = field(default_factory=list)


class WeatherProvider(Protocol):
    name: str

    def forecast(self, latitude: float, longitude: float, days: int = 7) -> WeatherForecast: ...


# ── Disease model ──────────────────────────────────────────────────────────────

@dataclass
class EcologicalInput:
    altitude_m: float
    temperature_c: float
    humidity_pct: float
    precipitation_mm: float


@dataclass
class DiseasePrediction:
    model_label: str               # top class, e.g. 'Yellow Rust'
    confidence: float              # 0..1
    probabilities: dict[str, float]
    model_version: str
    ecological_used: bool          # False while the training scaler is unknown


class DiseaseDetector(Protocol):
    name: str

    def predict(self, image: bytes, ecological: EcologicalInput) -> DiseasePrediction: ...


# ── Platform integrations (stubs until the real APIs exist) ────────────────────

@dataclass
class FarmerProfile:
    farmer_id: int
    name: str
    phone: str | None
    language: str
    region: str | None
    zone: str | None
    woreda: str | None
    kebele: str | None
    latitude: float | None
    longitude: float | None
    altitude_m: float | None
    assigned_da_id: int | None
    consent_data: bool
    consent_alerts: bool


class FarmerProfileSource(Protocol):
    def get(self, farmer_id: int) -> FarmerProfile | None: ...


@dataclass
class InputOffer:
    product_id: int
    product_name: str
    supplier: str
    distance_km: float | None
    price_etb: float | None
    unit: str | None
    in_stock: bool | None
    sponsored: bool = False        # display-only; never used in ranking (spec F8)


class InputHubSource(Protocol):
    def offers(self, product_ids: list[int], latitude: float | None, longitude: float | None,
               region: str | None) -> list[InputOffer]: ...


@dataclass
class MarketQuote:
    crop: str
    market: str
    region: str
    price_etb: float | None
    unit: str
    as_of: date | None
    trend: str                     # 'rising' | 'stable' | 'falling' | 'unknown'
    forecast_change_pct: float | None
    forecast_weeks: int | None
    forecast_confidence: str | None


class MarketSource(Protocol):
    def quotes(self, crop: str, region: str | None, near_markets: list[str]) -> list[MarketQuote]: ...


class ProviderError(RuntimeError):
    """A provider could not answer (network down, quota, bad response)."""
