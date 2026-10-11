"""
training_data.py — Crop-photo dataset for retraining the disease model.

Every photo check (camera or gallery, in the app or by a DA for a farmer) is copied into the
dataset **only when the farmer gave the separate training consent** (backend/consent.py). The copy:

  - is re-encoded as JPEG with all metadata removed (phone EXIF can hold the GPS point and the
    phone model), rotated upright, longest side at most MAX_SIDE pixels;
  - is stored apart from the diagnosis photos (data/training/images), so deleting an account's
    uploads and managing the dataset stay separate;
  - keeps only coarse context useful for the hybrid model: crop, woreda P-code, altitude, the
    past-week weather the model used, the model's answer and version, camera or gallery.
    Never the name, phone or GPS point. farmer_id stays internal (withdrawal/deletion) and is
    never exported.

Labels are resolved at export time: an agronomist's confirmed label (review → corrections) wins,
then a DA's verification; otherwise the photo is "unlabelled" and the model's answer is given
separately, marked as a prediction.

Withdrawing the training consent or deleting the account removes the farmer's photos. Photos
already used in a model that was trained earlier can't be taken out of that model (said in the
consent text, PLACEHOLDER_VERIFY legal review).
"""

from __future__ import annotations

import csv
import hashlib
import io
import logging
import sqlite3
import uuid
import zipfile
from datetime import datetime

from backend.advisory.config import ROOT

DATASET_DIR = ROOT / "data" / "training"
IMAGES_DIR = DATASET_DIR / "images"
MAX_SIDE = 1600
SOURCES = ("camera", "gallery", "telegram", "unknown")
log = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS training_images (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    diagnosis_id      INTEGER UNIQUE REFERENCES diagnoses(id) ON DELETE SET NULL,
    farmer_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- internal only, never exported
    file              TEXT NOT NULL,                                     -- relative to data/training/
    sha256            TEXT NOT NULL UNIQUE,                              -- of the original upload (duplicates skipped)
    width             INTEGER,
    height            INTEGER,
    capture_source    TEXT NOT NULL DEFAULT 'unknown' CHECK (capture_source IN ('camera','gallery','telegram','unknown')),
    crop              TEXT,
    woreda_pcode      TEXT,
    altitude_m        REAL,
    temperature_c     REAL,
    humidity_pct      REAL,
    precipitation_mm_week REAL,
    model_version     TEXT,
    model_label       TEXT,
    model_confidence  REAL,
    status            TEXT NOT NULL DEFAULT 'included' CHECK (status IN ('included','excluded')),
    excluded_reason   TEXT,
    reviewed_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_training_images_farmer ON training_images(farmer_id);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def clean_jpeg(data: bytes) -> tuple[bytes, int, int]:
    """Upright JPEG without any metadata, longest side <= MAX_SIDE. Raises ValueError if not an image."""
    from PIL import Image, ImageOps, UnidentifiedImageError

    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError) as e:
        raise ValueError("Not a readable image") from e
    img = img.convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=90, optimize=True)   # a fresh image: no EXIF/GPS/XMP carried over
    return out.getvalue(), img.width, img.height


def collect(conn: sqlite3.Connection, *, farmer_id: int, diagnosis_id: int | None, image: bytes,
            capture_source: str = "unknown", crop: str | None = None, woreda_pcode: str | None = None,
            altitude_m: float | None = None, weather: dict | None = None, model_version: str | None = None,
            model_label: str | None = None, model_confidence: float | None = None) -> int | None:
    """Add one photo if the farmer agreed. Returns the dataset row id, or None (no consent, duplicate, bad image)."""
    from backend.consent import has_training_consent

    if not has_training_consent(conn, farmer_id):
        return None
    digest = hashlib.sha256(image).hexdigest()
    if conn.execute("SELECT 1 FROM training_images WHERE sha256=?", (digest,)).fetchone():
        return None
    try:
        jpeg, width, height = clean_jpeg(image)
    except ValueError:
        return None
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{datetime.now():%Y%m}/{uuid.uuid4().hex}.jpg"
    (IMAGES_DIR / name).parent.mkdir(parents=True, exist_ok=True)
    (IMAGES_DIR / name).write_bytes(jpeg)
    w = weather or {}
    source = capture_source if capture_source in SOURCES else "unknown"
    with conn:
        cur = conn.execute(
            """INSERT INTO training_images (diagnosis_id, farmer_id, file, sha256, width, height, capture_source, crop,
                   woreda_pcode, altitude_m, temperature_c, humidity_pct, precipitation_mm_week, model_version,
                   model_label, model_confidence, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (diagnosis_id, farmer_id, f"images/{name}", digest, width, height, source, crop, woreda_pcode, altitude_m,
             w.get("temperature_c"), w.get("humidity_pct"), w.get("precipitation_mm_per_week"), model_version,
             model_label, model_confidence, datetime.now().isoformat(sep=" ", timespec="seconds")))
    return cur.lastrowid


def collect_safely(conn: sqlite3.Connection, **kwargs) -> int | None:
    """collect() for the photo-check request: a dataset problem never breaks the farmer's diagnosis."""
    try:
        return collect(conn, **kwargs)
    except Exception:          # noqa: BLE001 — logged; the diagnosis itself already succeeded
        log.exception("Could not add the photo to the training dataset")
        return None


def remove_farmer(conn: sqlite3.Connection, farmer_id: int) -> int:
    """Training consent withdrawn or account deleted: delete the farmer's photos from the dataset."""
    rows = conn.execute("SELECT id, file FROM training_images WHERE farmer_id=?", (farmer_id,)).fetchall()
    for _, file in rows:
        path = (DATASET_DIR / file).resolve()
        if DATASET_DIR.resolve() in path.parents and path.exists():
            path.unlink()
    with conn:
        conn.execute("DELETE FROM training_images WHERE farmer_id=?", (farmer_id,))
    return len(rows)


_ROWS = """
SELECT t.*, l.label AS reviewed_label, d.verified_disease,
       COALESCE(l.label, d.verified_disease) AS label,
       CASE WHEN l.label IS NOT NULL THEN 'agronomist' WHEN d.verified_disease IS NOT NULL THEN 'da' END AS label_source
FROM training_images t
LEFT JOIN diagnoses d ON d.id = t.diagnosis_id
LEFT JOIN training_labels l ON l.diagnosis_id = t.diagnosis_id
"""


def _dicts(cur) -> list[dict]:
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def rows(conn: sqlite3.Connection, *, status: str | None = None, labelled: bool | None = None,
         limit: int = 60, offset: int = 0) -> list[dict]:
    where, params = [], []
    if status:
        where.append("t.status = ?")
        params.append(status)
    if labelled is True:
        where.append("COALESCE(l.label, d.verified_disease) IS NOT NULL")
    elif labelled is False:
        where.append("COALESCE(l.label, d.verified_disease) IS NULL")
    sql = _ROWS + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY t.id DESC LIMIT ? OFFSET ?"
    out = _dicts(conn.execute(sql, (*params, limit, offset)))
    for r in out:
        r.pop("farmer_id", None)
        r.pop("sha256", None)
    return out


def summary(conn: sqlite3.Connection) -> dict:
    all_rows = _dicts(conn.execute(_ROWS))
    included = [r for r in all_rows if r["status"] == "included"]

    def count(key: str, items: list[dict]) -> dict:
        out: dict[str, int] = {}
        for r in items:
            k = (r[key] or "unlabelled") if key == "label" else (r[key] or "unknown")
            out[k] = out.get(k, 0) + 1
        return dict(sorted(out.items(), key=lambda kv: -kv[1]))

    return {
        "total": len(all_rows), "included": len(included), "excluded": len(all_rows) - len(included),
        "labelled": sum(1 for r in included if r["label"]),
        "by_label": count("label", included), "by_model_label": count("model_label", included),
        "by_source": count("capture_source", included),
        "farmers_consenting": conn.execute("SELECT COUNT(*) FROM farmer_profiles WHERE consent_training=1").fetchone()[0],
    }


EXPORT_COLUMNS = ["image", "label", "label_source", "model_label", "model_confidence", "model_version", "capture_source",
                  "crop", "woreda_pcode", "altitude_m", "temperature_c", "humidity_pct", "precipitation_mm_week",
                  "width", "height", "month"]


def export_zip(conn: sqlite3.Connection, labelled_only: bool = False) -> bytes:
    """ZIP: images/<label or unlabelled>/<id>.jpg + metadata.csv + README.txt. Included photos only."""
    items = rows(conn, status="included", labelled=True if labelled_only else None, limit=1_000_000)
    buf = io.BytesIO()
    meta = io.StringIO()
    w = csv.writer(meta)
    w.writerow(EXPORT_COLUMNS)
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:     # JPEGs don't compress further
        for r in items:
            src = DATASET_DIR / r["file"]
            if not src.exists():
                continue
            arc = f"images/{r['label'] or 'unlabelled'}/{r['id']}.jpg"
            z.write(src, arc)
            w.writerow([arc, r["label"] or "", r["label_source"] or "", r["model_label"] or "", r["model_confidence"],
                        r["model_version"] or "", r["capture_source"], r["crop"] or "", r["woreda_pcode"] or "",
                        r["altitude_m"], r["temperature_c"], r["humidity_pct"], r["precipitation_mm_week"],
                        r["width"], r["height"], (r["created_at"] or "")[:7]])
        z.writestr("metadata.csv", meta.getvalue())
        z.writestr("README.txt", (
            "Agri-Stack 360 crop-photo dataset.\n"
            "Collected only from farmers who agreed to their photos being used to improve the disease check.\n"
            "No names, phone numbers or GPS points; photo metadata removed.\n"
            "label: agronomist-confirmed (label_source=agronomist) or DA-verified (da); empty = not yet labelled.\n"
            "model_label: what the model said at the time (a prediction, not ground truth).\n"
            "Weather columns: the past-week values the hybrid model received.\n"
            "Do not share outside the project without the data protection review (PLACEHOLDER_VERIFY).\n"))
    return buf.getvalue()
