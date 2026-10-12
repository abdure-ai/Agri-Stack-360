"""
deepseek.py — DeepSeek adapter for the LLM interface (written answers only).

DeepSeek offers chat completions (OpenAI-compatible API); it has no embeddings, speech-to-text
or text-to-speech, so those stay on Gemini. Keys come from the admin-managed pool
(provider "deepseek") with DEEPSEEK_API_KEY in .env as the last fallback.

Settings: DEEPSEEK_MODEL (default deepseek-chat), DEEPSEEK_BASE_URL (default https://api.deepseek.com).
Only the anonymised prompt is sent (the same text Gemini would get: no names, phones or GPS points).
"""

from __future__ import annotations

import httpx

from backend.advisory.config import env
from backend.advisory.providers import ChatTurn, ProviderError

DEFAULT_MODEL = "deepseek-chat"
DEFAULT_BASE_URL = "https://api.deepseek.com"


class DeepSeekLLM:
    name = "deepseek"

    def __init__(self, model: str | None = None, base_url: str | None = None, client: httpx.Client | None = None,
                 timeout_s: float = 60.0):
        self.model = model or env("DEEPSEEK_MODEL", DEFAULT_MODEL)
        self.url = (base_url or env("DEEPSEEK_BASE_URL", DEFAULT_BASE_URL)).rstrip("/") + "/chat/completions"
        self.client = client
        self.timeout_s = timeout_s

    def _post(self, api_key: str, body: dict) -> str:
        client = self.client or httpx.Client(timeout=self.timeout_s)
        try:
            r = client.post(self.url, json=body, headers={"Authorization": f"Bearer {api_key}"})
        except httpx.HTTPError as e:            # keep the class name: the key pool classifies timeouts by it
            raise RuntimeError(f"{e.__class__.__name__}: {e}") from e
        finally:
            if self.client is None:
                client.close()
        if r.status_code != 200:
            try:
                detail = r.json().get("error", {}).get("message") or r.text
            except ValueError:
                detail = r.text
            raise RuntimeError(f"HTTP {r.status_code}: {str(detail)[:300]}")
        try:
            return r.json()["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, ValueError) as e:
            raise RuntimeError(f"Unexpected DeepSeek response: {r.text[:200]}") from e

    def generate(self, system: str, turns: list[ChatTurn], *, temperature: float = 0.2,
                 response_json: bool = False) -> str:
        from backend.ai_keys import call_pool

        messages = ([{"role": "system", "content": system}] if system else []) + [
            {"role": "assistant" if t.role == "assistant" else "user", "content": t.content} for t in turns]
        body = {"model": self.model, "messages": messages, "temperature": temperature, "stream": False}
        if response_json:
            body["response_format"] = {"type": "json_object"}   # our prompts ask for JSON, as DeepSeek requires
        text = call_pool("deepseek", lambda api_key: self._post(api_key, body)).strip()
        if not text:
            raise ProviderError("DeepSeek returned an empty answer.")
        return text
