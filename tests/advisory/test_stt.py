"""Voice questions (speech-to-text, Tier 1 M7): validation, prompt, offline, endpoint."""

import pytest

from backend.advisory import stt
from backend.advisory.providers import ProviderError
from tests.conftest import add_user

AUDIO = b"\x1aE\xdf\xa3" + b"\0" * 100      # webm header + padding


def test_prompt_names_language_and_script():
    p = stt.prompt_for("am")
    assert "Amharic" in p and "Ge'ez" in p and "Do not translate" in p
    assert "Qubee" in stt.prompt_for("om")


@pytest.mark.parametrize("audio,mime,lang", [
    (b"", "audio/webm", "am"), (AUDIO, "video/mp4", "am"), (AUDIO, "audio/webm", "fr"),
    (b"x" * (stt.MAX_BYTES + 1), "audio/webm", "am"),
], ids=["empty", "not-audio", "unknown-language", "too-long"])
def test_bad_recordings_are_refused(audio, mime, lang):
    with pytest.raises(ValueError):
        stt.transcribe(audio, mime, lang)


def test_transcribes_with_gemini(monkeypatch):
    seen = {}

    def fake(audio, mime, lang):
        seen.update(mime=mime, lang=lang)
        return "  በመስኖ ስንዴ ላይ ዩሪያ መቼ ልጨምር?  "

    monkeypatch.setattr(stt, "_gemini", fake)
    monkeypatch.setattr(stt, "offline", lambda: False)
    t = stt.transcribe(AUDIO, "audio/webm;codecs=opus", "am")
    assert t.text == "በመስኖ ስንዴ ላይ ዩሪያ መቼ ልጨምር?" and t.engine == "gemini"
    assert t.quality_verified is False                       # Amharic is flagged until checked
    assert seen == {"mime": "audio/webm", "lang": "am"}
    assert stt.transcribe(AUDIO, "audio/webm", "en").quality_verified is True


def test_silence_and_offline(monkeypatch):
    monkeypatch.setattr(stt, "_gemini", lambda *a: "")
    monkeypatch.setattr(stt, "offline", lambda: False)
    with pytest.raises(ValueError):
        stt.transcribe(AUDIO, "audio/webm", "en")
    monkeypatch.setattr(stt, "offline", lambda: True)
    with pytest.raises(ProviderError):
        stt.transcribe(AUDIO, "audio/webm", "en")


def test_endpoint(client_as, platform, monkeypatch):
    monkeypatch.setattr(stt, "_gemini", lambda *a: "When should I apply urea?")
    monkeypatch.setattr(stt, "offline", lambda: False)
    api = client_as(add_user(platform, 1))
    files = {"audio": ("q.webm", AUDIO, "audio/webm")}
    r = api.post("/api/advisory/stt", files=files, data={"language": "en"})
    assert r.status_code == 200 and r.json()["text"] == "When should I apply urea?"
    assert api.post("/api/advisory/stt", files={"audio": ("q.webm", b"", "audio/webm")}, data={"language": "en"}).status_code == 400
    gov = client_as(add_user(platform, 2, role="government"))
    assert gov.post("/api/advisory/stt", files=files, data={"language": "en"}).status_code == 403



def test_oromo_uses_gemini(monkeypatch):
    monkeypatch.setattr(stt, "_gemini", lambda *a: "Qamadii jallisiirratti yuuriyaa yoom naquu qaba")
    monkeypatch.setattr(stt, "offline", lambda: False)
    t = stt.transcribe(AUDIO, "audio/webm", "om")
    assert t.engine == "gemini" and t.quality_verified is False


def test_local_engine_is_used_when_switched_on(monkeypatch):
    monkeypatch.setitem(stt.ENGINES, "om", ("mms", "gemini"))
    monkeypatch.setattr(stt, "_gemini", lambda *a: "from gemini")
    monkeypatch.setattr(stt, "_mms", lambda *a: "gaaffii")
    monkeypatch.setattr(stt, "offline", lambda: True)
    assert stt.transcribe(AUDIO, "audio/webm", "om").engine == "mms"              # works offline

    def down(*a):
        raise ProviderError("not reachable")

    monkeypatch.setattr(stt, "_mms", down)
    monkeypatch.setattr(stt, "offline", lambda: False)
    assert stt.transcribe(AUDIO, "audio/webm", "om").engine == "gemini"           # falls back
