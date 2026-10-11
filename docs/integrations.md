# External integrations: settings

Both integrations are **off by default**. Every value below is a placeholder until the partner
confirms it (PLACEHOLDER_VERIFY). Settings go in `.env`; keys never go in code, git or chat.

## OpenAgriNet / Beckn provider (`backend/beckn.py`, `backend/routers/beckn.py`)

The platform acts as a provider (BPP). A gateway or app (BAP) sends a signed `POST /api/beckn/search`.
The platform checks the signature, answers `ACK` at once, then sends its catalogue (advisory Q&A,
photo check, crop calendar, outbreak alerts, input check) to `{bap_uri}/on_search`, signed with its
own key. No farmer data and no prices are in the catalogue.

| Setting | Meaning |
|---|---|
| `BECKN_ENABLED=1` | Accept requests (otherwise the route answers 404) |
| `BECKN_SUBSCRIBER_ID` | Our provider id on the network registry |
| `BECKN_SUBSCRIBER_URL` | Our public URL, e.g. `https://<host>/api/beckn` (must be https on a real network) |
| `BECKN_UNIQUE_KEY_ID` | Id of our signing key on the registry |
| `BECKN_SIGNING_PRIVATE_KEY` | From `scripts/beckn_keygen.py`; the public key goes to the registry |
| `BECKN_TRUSTED_KEYS` | JSON `{"<subscriber_id>\|<key_id>": "<base64 public key>"}` of gateways/apps we accept. A registry lookup replaces this once the network is chosen |
| `BECKN_DOMAIN` | Network domain code (ask OpenAgriNet) |
| `BECKN_CORE_VERSION` | Default `1.1.0` |

Built and tested: `search` → `on_search` with ed25519 / BLAKE2b-512 signatures both ways
(`tests/test_beckn.py`, fake gateway). Not built yet: `select`/`init`/`confirm` (no orders: the
services are used in the app or Telegram), registry lookup, and network certification. These need
the network's sandbox.

## ATI Farmer Profile System (`ATIFarmerProfileSource`, `backend/advisory/adapters/platform.py`)

`ADVISORY_PROFILE_PROVIDER=ati` makes the advisory read farmer and land details from ATI. The
platform's own record stays the base; ATI fills in name, kebele/woreda/zone/region and the main
plot point. Consent and the assigned DA always come from this platform. Only the phone number is
sent to ATI to find the record.

| Setting | Meaning |
|---|---|
| `ATI_FARMER_PROFILE_URL` | Base URL; lookup is `GET {url}/farmers?phone=<phone>` (contract to confirm) |
| `ATI_FARMER_PROFILE_KEY` | Sent as `Authorization: Bearer <key>` |
| `ATI_FARMER_PROFILE_MAPPING` | JSON `{our field: "dotted.path"}`, e.g. `{"name": "full_name", "latitude": "main_plot.latitude"}` |
| `ATI_FARMER_PROFILE_STRICT=1` | Fail when ATI can't answer (default: use the platform record) |

Tested against a mock server (`tests/test_ati_profile.py`): mapping, not-found/ambiguous results,
outage fallback, strict mode.
