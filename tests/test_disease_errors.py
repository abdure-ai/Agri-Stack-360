"""The disease service reports what went wrong, and the credit screen never waits long for the AI."""

import asyncio

import pytest
from fastapi.testclient import TestClient


def test_disease_service_reports_the_real_error(monkeypatch):
    pytest.importorskip("PIL")
    from serving import disease_api

    def broken():
        raise RuntimeError("Model could not be loaded (OSError: file signature not found)")

    monkeypatch.setattr(disease_api, "model", broken)
    import io

    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (20, 20), (0, 128, 0)).save(buf, "JPEG")
    r = TestClient(disease_api.app, raise_server_exceptions=False).post(
        "/predict", files={"image": ("x.jpg", buf.getvalue(), "image/jpeg")})
    assert r.status_code == 500 and "file signature not found" in r.json()["detail"]


def test_credit_explanation_does_not_block(monkeypatch):
    from backend.routers import financial

    async def slow(*a, **k):
        await asyncio.sleep(5)
        return "AI text"

    monkeypatch.setattr(financial, "_generate_score_explanation", slow)
    monkeypatch.setattr(financial, "EXPLANATION_WAIT_SECONDS", 0.1)
    financial._explanations.clear()
    text = asyncio.run(financial._get_score_explanation(70, {"id": 1, "region": "Amhara"}, [], []))
    assert "Your credit score of 70" in text          # the standard text, right away


def test_model_file_gets_linux_weight_paths():
    """Saved on Windows: weight paths use backslashes, which Keras on Linux cannot find."""
    h5py = pytest.importorskip("h5py")
    import io
    import zipfile
    from pathlib import Path

    from serving import disease_api

    original = Path(disease_api.ROOT) / disease_api.META["model_file"]
    assert disease_api.portable_model_file(original, sep="\\") == original
    fixed = disease_api.portable_model_file(original, sep="/")
    with zipfile.ZipFile(fixed) as z, h5py.File(io.BytesIO(z.read("model.weights.h5")), "r") as f:
        names = []
        f.visit(names.append)
    assert names and not any("\\" in n for n in names) and "_layer_checkpoint_dependencies/conv2d/vars/0" in names
