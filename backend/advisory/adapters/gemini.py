"""
gemini.py — Google Gemini adapters for the LLM and embedding interfaces.

Model names come from ADVISORY_LLM_MODEL / ADVISORY_EMBED_MODEL. Calls are
blocking (the SDK is synchronous); async callers run them in a thread.
"""

from __future__ import annotations

import logging

from backend.advisory.config import env
from backend.advisory.providers import ChatTurn, ProviderError

log = logging.getLogger(__name__)

EMBED_BATCH = 50


def _call(fn):
    """Run fn(client) with the admin-managed key pool (rotates past exhausted keys)."""
    from backend.ai_keys import call_gemini

    return call_gemini(fn)


class GeminiEmbedder:
    name = "gemini"

    def __init__(self, model: str | None = None, dimensions: int = 768):
        self.model = model or env("ADVISORY_EMBED_MODEL", "gemini-embedding-001")
        self.dimensions = dimensions

    @property
    def model_id(self) -> str:
        return f"{self.model}@{self.dimensions}"

    def embed(self, texts: list[str], *, task: str) -> list[list[float]]:
        from google.genai import types

        task_type = "RETRIEVAL_QUERY" if task == "query" else "RETRIEVAL_DOCUMENT"
        out: list[list[float]] = []
        for i in range(0, len(texts), EMBED_BATCH):
            batch = texts[i:i + EMBED_BATCH]
            resp = _call(lambda client, batch=batch: client.models.embed_content(
                model=self.model, contents=batch,
                config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=self.dimensions),
            ))
            out.extend(list(e.values) for e in resp.embeddings)
        return out


class GeminiLLM:
    name = "gemini"

    def __init__(self, model: str | None = None):
        self.model = model or env("ADVISORY_LLM_MODEL", "gemini-3.6-flash")

    def generate(self, system: str, turns: list[ChatTurn], *, temperature: float = 0.2,
                 response_json: bool = False) -> str:
        from google.genai import types

        contents = [
            types.Content(role="model" if t.role == "assistant" else "user", parts=[types.Part(text=t.content)])
            for t in turns
        ]
        config = types.GenerateContentConfig(
            system_instruction=system, temperature=temperature,
            response_mime_type="application/json" if response_json else None,
        )
        resp = _call(lambda client: client.models.generate_content(model=self.model, contents=contents, config=config))
        text = (resp.text or "").strip()
        if not text:
            raise ProviderError("Gemini returned an empty answer.")
        return text
