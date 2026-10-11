"""
cache.py — Record-and-replay wrappers so the demo runs without network.

Online, every LLM answer and every query embedding is stored on disk.
Offline (ADVISORY_OFFLINE=1) or when the provider fails, the stored copy is
served. LLM replies are looked up by the exact prompt first, then by
(question, farmer, language) so a rehearsal recorded yesterday still replays
today even though weather and crop age in the context have moved on.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from backend.advisory.config import ROOT, offline
from backend.advisory.providers import ChatTurn, ProviderError

CACHE_ROOT = ROOT / "data" / "cache"


def _h(*parts: str) -> str:
    return hashlib.sha256("␞".join(parts).encode("utf-8")).hexdigest()[:32]


class RecordingLLM:
    def __init__(self, inner, store: Path = CACHE_ROOT / "llm"):
        self.inner = inner
        self.store = store
        self.name = f"{getattr(inner, 'name', 'llm')}+replay"

    def generate(self, system: str, turns: list[ChatTurn], *, temperature: float = 0.2, response_json: bool = False,
                 replay_key: str | None = None) -> str:
        exact = self.store / f"{_h(system, *(f'{t.role}:{t.content}' for t in turns))}.json"
        loose = self.store / f"q_{_h(replay_key)}.json" if replay_key else None
        live_error = None
        if not offline() and self.inner is not None:
            try:
                text = self.inner.generate(system, turns, temperature=temperature, response_json=response_json)
                self.store.mkdir(parents=True, exist_ok=True)
                for path in filter(None, (exact, loose)):
                    path.write_text(json.dumps({"text": text}, ensure_ascii=False), encoding="utf-8")
                return text
            except ProviderError as e:
                live_error = e      # fall back to a recorded answer if there is one
        for path in filter(None, (exact, loose)):
            if path.exists():
                return json.loads(path.read_text(encoding="utf-8"))["text"]
        if live_error is not None:
            raise ProviderError(f"{live_error} (no recorded answer to fall back on)") from live_error
        raise ProviderError("Offline mode and this question has no recorded answer.")


class CachingEmbedder:
    def __init__(self, inner, store: Path = CACHE_ROOT / "embeddings"):
        self.inner = inner
        self.store = store
        self.name = inner.name
        self.dimensions = inner.dimensions
        self.model_id = getattr(inner, "model_id", inner.name)

    def embed(self, texts: list[str], *, task: str) -> list[list[float]]:
        if task != "query":            # documents are stored in the knowledge base already
            return self.inner.embed(texts, task=task)
        out: list[list[float] | None] = []
        missing = []
        for i, text in enumerate(texts):
            path = self.store / f"{_h(self.model_id, task, text)}.json"
            if path.exists():
                out.append(json.loads(path.read_text(encoding="utf-8")))
            else:
                out.append(None)
                missing.append(i)
        if missing:
            if offline():
                raise ProviderError("Offline: no stored embedding for this question.")
            vecs = self.inner.embed([texts[i] for i in missing], task=task)
            self.store.mkdir(parents=True, exist_ok=True)
            for i, v in zip(missing, vecs):
                (self.store / f"{_h(self.model_id, task, texts[i])}.json").write_text(json.dumps(v), encoding="utf-8")
                out[i] = v
        return out  # type: ignore[return-value]
