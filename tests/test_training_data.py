"""Training-photo dataset with a separate consent (2026-10-11)."""

import io
import zipfile
from pathlib import Path
from types import SimpleNamespace

import pytest
from PIL import Image

from backend import erasure, training_data
from backend.advisory.adapters.disease_service import DualPrediction, Prediction
from backend.advisory.seed_loader import load_seed
from backend.routers import advisory as adv
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]


def jpeg_with_gps(color=(30, 140, 40)) -> bytes:
    img = Image.new("RGB", (2400, 1200), color)
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"                          # Make
    exif[0x8825] = {2: (9.0, 1.0, 0.0), 4: (38.0, 45.0, 0.0)}   # GPS IFD
    out = io.BytesIO()
    img.save(out, format="JPEG", exif=exif)
    return out.getvalue()


@pytest.fixture
def ds(platform, tmp_path, monkeypatch, client_as):
    monkeypatch.setattr(training_data, "DATASET_DIR", tmp_path / "training")
    monkeypatch.setattr(training_data, "IMAGES_DIR", tmp_path / "training" / "images")
    monkeypatch.setattr(adv, "UPLOADS", tmp_path / "uploads")
    load_seed(platform, ROOT / "data" / "advisory_seed")
    farmer = add_user(platform, 1, name="Abebe", phone="0933000001")
    other = add_user(platform, 2, phone="0933000002")
    reviewer = add_user(platform, 3, role="agronomist")
    platform.execute("INSERT INTO farms (id, user_id, field_name, crop_name, area_ha) VALUES (10, 1, 'Plot', 'wheat', 1)")
    platform.commit()

    pred = DualPrediction("test-model-1", Prediction("Yellow Rust", 0.93, {"Yellow Rust": 0.93}), None, None, [])
    monkeypatch.setattr(adv.DiseaseServiceClient, "predict_dual", lambda self, data, name, eco: pred)
    monkeypatch.setattr(adv, "_context", lambda farmer_id: SimpleNamespace(
        weather=SimpleNamespace(status="unavailable", data={}), profile={"altitude_m": 2400}))
    return {"farmer": farmer, "other": other, "reviewer": reviewer, "client_as": client_as}


def _check(ds, user, image=None, source="camera"):
    c = ds["client_as"](user)
    return c.post("/api/advisory/diagnose", files={"image": ("leaf.jpg", image or jpeg_with_gps(), "image/jpeg")},
                  data={"farm_id": "10", "capture_source": source})


def test_no_photo_kept_without_training_consent(ds, platform):
    assert _check(ds, ds["farmer"]).status_code == 200
    assert platform.execute("SELECT COUNT(*) FROM training_images").fetchone()[0] == 0


def test_kept_with_consent_cleaned_and_deduplicated(ds, platform):
    f = ds["client_as"](ds["farmer"])
    assert f.put("/api/users/consent", json={"training": True}).json()["training"] is True
    photo = jpeg_with_gps()
    r = _check(ds, ds["farmer"], photo, "gallery")
    assert r.status_code == 200
    _check(ds, ds["farmer"], photo)                          # same photo again: not stored twice
    rows = platform.execute("SELECT file, capture_source, crop, model_label, model_version, width, height, altitude_m "
                            "FROM training_images").fetchall()
    assert len(rows) == 1
    file, source, crop, label, version, w, h, alt = rows[0]
    assert (source, crop, label, version, alt) == ("gallery", "wheat", "Yellow Rust", "test-model-1", 2400)
    assert max(w, h) == training_data.MAX_SIDE
    stored = Image.open(training_data.DATASET_DIR / file)
    assert not stored.getexif() and "exif" not in stored.info  # GPS and phone model removed


def test_withdrawal_and_erasure_remove_photos(ds, platform):
    f = ds["client_as"](ds["farmer"])
    f.put("/api/users/consent", json={"training": True})
    _check(ds, ds["farmer"])
    file = platform.execute("SELECT file FROM training_images").fetchone()[0]
    f.put("/api/users/consent", json={"training": False})
    assert platform.execute("SELECT COUNT(*) FROM training_images").fetchone()[0] == 0
    assert not (training_data.DATASET_DIR / file).exists()
    kinds = [h["kind"] for h in f.get("/api/users/consent").json()["history"]]
    assert kinds.count("training") == 2

    f.put("/api/users/consent", json={"training": True})
    _check(ds, ds["farmer"], jpeg_with_gps((200, 180, 20)))
    assert erasure.erase(platform, 1)["training_photos"] == 1
    assert platform.execute("SELECT COUNT(*) FROM training_images").fetchone()[0] == 0


def test_review_list_exclude_and_export(ds, platform):
    ds["client_as"](ds["farmer"]).put("/api/users/consent", json={"training": True})
    _check(ds, ds["farmer"])
    _check(ds, ds["farmer"], jpeg_with_gps((90, 90, 200)))
    rev = ds["client_as"](ds["reviewer"])
    s = rev.get("/api/review/dataset/summary").json()
    assert (s["total"], s["included"], s["labelled"], s["farmers_consenting"]) == (2, 2, 0, 1)
    items = rev.get("/api/review/dataset/images").json()
    assert "farmer_id" not in items[0] and "sha256" not in items[0]
    assert rev.get(f"/api/review/dataset/images/{items[0]['id']}/file").headers["content-type"] == "image/jpeg"

    # Agronomist confirms a label on one; exclude the other (reason required).
    did = items[1]["diagnosis_id"]
    assert rev.post(f"/api/review/corrections/{did}/label", json={"label": "yellow_rust"}).status_code == 200
    assert rev.post(f"/api/review/dataset/images/{items[0]['id']}/status", json={"status": "excluded"}).status_code == 400
    assert rev.post(f"/api/review/dataset/images/{items[0]['id']}/status",
                    json={"status": "excluded", "reason": "blurred"}).status_code == 200

    z = zipfile.ZipFile(io.BytesIO(rev.get("/api/review/dataset/export.zip").content))
    names = z.namelist()
    assert f"images/yellow_rust/{items[1]['id']}.jpg" in names and "metadata.csv" in names
    meta = z.read("metadata.csv").decode()
    assert "agronomist" in meta and "Abebe" not in meta and "0933000001" not in meta
    assert len([n for n in names if n.endswith(".jpg")]) == 1      # excluded photo left out


def test_only_reviewers_see_the_dataset(ds):
    assert ds["client_as"](ds["farmer"]).get("/api/review/dataset/summary").status_code == 403


def test_bad_image_never_breaks_collection(ds, platform):
    platform.execute("UPDATE farmer_profiles SET consent_training=1 WHERE user_id=1")
    platform.execute("INSERT OR IGNORE INTO farmer_profiles (user_id, consent_training) VALUES (1, 1)")
    platform.commit()
    assert training_data.collect(platform, farmer_id=1, diagnosis_id=None, image=b"not an image") is None
