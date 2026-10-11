"""
weather.py — Weather providers (spec F6: behind an interface; source is configurable).

  OpenMeteoWeather  free global forecast API, no key. Past 7 days + 7-day forecast,
                    hourly and daily, plus terrain elevation. Every successful
                    response is cached on disk, and offline mode (or a network
                    failure) serves the cached copy, so the demo runs without network.
  FixtureWeather    fixed JSON for tests and rehearsals.

An Ethiopian Meteorology Institute adapter can be added later with the same
interface (WeatherProvider in providers.py).
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from statistics import mean

from backend.advisory.config import ROOT, offline
from backend.advisory.providers import DailyWeather, HourlyWeather, ProviderError, WeatherForecast

CACHE_DIR = ROOT / "data" / "cache" / "weather"
URL = "https://api.open-meteo.com/v1/forecast"
TIMEZONE = "Africa/Addis_Ababa"


def parse_open_meteo(data: dict, source: str, fetched_at: datetime) -> WeatherForecast:
    h, d = data.get("hourly", {}), data.get("daily", {})

    def col(block, name, i):
        values = block.get(name) or []
        return values[i] if i < len(values) else None

    hourly = [
        HourlyWeather(datetime.fromisoformat(t), col(h, "temperature_2m", i), col(h, "relative_humidity_2m", i),
                      col(h, "precipitation", i), col(h, "precipitation_probability", i))
        for i, t in enumerate(h.get("time", []))
    ]
    daily = [
        DailyWeather(date.fromisoformat(t), col(d, "temperature_2m_min", i), col(d, "temperature_2m_max", i),
                     col(d, "precipitation_sum", i), col(d, "precipitation_probability_max", i))
        for i, t in enumerate(d.get("time", []))
    ]
    cur = data.get("current") or {}
    current = HourlyWeather(datetime.fromisoformat(cur["time"]), cur.get("temperature_2m"),
                            cur.get("relative_humidity_2m"), cur.get("precipitation"), None) if cur.get("time") else None
    wf = WeatherForecast(float(data["latitude"]), float(data["longitude"]), source, fetched_at, current, hourly, daily)
    wf.elevation_m = data.get("elevation")  # type: ignore[attr-defined]
    return wf


class OpenMeteoWeather:
    name = "open_meteo"

    def __init__(self, cache_dir: Path = CACHE_DIR, timeout: float = 10.0):
        self.cache_dir = cache_dir
        self.timeout = timeout

    def _cache_path(self, lat: float, lon: float) -> Path:
        return self.cache_dir / f"{lat:.3f}_{lon:.3f}.json"

    def forecast(self, latitude: float, longitude: float, days: int = 7) -> WeatherForecast:
        path = self._cache_path(latitude, longitude)
        if not offline():
            params = {
                "latitude": f"{latitude:.4f}", "longitude": f"{longitude:.4f}", "timezone": TIMEZONE,
                "current": "temperature_2m,relative_humidity_2m,precipitation",
                "hourly": "temperature_2m,relative_humidity_2m,precipitation,precipitation_probability",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
                "past_days": 7, "forecast_days": days,
            }
            try:
                with urllib.request.urlopen(f"{URL}?{urllib.parse.urlencode(params)}", timeout=self.timeout) as r:
                    data = json.loads(r.read())
                fetched = datetime.now(timezone.utc)
                self.cache_dir.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps({"fetched_at": fetched.isoformat(), "data": data}), encoding="utf-8")
                return parse_open_meteo(data, self.name, fetched)
            except Exception:
                pass  # fall back to the cache below
        if path.exists():
            cached = json.loads(path.read_text(encoding="utf-8"))
            return parse_open_meteo(cached["data"], f"{self.name} (cached)", datetime.fromisoformat(cached["fetched_at"]))
        raise ProviderError("Weather is unavailable (offline and no cached forecast for this location).")


def cached_elevation(latitude: float, longitude: float, cache_dir: Path = CACHE_DIR) -> float | None:
    """Terrain elevation from an already-cached forecast, without any network call (None if not cached)."""
    path = cache_dir / f"{latitude:.3f}_{longitude:.3f}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))["data"].get("elevation")
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return None


class FixtureWeather:
    name = "fixture"

    def __init__(self, data: dict, fetched_at: datetime | None = None):
        self.data = data
        self.fetched_at = fetched_at or datetime.now(timezone.utc)

    @classmethod
    def from_file(cls, path: Path) -> "FixtureWeather":
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def forecast(self, latitude: float, longitude: float, days: int = 7) -> WeatherForecast:
        return parse_open_meteo({**self.data, "latitude": latitude, "longitude": longitude}, self.name, self.fetched_at)


# ── Summaries used by advice and by the disease model ─────────────────────────

def past_week_conditions(wf: WeatherForecast, now: datetime) -> dict:
    """Mean temperature and humidity and total rain over the 7 days before `now`.

    These are the disease model's ecological inputs (temperature_C, humidity_pct,
    precipitation_mm_per_week). The model's training data does not say whether its
    temperature was a daily mean; the 7-day mean is the closest reading.
    """
    start = now.timestamp() - 7 * 86400
    past = [h for h in wf.hourly if start <= h.time.timestamp() <= now.timestamp()]
    temps = [h.temperature_c for h in past if h.temperature_c is not None]
    hums = [h.relative_humidity_pct for h in past if h.relative_humidity_pct is not None]
    rain = [h.precipitation_mm for h in past if h.precipitation_mm is not None]
    return {
        "temperature_c": round(mean(temps), 1) if temps else None,
        "humidity_pct": round(mean(hums), 1) if hums else None,
        "precipitation_mm_per_week": round(sum(rain), 1) if rain else None,
        "hours_covered": len(past),
    }


def rain_in_next_hours(wf: WeatherForecast, now: datetime, hours: int, min_mm: float = 0.5,
                       min_probability: float = 50) -> list[HourlyWeather]:
    """Hours in the next `hours` with meaningful rain expected (amount or probability)."""
    end = now.timestamp() + hours * 3600
    return [
        h for h in wf.hourly
        if now.timestamp() < h.time.timestamp() <= end
        and ((h.precipitation_mm or 0) >= min_mm or (h.precipitation_probability_pct or 0) >= min_probability)
    ]
