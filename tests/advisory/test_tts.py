"""Text-to-speech: engine per language, fallback, caching, text clean-up."""

import pytest

from backend.advisory import tts
from backend.advisory.providers import ProviderError


@pytest.fixture
def engines(tmp_path, monkeypatch):
    monkeypatch.setattr(tts, "CACHE_DIR", tmp_path / "tts")
    monkeypatch.setattr(tts, "offline", lambda: False)
    calls = []
    state = {"gemini_fails": False, "mms_fails": False}

    def gemini(text, lang):
        calls.append(("gemini", lang))
        if state["gemini_fails"]:
            raise ProviderError("Gemini quota exhausted on every key")
        return b"RIFF-gemini"

    def mms(text, lang):
        calls.append(("mms", lang))
        if state["mms_fails"]:
            raise ProviderError("Local voice service is not reachable")
        return b"RIFF-mms"
    monkeypatch.setattr(tts, "_gemini", gemini)
    monkeypatch.setattr(tts, "_mms", mms)
    return calls, state


def test_clean_for_speech_drops_citations_and_bullets():
    text = "Apply urea at tillering [S1][C]. Second split at booting [S1, S2].\n• Wear gloves."
    assert tts.clean_for_speech(text) == "Apply urea at tillering. Second split at booting.\nWear gloves."


def test_oromo_uses_local_voice(engines):
    calls, _ = engines
    s = tts.synthesize("Qamadii kee ilaali.", "om")
    assert s.engine == "mms" and calls == [("mms", "om")]


def test_amharic_prefers_gemini_then_falls_back_to_local(engines):
    calls, state = engines
    assert tts.synthesize("ስንዴዎን ይመርምሩ።", "am").engine == "gemini"
    state["gemini_fails"] = True
    assert tts.synthesize("ሌላ ጽሑፍ።", "am").engine == "mms"
    assert calls[-2:] == [("gemini", "am"), ("mms", "am")]


def test_offline_skips_gemini(engines, monkeypatch):
    calls, _ = engines
    monkeypatch.setattr(tts, "offline", lambda: True)
    assert tts.synthesize("ቢጫ ዋግ ተገኝቷል።", "ti").engine == "mms"
    assert ("gemini", "ti") not in calls


def test_audio_is_cached(engines):
    calls, _ = engines
    first = tts.synthesize("Check your field [S1].", "en")
    second = tts.synthesize("Check your field.", "en")       # same spoken text after clean-up
    assert not first.cached and second.cached and second.engine == "gemini"
    assert calls == [("gemini", "en")]


def test_no_engine_available(engines):
    _, state = engines
    state["gemini_fails"] = state["mms_fails"] = True
    with pytest.raises(ProviderError, match="No voice is available"):
        tts.synthesize("Hello", "en")
    with pytest.raises(ProviderError, match="No voice for language"):
        tts.synthesize("Hello", "fr")


def test_pcm_is_wrapped_in_wav():
    wav = tts.pcm_to_wav(b"\x00\x00" * 100, 24000)
    assert wav[:4] == b"RIFF" and wav[8:12] == b"WAVE"


def test_gemini_gets_only_the_text_no_spoken_instruction(monkeypatch):
    """An instruction in front of the text ("Read this aloud in Amharic...") was read out loud."""
    from types import SimpleNamespace

    from backend import ai_keys
    from backend.advisory import tts

    sent = []

    def fake_call(fn):
        client = SimpleNamespace(models=SimpleNamespace(generate_content=lambda **kw: sent.append(kw) or SimpleNamespace(
            candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(
                inline_data=SimpleNamespace(data=b"\x00\x00" * 10, mime_type="audio/L16;rate=24000"))]))])))
        return fn(client)

    monkeypatch.setattr(ai_keys, "call_gemini", fake_call)
    audio = tts._gemini("ስንዴውን አረም ያስወግዱ።", "am")
    assert sent[0]["contents"] == "ስንዴውን አረም ያስወግዱ።" and audio[:4] == b"RIFF"
