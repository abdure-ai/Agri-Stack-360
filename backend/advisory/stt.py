"""
stt.py — Voice questions: turn a farmer's spoken question into text (speech-to-text).

Engines per language (first that works wins), set in ENGINES:
  am, ti, en, om   Gemini audio understanding through the admin key pool (product owner's choice)
A local engine ("mms": serving/tts_api.py /transcribe, facebook/mms-1b-all + Oromo adapter, ~3.9 GB,
CC-BY-NC 4.0) is supported but switched off; to use it, install the model and put "mms" first for om.

Privacy: the recording is sent to Google Gemini only to produce the text. It is never stored by the platform; the screen tells the farmer this while recording. Only the text is kept (as the
question, like a typed one).
"""

from __future__ import annotations

from dataclasses import dataclass

from backend.advisory.config import env, offline
from backend.advisory.providers import ProviderError

MAX_BYTES = 2 * 1024 * 1024          # about a minute of compressed speech
ENGINES = {"am": ("gemini",), "ti": ("gemini",), "en": ("gemini",), "om": ("gemini",)}
# Languages whose transcription has been checked well enough to skip the "check carefully" note.
# Round trip on 2026-10-10: English exact; Amharic dropped "when" ("መቼ ልጨምር?"), so am stays flagged.
VERIFIED_QUALITY = {"en"}
LANGUAGE = {"am": ("Amharic", "Ge'ez (Ethiopic) script"), "ti": ("Tigrinya", "Ge'ez (Ethiopic) script"),
            "om": ("Afaan Oromoo", "Latin script (Qubee)"), "en": ("English", "Latin script")}
AUDIO_TYPES = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac"}


@dataclass
class Transcript:
    text: str
    language: str
    engine: str
    quality_verified: bool


def prompt_for(lang: str) -> str:
    name, script = LANGUAGE[lang]
    return (f"Transcribe this recording. The speaker is an Ethiopian farmer speaking {name}. "
            f"Write exactly what is said, in {script}. Do not translate, do not answer the question, "
            f"do not add anything. If there is no speech, return nothing.")


def _gemini(audio: bytes, mime: str, lang: str) -> str:
    from google.genai import types

    from backend.ai_keys import call_gemini

    model = env("ADVISORY_STT_MODEL", env("ADVISORY_LLM_MODEL", "gemini-3.6-flash"))
    contents = [types.Content(role="user", parts=[types.Part.from_bytes(data=audio, mime_type=mime),
                                                  types.Part(text=prompt_for(lang))])]
    config = types.GenerateContentConfig(temperature=0)
    resp = call_gemini(lambda client: client.models.generate_content(model=model, contents=contents, config=config))
    return getattr(resp, "text", None) or ""


def _mms(audio: bytes, mime: str, lang: str) -> str:
    import requests

    url = env("TTS_SERVICE_URL", "http://127.0.0.1:8004")
    try:
        # The first recording loads the model (~1-2 minutes on CPU), hence the long timeout.
        r = requests.post(f"{url}/transcribe", params={"language": lang}, data=audio,
                          headers={"Content-Type": mime}, timeout=300)
    except requests.RequestException as e:
        raise ProviderError(f"Local speech recognition is not reachable: {e}") from e
    if r.status_code == 400:
        raise ValueError(r.json().get("detail", "Could not read the recording."))
    if r.status_code != 200:
        raise ProviderError(f"Local speech recognition error {r.status_code}: {r.text[:200]}")
    return r.json().get("text", "")


def transcribe(audio: bytes, mime: str, lang: str) -> Transcript:
    """ValueError: a problem with the recording itself. ProviderError: the service is not available."""
    if lang not in ENGINES:
        raise ValueError(f"No voice input for language '{lang}'.")
    if not audio:
        raise ValueError("The recording is empty.")
    if len(audio) > MAX_BYTES:
        raise ValueError("The recording is too long. Keep the question under a minute.")
    base = (mime or "").split(";")[0].strip().lower()
    if base not in AUDIO_TYPES:
        raise ValueError("Unsupported audio format.")
    engines = [e for e in ENGINES[lang] if not (e == "gemini" and offline())]
    if not engines:
        raise ProviderError("Voice questions need the internet. Please type your question.")
    errors = []
    for engine in engines:
        try:
            text = ((_mms if engine == "mms" else _gemini)(audio, base, lang) or "").strip()
        except ProviderError as e:
            errors.append(f"{engine}: {e}")
            continue
        if not text:
            raise ValueError("No speech was heard. Please try again, closer to the phone.")
        return Transcript(text[:2000], lang, engine, lang in VERIFIED_QUALITY)
    raise ProviderError("Voice input is not available right now. " + " | ".join(errors))
