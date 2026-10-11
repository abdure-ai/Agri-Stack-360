"""
tts_api.py — Local text-to-speech with Meta MMS-TTS (VITS) for Ethiopian languages.

Runs in its own environment (.venv-tts: CPU PyTorch + transformers + uroman):

    .venv-tts/Scripts/python.exe -m uvicorn serving.tts_api:app --host 127.0.0.1 --port 8004

  GET  /health                 languages and which models are loaded
  POST /synthesize             {"text": "...", "language": "om"} -> audio/wav (16 kHz mono)
  POST /transcribe?language=om raw audio body (webm/ogg/mp4/wav) -> {"text": "..."}  speech-to-text

Used by the platform for Afaan Oromoo (no Gemini voice exists) and as an offline /
out-of-quota fallback for Amharic and Tigrinya.

Speech-to-text (voice questions in Afaan Oromoo) uses facebook/mms-1b-all with the Oromo adapter.
It is large (~3.9 GB on disk), so it is loaded only when a recording arrives, in bfloat16 (~2 GB of
memory), and unloaded after TTS_ASR_IDLE seconds without use (default 300). Audio is decoded with
PyAV (bundled ffmpeg) and is never written to disk.

LICENCE: the MMS-TTS models are CC-BY-NC 4.0 (non-commercial). Fine for the pilot and
demos; replace with a commercially licensed voice before commercial use.
"""

from __future__ import annotations

import io
import os
import threading
import time
import wave

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

MODELS = {
    "om": "facebook/mms-tts-orm",   # Afaan Oromoo (Latin script)
    "am": "facebook/mms-tts-amh",   # Amharic (Ge'ez script -> uroman)
    "ti": "facebook/mms-tts-tir",   # Tigrinya (Ge'ez script -> uroman)
}
NEEDS_UROMAN = {"am", "ti"}
MAX_CHARS = 1500

app = FastAPI(title="Agri-Stack 360 local TTS (MMS)")
_loaded: dict[str, tuple] = {}
_lock = threading.Lock()
_uroman = None


def _model(lang: str):
    with _lock:
        if lang not in _loaded:
            from transformers import AutoTokenizer, VitsModel

            name = MODELS[lang]
            _loaded[lang] = (VitsModel.from_pretrained(name).eval(), AutoTokenizer.from_pretrained(name))
        return _loaded[lang]


def _romanize(text: str) -> str:
    global _uroman
    if _uroman is None:
        import uroman

        _uroman = uroman.Uroman()
    return _uroman.romanize_string(text)


def _sentences(text: str) -> list[str]:
    """Short pieces: VITS quality drops on long inputs."""
    import re

    parts = re.split(r"(?<=[.!?።፧])\s+|\n+", text)
    out, buf = [], ""
    for p in (p.strip() for p in parts):
        if not p:
            continue
        if len(buf) + len(p) < 200:
            buf = f"{buf} {p}".strip()
        else:
            if buf:
                out.append(buf)
            buf = p
    if buf:
        out.append(buf)
    return out


def _wav(samples: np.ndarray, rate: int) -> bytes:
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


@app.on_event("startup")
def _preload() -> None:
    """Load voices in the background at startup (TTS_PRELOAD, default 'om') so the first listener does not wait."""
    import os

    langs = [x.strip() for x in os.environ.get("TTS_PRELOAD", "om").split(",") if x.strip() in MODELS]
    threading.Thread(target=lambda: [_model(lang) for lang in langs], name="tts-preload", daemon=True).start()


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_CHARS)
    language: str


@app.get("/health")
def health():
    return {"status": "ok", "languages": sorted(MODELS), "loaded": sorted(_loaded),
            "asr": {"languages": sorted(ASR_LANGS), "installed": _asr_installed(), "loaded": _asr["model"] is not None},
            "licence": "CC-BY-NC 4.0 (non-commercial)"}


# ── Speech-to-text (MMS-1B-all + language adapter) ───────────────────────────

ASR_MODEL = "facebook/mms-1b-all"
ASR_LANGS = {"om": "orm"}
ASR_MAX_BYTES = 2 * 1024 * 1024
ASR_MAX_SECONDS = 70
ASR_IDLE = int(os.environ.get("TTS_ASR_IDLE", "300"))
_asr: dict = {"model": None, "processor": None, "lang": None, "last": 0.0}
_asr_lock = threading.Lock()


def _asr_installed() -> bool:
    try:
        from huggingface_hub import try_to_load_from_cache

        return isinstance(try_to_load_from_cache(ASR_MODEL, "model.safetensors"), str) and \
            isinstance(try_to_load_from_cache(ASR_MODEL, "adapter.orm.safetensors"), str)
    except Exception:
        return False


def _asr_model(lang: str):
    import torch
    from transformers import AutoProcessor, Wav2Vec2ForCTC

    code = ASR_LANGS[lang]
    with _asr_lock:
        if _asr["model"] is None or _asr["lang"] != code:
            _asr["model"] = None
            _asr["processor"] = AutoProcessor.from_pretrained(ASR_MODEL, target_lang=code)
            _asr["model"] = Wav2Vec2ForCTC.from_pretrained(
                ASR_MODEL, target_lang=code, ignore_mismatched_sizes=True, torch_dtype=torch.bfloat16,
                low_cpu_mem_usage=True).eval()
            _asr["lang"] = code
        _asr["last"] = time.monotonic()
        return _asr["model"], _asr["processor"]


def _unload_when_idle() -> None:
    import gc

    while True:
        time.sleep(30)
        with _asr_lock:
            if _asr["model"] is not None and time.monotonic() - _asr["last"] > ASR_IDLE:
                _asr.update(model=None, processor=None, lang=None)
                gc.collect()


threading.Thread(target=_unload_when_idle, name="asr-unload", daemon=True).start()


def _decode(data: bytes) -> np.ndarray:
    """Any browser recording -> 16 kHz mono float32."""
    import av

    out = []
    with av.open(io.BytesIO(data)) as container:
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in container.decode(audio=0):
            for f in resampler.resample(frame):
                out.append(f.to_ndarray().reshape(-1))
        for f in resampler.resample(None):
            out.append(f.to_ndarray().reshape(-1))
    if not out:
        raise ValueError("no audio")
    return np.concatenate(out).astype(np.float32) / 32768.0


@app.post("/transcribe")
async def transcribe(request: Request, language: str):
    import torch

    if language not in ASR_LANGS:
        raise HTTPException(400, f"No local speech recognition for '{language}'. Available: {', '.join(sorted(ASR_LANGS))}")
    if not _asr_installed():
        raise HTTPException(503, "The speech recognition model is not installed.")
    data = await request.body()
    if not data or len(data) > ASR_MAX_BYTES:
        raise HTTPException(400, "Recording is empty or too long.")
    try:
        audio = _decode(data)
    except Exception:
        raise HTTPException(400, "Could not read the recording.")
    if len(audio) > ASR_MAX_SECONDS * 16000:
        raise HTTPException(400, "Recording is too long.")
    model, processor = _asr_model(language)
    inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
    with torch.inference_mode():
        logits = model(inputs.input_values.to(torch.bfloat16)).logits
    text = processor.decode(torch.argmax(logits, dim=-1)[0])
    _asr["last"] = time.monotonic()
    return {"text": text.strip(), "engine": "mms", "seconds": round(len(audio) / 16000, 1)}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    import torch

    if req.language not in MODELS:
        raise HTTPException(400, f"No local voice for '{req.language}'. Available: {', '.join(sorted(MODELS))}")
    model, tokenizer = _model(req.language)
    pieces = []
    silence = np.zeros(int(model.config.sampling_rate * 0.25), dtype=np.float32)
    for sentence in _sentences(req.text):
        text = _romanize(sentence) if req.language in NEEDS_UROMAN else sentence
        inputs = tokenizer(text, return_tensors="pt")
        if inputs["input_ids"].shape[-1] == 0:
            continue
        with torch.no_grad():
            pieces += [model(**inputs).waveform[0].numpy(), silence]
    if not pieces:
        raise HTTPException(400, "Nothing to read out.")
    return Response(_wav(np.concatenate(pieces), model.config.sampling_rate), media_type="audio/wav")
