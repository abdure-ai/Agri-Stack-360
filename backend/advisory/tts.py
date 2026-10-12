"""
tts.py — Read advisor answers and alerts aloud (text-to-speech).

Engines, per language (first that works wins):
  am, ti  Gemini TTS (admin key pool)  -> local MMS service (offline / out of quota)
  en      Gemini TTS
  om      local MMS service (Gemini has no Afaan Oromoo voice)

The local MMS service (serving/tts_api.py, port 8004) uses CC-BY-NC 4.0 models: fine for the
pilot, to be replaced by a commercially licensed voice before commercial launch.

Audio is cached by language + text under data/cache/tts/, so a repeated answer plays
instantly and recorded demo answers can be read aloud offline.

Gemini gets the text only: an instruction in front of it ("Read this aloud in Amharic...") was
sometimes spoken out loud, and this voice model accepts no separate instruction. The language
comes from the text itself.
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import re
import wave
from dataclasses import dataclass

import requests

from backend.advisory.config import ROOT, env, offline
from backend.advisory.providers import ProviderError

log = logging.getLogger(__name__)

CACHE_DIR = ROOT / "data" / "cache" / "tts"
CACHE_VERSION = "v2"     # v1 clips could contain the spoken instruction; they are no longer used
MAX_CHARS = 1500
ENGINES = {"am": ("gemini", "mms"), "ti": ("gemini", "mms"), "en": ("gemini",), "om": ("mms",)}
GEMINI_VOICE = {"am": "Kore", "ti": "Kore", "en": "Kore"}
LANGUAGE_NAMES = {"am": "Amharic", "ti": "Tigrinya", "en": "English", "om": "Afaan Oromoo"}
_CITATION_RE = re.compile(r"\s*\[(?:S\d+|M|C)(?:\s*[,،፣;]\s*(?:S\d+|M|C))*\]")


@dataclass
class Speech:
    audio: bytes            # WAV
    engine: str             # gemini | mms
    cached: bool


def clean_for_speech(text: str) -> str:
    """Drop citation tags, bullets and extra spacing that would be read out literally."""
    text = _CITATION_RE.sub("", text)
    text = re.sub(r"^[\s•\-*➢✓❖]+", "", text, flags=re.M)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{2,}", "\n", text).strip()[:MAX_CHARS]


def _cache_path(lang: str, text: str):
    return CACHE_DIR / f"{hashlib.sha256(f'{CACHE_VERSION}|{lang}|{text}'.encode('utf-8')).hexdigest()[:32]}.wav"


def pcm_to_wav(pcm: bytes, rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


def _gemini(text: str, lang: str) -> bytes:
    from google.genai import types

    from backend.ai_keys import call_gemini

    model = env("ADVISORY_TTS_MODEL", "gemini-3.8-flash-tts")
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=GEMINI_VOICE.get(lang, "Kore")))),
    )
    resp = call_gemini(lambda client: client.models.generate_content(model=model, contents=text, config=config))
    part = resp.candidates[0].content.parts[0].inline_data
    data, mime = part.data, (part.mime_type or "")
    if data[:4] == b"RIFF":
        return data
    rate = int(m.group(1)) if (m := re.search(r"rate=(\d+)", mime)) else 24000
    return pcm_to_wav(data, rate)


def _mms(text: str, lang: str) -> bytes:
    url = env("TTS_SERVICE_URL", "http://127.0.0.1:8004")
    try:
        # First use of a language downloads its model (~150 MB), hence the long timeout.
        r = requests.post(f"{url}/synthesize", json={"text": text, "language": lang}, timeout=300)
    except requests.RequestException as e:
        raise ProviderError(f"Local voice service is not reachable: {e}") from e
    if r.status_code != 200:
        raise ProviderError(f"Local voice service error {r.status_code}: {r.text[:200]}")
    return r.content


def synthesize(text: str, lang: str) -> Speech:
    if lang not in ENGINES:
        raise ProviderError(f"No voice for language '{lang}'.")
    text = clean_for_speech(text)
    if not text:
        raise ProviderError("Nothing to read out.")
    path = _cache_path(lang, text)
    if path.exists():
        meta = path.with_suffix(".json")
        engine = json.loads(meta.read_text())["engine"] if meta.exists() else "cache"
        return Speech(path.read_bytes(), engine, True)

    errors = []
    for engine in ENGINES[lang]:
        if engine == "gemini" and offline():
            continue
        try:
            audio = _gemini(text, lang) if engine == "gemini" else _mms(text, lang)
        except ProviderError as e:
            log.warning("TTS %s failed for %s: %s", engine, lang, e)
            errors.append(f"{engine}: {e}")
            continue
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_bytes(audio)
        path.with_suffix(".json").write_text(json.dumps({"engine": engine, "lang": lang}))
        return Speech(audio, engine, False)
    raise ProviderError("No voice is available right now. " + " | ".join(errors))
