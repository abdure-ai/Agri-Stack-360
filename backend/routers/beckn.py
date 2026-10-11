"""
routers/beckn.py — OpenAgriNet / Beckn provider endpoint (see backend/beckn.py).

  POST /api/beckn/search   called by a gateway or BAP; answered at once with ACK (or NACK), then the
                           catalogue is sent asynchronously to {bap_uri}/on_search, signed with our key.

Not behind sign-in: network participants authenticate with the Beckn signature instead (verified
against BECKN_TRUSTED_KEYS). Off unless BECKN_ENABLED=1.
"""

from __future__ import annotations

import json
import logging

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse

from backend import beckn

router = APIRouter(tags=["beckn"])
log = logging.getLogger(__name__)


def _nack(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse({"message": {"ack": {"status": "NACK"}}, "error": {"code": code, "message": message}},
                        status_code=status)


def send_callback(url: str, body: bytes, authorization: str) -> None:
    """POST a signed callback; failures are logged (the network retries on its side)."""
    try:
        r = httpx.post(url, content=body, headers={"Content-Type": "application/json", "Authorization": authorization},
                       timeout=10)
        if r.status_code >= 400:
            log.warning("Beckn callback %s answered %s", url, r.status_code)
    except httpx.HTTPError as e:
        log.warning("Beckn callback %s failed: %s", url, e.__class__.__name__)


def _reply(request_body: dict, cfg: beckn.Config) -> None:
    bap_uri = (request_body.get("context") or {}).get("bap_uri", "").rstrip("/")
    body = json.dumps(beckn.on_search(request_body, cfg), separators=(",", ":")).encode()
    auth = beckn.sign(body, subscriber_id=cfg.subscriber_id, unique_key_id=cfg.unique_key_id,
                      private_key_b64=cfg.private_key_b64 or "")
    send_callback(f"{bap_uri}/on_search", body, auth)


@router.post("/beckn/search")
async def search(request: Request, background: BackgroundTasks):
    cfg = beckn.Config.load()
    if not cfg.enabled:
        raise HTTPException(404, "Not Found")
    raw = await request.body()
    try:
        beckn.verify(request.headers.get("authorization"), raw, cfg.trusted_keys)
    except beckn.SignatureError as e:
        return _nack(401, "10001", str(e))
    try:
        body = json.loads(raw)
        ctx = body["context"]
        bap_uri = ctx["bap_uri"]
    except (ValueError, KeyError, TypeError):
        return _nack(400, "10000", "Invalid search request: context with bap_uri is required")
    if not str(bap_uri).startswith(("https://", "http://")):
        return _nack(400, "10000", "bap_uri must be an http(s) URL")
    if ctx.get("action") != "search":
        return _nack(400, "10000", "context.action must be 'search'")
    if ctx.get("domain") != cfg.domain:
        return _nack(400, "10000", f"Unsupported domain; this provider serves {cfg.domain}")
    if not cfg.private_key_b64:
        return _nack(503, "20000", "Provider signing key is not configured")
    background.add_task(_reply, body, cfg)
    return {"message": {"ack": {"status": "ACK"}}}
