"""
models.py — Pydantic response models for the NMIS Dashboard API.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── Meta ──────────────────────────────────────────────────────────────────────

class CropMeta(BaseModel):
    id: int
    name: str
    min_date: str
    max_date: str
    record_count: int


class VarietyItem(BaseModel):
    id: int
    crop_id: int
    name: str
    unit: str


class MarketItem(BaseModel):
    id: int
    name: str
    region: str


class PriceLevelCoverage(BaseModel):
    retail: float
    producer: float
    wholesale: float


class MetaResponse(BaseModel):
    crops: list[CropMeta]
    regions: list[str]
    varieties: dict[str, list[VarietyItem]]   # keyed by crop name
    markets: dict[str, list[MarketItem]]      # keyed by region
    price_level_coverage: PriceLevelCoverage


# ── Prices ────────────────────────────────────────────────────────────────────

class PricePoint(BaseModel):
    date: str
    market_id: Optional[int] = None
    market_name: Optional[str] = None
    region: Optional[str] = None
    price_avg: Optional[float] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    volume: Optional[str] = None


class PricesResponse(BaseModel):
    unit: str
    price_level: str
    crop: str
    data_start: str           # earliest available date for this crop
    data: list[PricePoint]
    row_count: int
    aggregated: bool          # True if server collapsed to weekly averages


# ── Summary ───────────────────────────────────────────────────────────────────

class SummaryResponse(BaseModel):
    latest_price: Optional[float]
    latest_date: Optional[str]
    wow_change_pct: Optional[float]          # week-over-week %
    avg_4week: Optional[float]
    avg_all: Optional[float]
    price_min_period: Optional[float]
    price_max_period: Optional[float]
    volume_signal: Optional[str]
    obs_count: int
    data_start: str
    unit: str
    price_level: str


# ── Regional comparison ───────────────────────────────────────────────────────

class RegionalPoint(BaseModel):
    date: str
    region: str
    price_avg: Optional[float]
    price_min: Optional[float]
    price_max: Optional[float]
    market_count: int


class RegionalResponse(BaseModel):
    unit: str
    price_level: str
    crop: str
    data: list[RegionalPoint]


# ── Producer-retail spread ────────────────────────────────────────────────────

class SpreadPoint(BaseModel):
    date: str
    retail_avg: Optional[float]
    producer_avg: Optional[float]
    spread: Optional[float]           # retail - producer, ETB
    spread_pct: Optional[float]       # spread / producer * 100
    market_name: Optional[str] = None
    region: Optional[str] = None


class SpreadResponse(BaseModel):
    unit: str
    crop: str
    data: list[SpreadPoint]
    producer_coverage_pct: float     # warn if low


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    error: Optional[str] = None
