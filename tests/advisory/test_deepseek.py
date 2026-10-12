"""DeepSeek as a selectable engine for written answers (2026-10-12): adapter, key pool, switch, fallback."""

import json

import httpx
import pytest

from backend import ai_keys
from backend.advisory import registry
from backend.advisory.adapters.deepseek import DeepSeekLLM
from backend.advisory.providers import ChatTurn, ProviderError
from tests.conftest import add_user


@pytest.fixture
def pool(tmp_path, monkeypatch):
    monkeypatch.setattr(ai_keys, "DB_PATH", tmp_path / "keys.db")
    monkeypatch.setattr(ai_keys, "_env_key", lambda: None)
    monkeypatch.setattr(ai_keys, "offline", lambda: False)
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.setattr(ai_keys, "env", lambda name, default=None: "test-secret" if name in ("AI_KEYS_SECRET",) else default)
    for p in ai_keys.PROVIDERS:
        ai_keys.reset_env_key(p)
    ai_keys.ensure_schema()


def add(provider, label, key, priority=10):
    c = ai_keys._connect()
    c.execute("INSERT INTO ai_api_keys (provider, label, key_encrypted, key_hash, key_last4, priority) VALUES (?,?,?,?,?,?)",
              (provider, label, ai_keys.encrypt(key), ai_keys.key_hash(key), key[-4:], priority))
    c.commit()
    c.close()


def deepseek(handler):
    seen = []

    def wrapped(request: httpx.Request):
        seen.append(request)
        return handler(request)

    return DeepSeekLLM(client=httpx.Client(transport=httpx.MockTransport(wrapped))), seen


def ok(text):
    return httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": text}}]})


def test_request_format_and_json_mode(pool):
    add("deepseek", "DS 1", "sk-deepseek-aaaaaaaaaaaaaaaa")
    llm, seen = deepseek(lambda r: ok('{"answerable": true}'))
    out = llm.generate("SYSTEM", [ChatTurn("user", "Q1"), ChatTurn("assistant", "A1"), ChatTurn("user", "Q2")],
                       response_json=True)
    assert out == '{"answerable": true}'
    body = json.loads(seen[0].content)
    assert seen[0].url == httpx.URL("https://api.deepseek.com/chat/completions")
    assert seen[0].headers["authorization"] == "Bearer sk-deepseek-aaaaaaaaaaaaaaaa"
    assert [m["role"] for m in body["messages"]] == ["system", "user", "assistant", "user"]
    assert body["response_format"] == {"type": "json_object"} and body["model"] == "deepseek-chat"


def test_rotates_past_no_credit_and_rejected_keys(pool):
    add("deepseek", "empty", "sk-deepseek-empty-aaaaaaaaaa", 1)
    add("deepseek", "wrong", "sk-deepseek-wrong-aaaaaaaaaa", 2)
    add("deepseek", "good", "sk-deepseek-good-aaaaaaaaaaa", 3)
    add("gemini", "gemini key", "gemini-key-aaaaaaaaaaaaaaaaaa", 0)    # never used for DeepSeek

    def handler(r):
        key = r.headers["authorization"].split()[-1]
        if "empty" in key:
            return httpx.Response(402, json={"error": {"message": "Insufficient Balance"}})
        if "wrong" in key:
            return httpx.Response(401, json={"error": {"message": "Authentication Fails"}})
        return ok("Answer [S1].")

    llm, seen = deepseek(handler)
    assert llm.generate("", [ChatTurn("user", "Q")]) == "Answer [S1]."
    assert [r.headers["authorization"][-5:] for r in seen] == ["aaaaa"] * 3 and len(seen) == 3
    c = ai_keys._connect()
    status = dict(c.execute("SELECT label, status FROM ai_api_keys").fetchall())
    c.close()
    assert status["empty"] == "quota" and status["wrong"] == "invalid" and status["good"] == "ok"


def test_no_deepseek_key(pool):
    llm, _ = deepseek(lambda r: ok("x"))
    with pytest.raises(ProviderError, match="No DeepSeek API key"):
        llm.generate("", [ChatTurn("user", "Q")])


def test_engine_switch_and_fallback(pool, platform, monkeypatch, client_as):
    admin = add_user(platform, 9, role="admin")
    a = client_as(admin)
    assert registry.llm_provider(platform) == "gemini"
    r = a.put("/api/admin/ai-keys/engine", json={"llm_provider": "deepseek"}).json()
    assert r["llm_provider"] == "deepseek" and r["warning"] == "no_key"
    assert registry.text_llm(platform).primary.name == "deepseek"
    assert a.put("/api/admin/ai-keys/engine", json={"llm_provider": "openai"}).status_code == 422
    assert "llm_provider" not in [s["key"] for s in a.get("/api/admin/advisory-settings").json()]

    # DeepSeek fails -> Gemini answers, but only when Gemini has a usable key.
    class Failing:
        name = "deepseek"

        def generate(self, *a, **k):
            raise ProviderError("DeepSeek quota exhausted on every key (quota).")

    class Gemini:
        name = "gemini"

        def generate(self, *a, **k):
            return "from gemini"

    fb = registry.FallbackLLM(Failing(), Gemini())
    with pytest.raises(ProviderError):
        fb.generate("", [ChatTurn("user", "Q")])                  # no Gemini key yet
    add("gemini", "g", "gemini-key-bbbbbbbbbbbbbbbbbbbb")
    assert fb.generate("", [ChatTurn("user", "Q")]) == "from gemini"
    platform.execute("UPDATE advisory_settings SET value='0' WHERE key='llm_fallback'"); platform.commit()
    assert registry.text_llm(platform).secondary is None


def test_admin_adds_and_lists_deepseek_keys(pool, platform, client_as):
    ai_keys.ensure_schema(platform)     # admin routes use the platform connection (same file in production)
    a = client_as(add_user(platform, 9, role="admin"))
    assert a.post("/api/admin/ai-keys", json={"provider": "deepseek", "label": "DeepSeek main",
                                               "api_key": "sk-deepseek-cccccccccccccccc"}).status_code == 201
    listing = a.get("/api/admin/ai-keys").json()
    assert listing["keys"][0]["provider"] == "deepseek" and "api_key" not in listing["keys"][0]
    assert set(listing["providers"]) == {"gemini", "deepseek"}
    assert listing["providers"]["deepseek"]["env_key"]["variable"] == "DEEPSEEK_API_KEY"
    assert listing["engine"]["llm_provider"] == "gemini"
