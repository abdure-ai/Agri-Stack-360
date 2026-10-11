"""
beckn.py — OpenAgriNet / Beckn provider (BPP) side: request signing and the advisory catalogue.

Beckn networks sign every request: an ed25519 signature over a BLAKE2b-512 digest of the body,
carried in the Authorization header (Beckn "Signing Beckn APIs in HTTP" spec):

    Signature keyId="{subscriber_id}|{unique_key_id}|ed25519",algorithm="ed25519",
              created="{unix}",expires="{unix}",headers="(created) (expires) digest",signature="{base64}"

Configuration (.env; all PLACEHOLDER until the platform is registered on the network):
    BECKN_ENABLED               "1" to accept requests (off by default: the routes answer 404)
    BECKN_SUBSCRIBER_ID         our BPP id on the registry
    BECKN_SUBSCRIBER_URL        our public BPP URL
    BECKN_UNIQUE_KEY_ID         id of our signing key on the registry
    BECKN_SIGNING_PRIVATE_KEY   base64 ed25519 private key (32-byte seed); never in code or git
    BECKN_TRUSTED_KEYS          JSON {"subscriber_id|unique_key_id": "base64 public key"} for gateways and
                                BAPs we accept. A registry lookup replaces this once the network is chosen.
    BECKN_DOMAIN                network domain code (PLACEHOLDER_VERIFY with OpenAgriNet)
    BECKN_CORE_VERSION          default 1.1.0

The catalogue lists what the platform offers (advisory, photo check, calendar, alerts, product check)
with no farmer data and no prices.
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
import time
from dataclasses import dataclass

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from backend.advisory.config import env

SIGNATURE_TTL_S = 300
DEFAULT_DOMAIN = "PLACEHOLDER_VERIFY:agri-advisory"


class SignatureError(Exception):
    """The request's Authorization header is missing, malformed, untrusted, expired or wrong."""


@dataclass(frozen=True)
class Config:
    enabled: bool
    subscriber_id: str
    subscriber_url: str
    unique_key_id: str
    private_key_b64: str | None
    trusted_keys: dict[str, str]
    domain: str
    core_version: str

    @classmethod
    def load(cls) -> "Config":
        raw = env("BECKN_TRUSTED_KEYS")
        return cls(
            enabled=env("BECKN_ENABLED", "0") == "1",
            subscriber_id=env("BECKN_SUBSCRIBER_ID", "PLACEHOLDER_VERIFY.agristack360.bpp"),
            subscriber_url=env("BECKN_SUBSCRIBER_URL", "http://localhost:8000/api/beckn"),
            unique_key_id=env("BECKN_UNIQUE_KEY_ID", "PLACEHOLDER_VERIFY_KEY_ID"),
            private_key_b64=env("BECKN_SIGNING_PRIVATE_KEY"),
            trusted_keys=json.loads(raw) if raw else {},
            domain=env("BECKN_DOMAIN", DEFAULT_DOMAIN),
            core_version=env("BECKN_CORE_VERSION", "1.1.0"),
        )


def digest(body: bytes) -> str:
    return base64.b64encode(hashlib.blake2b(body, digest_size=64).digest()).decode()


def _signing_string(created: int, expires: int, body: bytes) -> bytes:
    return f"(created): {created}\n(expires): {expires}\ndigest: BLAKE-512={digest(body)}".encode()


def sign(body: bytes, *, subscriber_id: str, unique_key_id: str, private_key_b64: str,
         now: int | None = None, ttl_s: int = SIGNATURE_TTL_S) -> str:
    """Authorization header value for an outgoing request."""
    created = int(now if now is not None else time.time())
    expires = created + ttl_s
    key = Ed25519PrivateKey.from_private_bytes(base64.b64decode(private_key_b64))
    sig = base64.b64encode(key.sign(_signing_string(created, expires, body))).decode()
    return (f'Signature keyId="{subscriber_id}|{unique_key_id}|ed25519",algorithm="ed25519",'
            f'created="{created}",expires="{expires}",headers="(created) (expires) digest",signature="{sig}"')


_PARAM = re.compile(r'(\w+)="([^"]*)"')


def verify(header: str | None, body: bytes, trusted_keys: dict[str, str], now: int | None = None) -> str:
    """Check an incoming Authorization header. Returns the sender's subscriber id."""
    if not header or not header.startswith("Signature "):
        raise SignatureError("Missing Beckn signature")
    params = dict(_PARAM.findall(header))
    try:
        subscriber_id, unique_key_id, algorithm = params["keyId"].split("|")
        created, expires = int(params["created"]), int(params["expires"])
        signature = base64.b64decode(params["signature"])
    except (KeyError, ValueError) as e:
        raise SignatureError("Malformed Beckn signature") from e
    if algorithm != "ed25519" or params.get("algorithm", "ed25519") != "ed25519":
        raise SignatureError("Unsupported signature algorithm")
    current = int(now if now is not None else time.time())
    if not (created - 30 <= current <= expires):          # 30 s clock skew allowed
        raise SignatureError("Signature expired or not yet valid")
    public = trusted_keys.get(f"{subscriber_id}|{unique_key_id}")
    if not public:
        raise SignatureError("Unknown signing key")
    try:
        Ed25519PublicKey.from_public_bytes(base64.b64decode(public)).verify(signature, _signing_string(created, expires, body))
    except (InvalidSignature, ValueError) as e:
        raise SignatureError("Signature does not match") from e
    return subscriber_id


def new_key_pair() -> tuple[str, str]:
    """(private seed, public key), both base64 — for registering on a network (scripts, tests)."""
    from cryptography.hazmat.primitives import serialization

    key = Ed25519PrivateKey.generate()
    private = key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
    public = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return base64.b64encode(private).decode(), base64.b64encode(public).decode()


# ── Catalogue ────────────────────────────────────────────────────────────────

LANGUAGES = ["en", "am", "om", "ti"]
FULFILLMENTS = [
    {"id": "app", "type": "DIGITAL", "tags": [{"descriptor": {"code": "channel"}, "list": [{"value": "web-app"}]}]},
    {"id": "telegram", "type": "DIGITAL", "tags": [{"descriptor": {"code": "channel"}, "list": [{"value": "telegram"}]}]},
]
ITEMS = [
    ("advisory-qa", "advisory", "Crop advisory questions",
     "Answers to farming questions with citations from Ministry of Agriculture guidelines; says when it does not know and passes the question to a Development Agent.",
     ["question", "advice", "advisory", "wheat", "crop"]),
    ("photo-check", "crop-health", "Photo crop-health check",
     "Wheat leaf photo check for rusts, powdery mildew and septoria, combined with local weather, with a treatment plan and follow-up.",
     ["photo", "disease", "diagnosis", "rust", "crop health"]),
    ("crop-calendar", "advisory", "Crop calendar",
     "Crop stage and the next tasks for a planted field, based on planting date and altitude.",
     ["calendar", "stage", "planting", "schedule"]),
    ("outbreak-alerts", "crop-health", "Disease outbreak alerts",
     "Alerts when a disease is confirmed on farms nearby, sent only to farmers who allowed alerts.",
     ["alert", "outbreak", "warning", "disease"]),
    ("input-check", "inputs", "Input authenticity check",
     "Check a seed, fertilizer or chemical pack code against the supplier's batch records.",
     ["input", "seed", "fertilizer", "counterfeit", "verify", "authenticity"]),
]
CATEGORIES = {"advisory": "Advisory", "crop-health": "Crop health", "inputs": "Inputs"}


def _intent_terms(intent: dict) -> list[str]:
    texts = []
    for path in (("descriptor", "name"), ("item", "descriptor", "name"), ("category", "descriptor", "name"),
                 ("category", "id")):
        v = intent
        for part in path:
            v = v.get(part) if isinstance(v, dict) else None
        if isinstance(v, str) and v.strip():
            texts.append(v.strip().lower())
    return texts


def catalog(intent: dict | None) -> dict:
    """The provider catalogue, filtered by the search intent (empty intent: everything)."""
    terms = _intent_terms(intent or {})

    def matches(item) -> bool:
        if not terms:
            return True
        haystack = " ".join([item[0], item[1], item[2].lower(), item[3].lower(), *item[4]]).lower()
        return any(t in haystack or t == item[1] for t in terms)

    items = [i for i in ITEMS if matches(i)]
    return {
        "descriptor": {"name": "Agri-Stack 360 (PLACEHOLDER_VERIFY)"},
        "providers": [{
            "id": "agristack360",
            "descriptor": {"name": "Agri-Stack 360 (PLACEHOLDER_VERIFY)",
                           "short_desc": "Digital crop advisory for Ethiopian farmers"},
            "categories": [{"id": c, "descriptor": {"name": n}} for c, n in CATEGORIES.items()
                           if any(i[1] == c for i in items)],
            "fulfillments": FULFILLMENTS,
            "items": [{
                "id": iid, "category_ids": [cat], "fulfillment_ids": ["app", "telegram"],
                "descriptor": {"name": name, "short_desc": desc.split(";")[0].split(",")[0], "long_desc": desc},
                "tags": [{"descriptor": {"code": "languages"}, "list": [{"value": ",".join(LANGUAGES)}]}],
            } for iid, cat, name, desc, _ in items],
        }],
    }


def on_search(request: dict, cfg: Config, now: float | None = None) -> dict:
    """The on_search callback body for a search request."""
    ctx = dict(request.get("context") or {})
    ctx.update({
        "action": "on_search", "bpp_id": cfg.subscriber_id, "bpp_uri": cfg.subscriber_url,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now if now is not None else time.time())),
    })
    intent = ((request.get("message") or {}).get("intent")) or {}
    return {"context": ctx, "message": {"catalog": catalog(intent)}}
