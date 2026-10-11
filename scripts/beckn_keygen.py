"""Make an ed25519 key pair for registering the platform on a Beckn / OpenAgriNet network.

Put the private key in .env as BECKN_SIGNING_PRIVATE_KEY (never in code or chat); give the
public key to the network registry together with BECKN_SUBSCRIBER_ID and BECKN_UNIQUE_KEY_ID.

    .venv/Scripts/python.exe scripts/beckn_keygen.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.beckn import new_key_pair  # noqa: E402

private, public = new_key_pair()
print("BECKN_SIGNING_PRIVATE_KEY=" + private)
print("public key (for the registry): " + public)
