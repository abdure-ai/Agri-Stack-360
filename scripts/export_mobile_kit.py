"""
export_mobile_kit.py — Files for the Flutter developer, generated from the code so they never drift.

  docs/mobile/openapi-mobile.json   OpenAPI 3 contract of the endpoints the Farmer + DA app uses
                                    (generate a Dart client with openapi-generator, dart-dio)
  docs/mobile/l10n/app_<lang>.arb   the web app's texts in en/am/om/ti as Flutter ARB files;
                                    am/om/ti strings marked "draft – needs native review" in the web
                                    app carry "x-draft": true in their metadata

    .venv/Scripts/python.exe scripts/export_mobile_kit.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
OUT = ROOT / "docs" / "mobile"

MOBILE_PREFIXES = ("/api/auth", "/api/users", "/api/advisory", "/api/tips", "/api/trust", "/api/da",
                   "/api/financial", "/api/geo", "/api/prices", "/api/markets", "/api/summary", "/api/meta",
                   "/api/varieties", "/api/health", "/api/crop-health", "/api/livestock", "/api/map", "/api/abc/my")
EXCLUDE = ("/api/advisory/admin", "/api/advisory/farmers/{farmer_id}/context")


def export_openapi() -> int:
    from backend.main import app

    spec = app.openapi()
    spec["paths"] = {p: ops for p, ops in spec["paths"].items()
                     if p.startswith(MOBILE_PREFIXES) and not p.startswith(EXCLUDE)}
    spec["info"] = {"title": "Agri-Stack 360 mobile API (Farmer + DA)", "version": spec["info"].get("version", "2.0"),
                    "description": "Generated from the platform code by scripts/export_mobile_kit.py. "
                                   "Authentication: Authorization: Bearer <access_token> from POST /api/auth/login."}
    spec["components"]["securitySchemes"] = {"bearer": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}}
    spec["security"] = [{"bearer": []}]
    # Drop schemas no remaining path refers to.
    text = json.dumps(spec["paths"])
    used, frontier = set(), set(re.findall(r'#/components/schemas/([\w.-]+)', text))
    schemas = spec["components"].get("schemas", {})
    while frontier:
        name = frontier.pop()
        if name in used or name not in schemas:
            continue
        used.add(name)
        frontier |= set(re.findall(r'#/components/schemas/([\w.-]+)', json.dumps(schemas[name])))
    spec["components"]["schemas"] = {k: v for k, v in schemas.items() if k in used}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "openapi-mobile.json").write_text(json.dumps(spec, indent=2, ensure_ascii=False), encoding="utf-8")
    return len(spec["paths"])


_ENTRY = re.compile(r'^\s*"([^"]+)":\s*"((?:[^"\\]|\\.)*)",?\s*(//.*)?$')


def _dart_key(key: str) -> str:
    parts = re.split(r"[._\-]+", key)
    out = parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:])
    out = re.sub(r"\W", "", out)
    return out if out and not out[0].isdigit() else "k" + out


def _read_ts(lang: str) -> tuple[dict[str, str], set[str]]:
    text = (ROOT / "frontend" / "src" / "i18n" / f"{lang}.ts").read_text(encoding="utf-8")
    entries, drafts, in_draft = {}, set(), False
    for line in text.splitlines():
        if "draft" in line and line.strip().startswith("//"):
            in_draft = True
            continue
        if line.strip().startswith("// ──"):
            in_draft = "draft" in line
        m = _ENTRY.match(line)
        if m:
            key, value = m.group(1), json.loads(f'"{m.group(2)}"')
            entries[key] = value
            if in_draft or (m.group(3) and "draft" in m.group(3)):
                drafts.add(key)
    return entries, drafts


def export_arb() -> dict[str, int]:
    (OUT / "l10n").mkdir(parents=True, exist_ok=True)
    en, _ = _read_ts("en")
    names = {}
    for key in en:
        name = _dart_key(key)
        while name in names.values():
            name += "_"
        names[key] = name
    counts = {}
    for lang in ("en", "am", "om", "ti"):
        entries, drafts = (en, set()) if lang == "en" else _read_ts(lang)
        arb: dict = {"@@locale": lang}
        for key, name in names.items():
            value = entries.get(key)
            if value is None:
                continue
            arb[name] = value
            meta: dict = {"description": f"web key: {key}"}
            placeholders = re.findall(r"\{(\w+)\}", value)
            if placeholders:
                meta["placeholders"] = {p: {} for p in dict.fromkeys(placeholders)}
            if key in drafts:
                meta["x-draft"] = True
            arb[f"@{name}"] = meta
        (OUT / "l10n" / f"app_{lang}.arb").write_text(json.dumps(arb, indent=2, ensure_ascii=False), encoding="utf-8")
        counts[lang] = sum(1 for k in arb if not k.startswith("@"))
    return counts


if __name__ == "__main__":
    print(f"openapi-mobile.json: {export_openapi()} paths")
    print("ARB strings:", export_arb())
