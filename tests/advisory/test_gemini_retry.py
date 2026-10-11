"""Gemini key pool: rotate past exhausted/rejected keys, wait only for short per-minute limits."""

from datetime import timedelta

import pytest

from backend import ai_keys
from backend.advisory.providers import ProviderError

PER_MINUTE = ("429 RESOURCE_EXHAUSTED. {'quotaId': 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier'}, "
              "{'@type': 'type.googleapis.com/google.rpc.RetryInfo', 'retryDelay': '12s'}")
PER_DAY = ("429 RESOURCE_EXHAUSTED. {'quotaId': 'GenerateRequestsPerDayPerProjectPerModel-FreeTier'}, "
           "{'retryDelay': '14147s'}")
INVALID = "400 INVALID_ARGUMENT. API key not valid. Please pass a valid API key. API_KEY_INVALID"
BUSY = "503 UNAVAILABLE: the model is overloaded"


@pytest.fixture
def pool(tmp_path, monkeypatch):
    """Empty key table in a temporary database, no .env key, secret set."""
    monkeypatch.setattr(ai_keys, "DB_PATH", tmp_path / "keys.db")
    monkeypatch.setattr(ai_keys, "_env_key", lambda: None)
    monkeypatch.setattr(ai_keys, "offline", lambda: False)
    monkeypatch.setenv("AI_KEYS_SECRET", "test-secret")
    ai_keys.reset_env_key()
    ai_keys.ensure_schema()
    return tmp_path


def add(label, key, priority):
    c = ai_keys._connect()
    c.execute("INSERT INTO ai_api_keys (label, key_encrypted, key_hash, key_last4, priority) VALUES (?,?,?,?,?)",
              (label, ai_keys.encrypt(key), ai_keys.key_hash(key), key[-4:], priority))
    c.commit()
    c.close()


def fake_gemini(monkeypatch, behaviour):
    """behaviour: api_key -> list of errors to raise in turn (then 'ok')."""
    calls = []

    def call_with_key(api_key, fn):
        calls.append(api_key)
        errors = behaviour.get(api_key, [])
        if errors:
            raise RuntimeError(errors.pop(0))
        return f"ok:{api_key}"
    monkeypatch.setattr(ai_keys, "call_with_key", call_with_key)
    return calls


def row(key):
    c = ai_keys._connect()
    r = dict(c.execute("SELECT * FROM ai_api_keys WHERE key_hash=?", (ai_keys.key_hash(key),)).fetchone())
    c.close()
    return r


def test_classify():
    assert ai_keys.classify(PER_MINUTE).kind == "rate_limited"
    assert ai_keys.classify(PER_MINUTE).cooldown == timedelta(seconds=13)
    assert ai_keys.classify(PER_DAY).kind == "quota"
    assert ai_keys.classify(PER_DAY).cooldown == timedelta(seconds=14148)
    assert ai_keys.classify("429 RESOURCE_EXHAUSTED quota").cooldown == ai_keys.DEFAULT_DAILY_COOLDOWN
    assert ai_keys.classify(INVALID).kind == "invalid"
    assert ai_keys.classify(BUSY).kind == "transient"


def test_keys_are_encrypted_and_never_stored_plain(pool):
    add("A", "AIzaSECRET-key-aaaa", 10)
    r = row("AIzaSECRET-key-aaaa")
    assert "SECRET" not in r["key_encrypted"] and r["key_last4"] == "aaaa"
    assert ai_keys.decrypt(r["key_encrypted"]) == "AIzaSECRET-key-aaaa"


def test_daily_quota_moves_to_next_key_and_cools_down(pool, monkeypatch):
    add("A", "key-aaaaaaaaaaaaaaaaaaaa", 10)
    add("B", "key-bbbbbbbbbbbbbbbbbbbb", 20)
    calls = fake_gemini(monkeypatch, {"key-aaaaaaaaaaaaaaaaaaaa": [PER_DAY]})
    assert ai_keys.call_gemini(lambda c: c) == "ok:key-bbbbbbbbbbbbbbbbbbbb"
    assert calls == ["key-aaaaaaaaaaaaaaaaaaaa", "key-bbbbbbbbbbbbbbbbbbbb"]
    a, b = row("key-aaaaaaaaaaaaaaaaaaaa"), row("key-bbbbbbbbbbbbbbbbbbbb")
    assert a["status"] == "quota" and a["cooldown_until"]
    assert b["status"] == "ok" and b["uses_today"] == 1
    # Next call skips the cooled-down key entirely.
    calls.clear()
    ai_keys.call_gemini(lambda c: c)
    assert calls == ["key-bbbbbbbbbbbbbbbbbbbb"]


def test_rejected_key_is_marked_invalid_and_skipped(pool, monkeypatch):
    add("A", "key-aaaaaaaaaaaaaaaaaaaa", 10)
    add("B", "key-bbbbbbbbbbbbbbbbbbbb", 20)
    fake_gemini(monkeypatch, {"key-aaaaaaaaaaaaaaaaaaaa": [INVALID]})
    assert ai_keys.call_gemini(lambda c: c).endswith("bbbb")
    assert row("key-aaaaaaaaaaaaaaaaaaaa")["status"] == "invalid"
    keys, _ = ai_keys.usable_keys()
    assert [k.label for k in keys] == ["B"]


def test_disabled_keys_and_priority_order(pool, monkeypatch):
    add("low", "key-llllllllllllllllllll", 50)
    add("high", "key-hhhhhhhhhhhhhhhhhhhh", 5)
    add("off", "key-oooooooooooooooooooo", 1)
    c = ai_keys._connect(); c.execute("UPDATE ai_api_keys SET enabled=0 WHERE label='off'"); c.commit(); c.close()
    calls = fake_gemini(monkeypatch, {})
    ai_keys.call_gemini(lambda c: c)
    assert calls == ["key-hhhhhhhhhhhhhhhhhhhh"]


def test_busy_service_is_retried_on_the_same_key(pool, monkeypatch):
    add("A", "key-aaaaaaaaaaaaaaaaaaaa", 10)
    calls = fake_gemini(monkeypatch, {"key-aaaaaaaaaaaaaaaaaaaa": [BUSY]})
    assert ai_keys.call_gemini(lambda c: c, sleep=lambda s: None).endswith("aaaa")
    assert calls == ["key-aaaaaaaaaaaaaaaaaaaa"] * 2


def test_all_keys_rate_limited_waits_once(pool, monkeypatch):
    add("A", "key-aaaaaaaaaaaaaaaaaaaa", 10)
    calls = fake_gemini(monkeypatch, {"key-aaaaaaaaaaaaaaaaaaaa": [PER_MINUTE]})
    waits = []

    def sleep(s):
        waits.append(s)
        c = ai_keys._connect(); c.execute("UPDATE ai_api_keys SET cooldown_until=NULL"); c.commit(); c.close()
    assert ai_keys.call_gemini(lambda c: c, sleep=sleep).endswith("aaaa")
    assert len(waits) == 1 and 0 < waits[0] <= 13
    assert calls == ["key-aaaaaaaaaaaaaaaaaaaa"] * 2


def test_all_keys_out_of_daily_quota_fails_fast(pool, monkeypatch):
    add("A", "key-aaaaaaaaaaaaaaaaaaaa", 10)
    add("B", "key-bbbbbbbbbbbbbbbbbbbb", 20)
    fake_gemini(monkeypatch, {"key-aaaaaaaaaaaaaaaaaaaa": [PER_DAY], "key-bbbbbbbbbbbbbbbbbbbb": [PER_DAY]})
    waits = []
    with pytest.raises(ProviderError, match="quota exhausted on every key"):
        ai_keys.call_gemini(lambda c: c, sleep=waits.append)
    assert waits == []


def test_env_key_is_the_last_fallback(pool, monkeypatch):
    add("A", "key-aaaaaaaaaaaaaaaaaaaa", 10)
    monkeypatch.setattr(ai_keys, "_env_key", lambda: "key-eeeeeeeeeeeeeeeeeeee")
    calls = fake_gemini(monkeypatch, {"key-aaaaaaaaaaaaaaaaaaaa": [PER_DAY]})
    assert ai_keys.call_gemini(lambda c: c).endswith("eeee")
    assert calls == ["key-aaaaaaaaaaaaaaaaaaaa", "key-eeeeeeeeeeeeeeeeeeee"]
    # The .env key exhausted too: its cooldown is remembered in memory.
    fake_gemini(monkeypatch, {"key-eeeeeeeeeeeeeeeeeeee": [PER_DAY]})
    with pytest.raises(ProviderError):
        ai_keys.call_gemini(lambda c: c, sleep=lambda s: None)
    assert ai_keys.env_key_state()["status"] == "quota"


def test_no_keys_at_all(pool):
    with pytest.raises(ProviderError, match="No Gemini API key"):
        ai_keys.call_gemini(lambda c: c)


def test_other_errors_are_not_retried_on_other_keys(pool, monkeypatch):
    add("A", "key-aaaaaaaaaaaaaaaaaaaa", 10)
    add("B", "key-bbbbbbbbbbbbbbbbbbbb", 20)
    calls = fake_gemini(monkeypatch, {"key-aaaaaaaaaaaaaaaaaaaa": ["400 INVALID_ARGUMENT: prompt too long"]})
    with pytest.raises(ProviderError, match="prompt too long"):
        ai_keys.call_gemini(lambda c: c)
    assert calls == ["key-aaaaaaaaaaaaaaaaaaaa"]
