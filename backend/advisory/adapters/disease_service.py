"""
disease_service.py — Client for the wheat disease model service (serving/disease_api.py, :8003).

The service runs locally (no internet needed), so diagnosis works in offline
demo mode too. It returns two predictions: photo only (ecological input held
at the training average) and photo + the farm's conditions.
"""

from __future__ import annotations

from dataclasses import dataclass

import requests

from backend.advisory.config import env
from backend.advisory.providers import EcologicalInput, ProviderError

DISEASE_URL = env("ADVISORY_DISEASE_URL", "http://localhost:8003")


@dataclass
class Prediction:
    label: str
    confidence: float
    probabilities: dict[str, float]


@dataclass
class DualPrediction:
    model_version: str
    photo_only: Prediction
    with_conditions: Prediction | None
    ecological_input: dict | None
    out_of_range: list[dict]


def _pred(d: dict) -> Prediction:
    return Prediction(d["top_label"], float(d["confidence"]), d["probabilities"])


class DiseaseServiceClient:
    name = "disease_service"

    def __init__(self, base_url: str = DISEASE_URL, timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def predict_dual(self, image: bytes, filename: str, ecological: EcologicalInput | None) -> DualPrediction:
        data = {}
        if ecological is not None:
            data = {"altitude_m": ecological.altitude_m, "temperature_c": ecological.temperature_c,
                    "humidity_pct": ecological.humidity_pct,
                    "precipitation_mm_per_week": ecological.precipitation_mm}
        try:
            r = requests.post(f"{self.base_url}/predict", files={"image": (filename, image)}, data=data,
                              timeout=self.timeout)
        except requests.RequestException as e:
            raise ProviderError(f"Disease model service is not reachable: {e}") from e
        if r.status_code == 400:
            raise ValueError(r.json().get("detail", "The file is not a readable image."))
        if r.status_code != 200:
            raise ProviderError(f"Disease model service error {r.status_code}: {r.text[:200]}")
        body = r.json()
        return DualPrediction(
            model_version=body["model_version"],
            photo_only=_pred(body["photo_only"]),
            with_conditions=_pred(body["with_conditions"]) if body.get("with_conditions") else None,
            ecological_input=body.get("ecological_input"),
            out_of_range=body.get("out_of_range") or [],
        )
