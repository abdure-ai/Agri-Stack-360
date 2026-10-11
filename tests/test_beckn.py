"""OpenAgriNet / Beckn provider (M18): signed search -> ACK -> signed on_search with the catalogue, against a fake gateway."""

import json
import time

import pytest
from fastapi.testclient import TestClient

from backend import beckn
from backend.routers import beckn as beckn_routes

DOMAIN = "test:agri-advisory"


@pytest.fixture
def network(monkeypatch):
    ours_private, ours_public = beckn.new_key_pair()
    gw_private, gw_public = beckn.new_key_pair()
    monkeypatch.setenv("BECKN_ENABLED", "1")
    monkeypatch.setenv("BECKN_SUBSCRIBER_ID", "bpp.test")
    monkeypatch.setenv("BECKN_SUBSCRIBER_URL", "https://bpp.test/api/beckn")
    monkeypatch.setenv("BECKN_UNIQUE_KEY_ID", "k1")
    monkeypatch.setenv("BECKN_SIGNING_PRIVATE_KEY", ours_private)
    monkeypatch.setenv("BECKN_TRUSTED_KEYS", json.dumps({"gateway.test|g1": gw_public}))
    monkeypatch.setenv("BECKN_DOMAIN", DOMAIN)
    sent = []
    monkeypatch.setattr(beckn_routes, "send_callback", lambda url, body, auth: sent.append((url, body, auth)))
    from backend.main import app

    return {"client": TestClient(app), "sent": sent, "gw_private": gw_private, "ours_public": ours_public}


def _search(net, intent=None, *, domain=DOMAIN, signer=None, body=None):
    payload = body if body is not None else {
        "context": {"domain": domain, "action": "search", "version": "1.1.0", "bap_id": "bap.test",
                    "bap_uri": "https://bap.test/beckn/", "transaction_id": "t-1", "message_id": "m-1",
                    "timestamp": "2026-10-10T10:00:00.000Z"},
        "message": {"intent": intent or {}},
    }
    raw = json.dumps(payload).encode()
    auth = beckn.sign(raw, subscriber_id="gateway.test", unique_key_id="g1", private_key_b64=signer or net["gw_private"])
    return net["client"].post("/api/beckn/search", content=raw,
                              headers={"Content-Type": "application/json", "Authorization": auth})


def test_signed_search_gets_ack_and_signed_catalogue(network):
    r = _search(network, {"descriptor": {"name": "rust"}})
    assert r.status_code == 200 and r.json() == {"message": {"ack": {"status": "ACK"}}}
    url, body, auth = network["sent"][0]
    assert url == "https://bap.test/beckn/on_search"
    # The BAP can check our signature with our registered public key.
    assert beckn.verify(auth, body, {"bpp.test|k1": network["ours_public"]}) == "bpp.test"
    reply = json.loads(body)
    assert reply["context"]["action"] == "on_search" and reply["context"]["transaction_id"] == "t-1"
    assert reply["context"]["bpp_id"] == "bpp.test"
    items = reply["message"]["catalog"]["providers"][0]["items"]
    assert [i["id"] for i in items] == ["photo-check"]          # filtered by the intent
    assert "price" not in json.dumps(reply)                      # no prices published


def test_empty_intent_lists_everything(network):
    _search(network)
    items = json.loads(network["sent"][0][1])["message"]["catalog"]["providers"][0]["items"]
    assert {i["id"] for i in items} == {"advisory-qa", "photo-check", "crop-calendar", "outbreak-alerts", "input-check"}


def test_bad_or_missing_signatures_are_refused(network):
    stranger, _ = beckn.new_key_pair()
    assert _search(network, signer=stranger).status_code == 401
    assert network["client"].post("/api/beckn/search", json={"context": {}}).status_code == 401
    raw = json.dumps({"context": {"domain": DOMAIN, "action": "search", "bap_uri": "https://x"}}).encode()
    auth = beckn.sign(raw, subscriber_id="gateway.test", unique_key_id="g1", private_key_b64=network["gw_private"])
    tampered = raw.replace(b"https://x", b"https://y")
    r = network["client"].post("/api/beckn/search", content=tampered, headers={"Authorization": auth})
    assert r.status_code == 401 and r.json()["message"]["ack"]["status"] == "NACK"
    assert network["sent"] == []


def test_expired_signature(network):
    raw = b'{"context":{}}'
    old = beckn.sign(raw, subscriber_id="gateway.test", unique_key_id="g1", private_key_b64=network["gw_private"],
                     now=int(time.time()) - 3600)
    with pytest.raises(beckn.SignatureError, match="expired"):
        beckn.verify(old, raw, {"gateway.test|g1": beckn.new_key_pair()[1]})


def test_wrong_domain_or_request_nacked(network):
    assert _search(network, domain="other:domain").status_code == 400
    assert _search(network, body={"context": {"domain": DOMAIN, "action": "search"}}).status_code == 400   # no bap_uri
    assert network["sent"] == []


def test_disabled_by_default(monkeypatch):
    monkeypatch.setenv("BECKN_ENABLED", "0")
    from backend.main import app

    assert TestClient(app).post("/api/beckn/search", json={}).status_code == 404
