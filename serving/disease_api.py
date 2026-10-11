"""
serving/disease_api.py — Wheat disease model service (image + ecological data).

Runs in its own environment because the model was saved with Keras 2.13 /
TensorFlow 2.13 (Python <= 3.11):

    .venv-disease\\Scripts\\python -m uvicorn serving.disease_api:app --host 127.0.0.1 --port 8003

Internal only: bound to localhost and called by the platform API, which does
login, permissions and logging. Farmers never call it directly.

Model: New_model_with_dropout_256_20_32.keras, trained by
Desktop/Experiment Result/Hybrid_with_dropout.py. The ecological inputs are
standardised with the training scaler reproduced in serving/disease/model_meta.json
(the original Hybrid_Prediction.py re-fitted a scaler on each single sample,
which turns every input into 0 so the model never saw real conditions).

Each request returns two predictions:
  photo_only       ecological input held at the training average (neutral)
  with_conditions  the farm's real conditions
so the advisory can show how much local conditions changed the result, and
treat disagreement as uncertainty.
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent.parent
META = json.loads((ROOT / "serving" / "disease" / "model_meta.json").read_text(encoding="utf-8"))
MAX_IMAGE_BYTES = 10 * 1024 * 1024

app = FastAPI(title="Wheat Disease Model", version="1.0.0", docs_url="/docs")
_model = None


def model():
    global _model
    if _model is None:
        import tensorflow as tf  # imported lazily so /health answers while TF loads

        _model = tf.keras.models.load_model(str(ROOT / META["model_file"]))
    return _model


def preprocess_image(data: bytes) -> np.ndarray:
    """Same steps as training: RGB, resize to 80x80 with PIL's default filter, /255."""
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)  # phone photos carry rotation in EXIF
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "The file is not a readable image.")
    img = img.convert("RGB").resize(tuple(META["image_size"]))
    return (np.asarray(img, dtype="float32") / 255.0)[None]


def scale(values: list[float]) -> np.ndarray:
    mean = np.array(META["scaler_mean"], dtype="float64")
    sd = np.array(META["scaler_scale"], dtype="float64")
    return ((np.array(values, dtype="float64") - mean) / sd)[None].astype("float32")


def summarise(probs: np.ndarray) -> dict:
    classes = META["classes"]
    order = np.argsort(probs)[::-1]
    return {
        "top_label": classes[int(order[0])],
        "confidence": float(probs[order[0]]),
        "probabilities": {classes[i]: round(float(probs[i]), 4) for i in range(len(classes))},
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.get("/metadata")
def metadata():
    keep = ("model_file", "classes", "ecological_features", "image_size", "training_ranges", "scaler_note")
    return {k: META[k] for k in keep}


@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    altitude_m: Optional[float] = Form(None),
    temperature_c: Optional[float] = Form(None),
    humidity_pct: Optional[float] = Form(None),
    precipitation_mm_per_week: Optional[float] = Form(None),
):
    data = await image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image is larger than 10 MB.")
    x_img = preprocess_image(data)
    m = model()

    neutral = scale(META["scaler_mean"])  # training average -> all zeros after scaling
    photo_only = summarise(m.predict([x_img, neutral], verbose=0)[0])

    eco = [altitude_m, temperature_c, humidity_pct, precipitation_mm_per_week]
    with_conditions = None
    out_of_range: list[dict] = []
    if all(v is not None for v in eco):
        for name, v in zip(META["ecological_features"], eco):
            lo, hi = META["training_ranges"][name]
            if not lo <= v <= hi:
                out_of_range.append({"feature": name, "value": v, "training_min": lo, "training_max": hi})
        with_conditions = summarise(m.predict([x_img, scale(eco)], verbose=0)[0])

    return {
        "model_version": META["model_file"],
        "photo_only": photo_only,
        "with_conditions": with_conditions,
        "ecological_input": dict(zip(META["ecological_features"], eco)) if with_conditions else None,
        "out_of_range": out_of_range,
    }
