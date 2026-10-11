"""Role-based access control: every API route is checked on the server (checklist cross-cutting rule).

- Every route needs a signed-in user (get_current_user, directly or via require_permission),
  except an explicit public allow-list. A new route without a check fails this test.
- The role / permission matrix in backend/permissions.py matches what each role should do.
"""

import asyncio

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute

from backend.auth import get_current_user, require_permission
from backend.main import app
from backend.permissions import (ALL_PERMISSIONS, ROLE_PERMISSIONS, ROLES, SELF_REGISTER_ROLES, P,
                                 has_permission, permissions_for)

# Public on purpose: sign-in, sign-up, health, official boundaries and the public market prices.
PUBLIC = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/register"), ("POST", "/api/auth/login"), ("POST", "/api/auth/refresh"),
    ("GET", "/api/geo/areas"), ("GET", "/api/geo/areas/{pcode}"), ("GET", "/api/geo/search"),
    ("GET", "/api/meta"), ("GET", "/api/varieties"), ("GET", "/api/markets"), ("GET", "/api/prices"),
    ("GET", "/api/summary"), ("GET", "/api/regional"), ("GET", "/api/spread"),
    ("POST", "/api/beckn/search"),   # authenticated by the Beckn signature, not sign-in (tests/test_beckn.py)
}


def _dependency_calls(dependant):
    out = [dependant.call]
    for d in dependant.dependencies:
        out += _dependency_calls(d)
    return out


def _routes():
    for r in app.routes:
        if isinstance(r, APIRoute):
            for method in r.methods:
                yield method, r.path, _dependency_calls(r.dependant)


def test_every_route_requires_sign_in_unless_public():
    unprotected = {(m, p) for m, p, calls in _routes() if get_current_user not in calls}
    assert unprotected - PUBLIC == set(), "routes without a server-side access check"
    assert PUBLIC - unprotected == set(), "allow-list has routes that no longer exist or are now protected"


@pytest.mark.parametrize("prefix", ["/api/admin", "/api/advisory/admin", "/api/da", "/api/supplier", "/api/trust", "/api/review", "/api/dealer", "/api/abc", "/api/trade", "/api/estate", "/api/regulator", "/api/ngo", "/api/credit"])
def test_admin_areas_check_a_permission_not_just_sign_in(prefix):
    matched = [(m, p, calls) for m, p, calls in _routes() if p.startswith(prefix)]
    assert matched, f"no routes under {prefix}"
    for method, path, calls in matched:
        checks = [c for c in calls if getattr(c, "__qualname__", "").startswith("require_permission")]
        assert checks, f"{method} {path} only checks sign-in, not a permission"


# ── Role matrix ──────────────────────────────────────────────────────────────

def test_admin_has_everything_and_every_role_is_defined():
    assert set(ROLES) == set(ROLE_PERMISSIONS)
    assert permissions_for("admin") == ALL_PERMISSIONS
    assert permissions_for("nobody") == frozenset() and permissions_for(None) == frozenset()


@pytest.mark.parametrize("role,allowed,denied", [
    ("farmer", {P.FARMS_MANAGE_OWN, P.CROP_HEALTH_USE, P.ADVISORY_USE, P.FINANCIAL_READ, P.INPUTS_READ},
     {P.FARMS_READ_REGION, P.FARMS_MANAGE_ALL, P.USERS_MANAGE, P.KNOWLEDGE_MANAGE, P.ADVISORY_ADMIN}),
    ("agent", {P.FARMS_READ_REGION, P.CROP_HEALTH_USE, P.ADVISORY_USE},
     {P.FARMS_MANAGE_ALL, P.FINANCIAL_READ, P.USERS_MANAGE, P.KNOWLEDGE_MANAGE, P.ADVISORY_ADMIN}),
    ("trader", {P.MARKET_READ, P.INPUTS_READ, P.FINANCIAL_READ},
     {P.FARMS_MANAGE_OWN, P.CROP_HEALTH_USE, P.USERS_MANAGE, P.ADVISORY_ADMIN}),
])
def test_role_matrix(role, allowed, denied):
    assert all(has_permission(role, p) for p in allowed)
    assert not any(has_permission(role, p) for p in denied)


def test_privileged_roles_cannot_self_register():
    assert set(SELF_REGISTER_ROLES) == {"farmer", "trader"}


def test_require_permission_blocks_and_allows():
    check = require_permission(P.USERS_MANAGE)
    with pytest.raises(HTTPException) as e:
        asyncio.run(check(user={"id": 1, "role": "farmer"}))
    assert e.value.status_code == 403
    assert asyncio.run(check(user={"id": 2, "role": "admin"}))["id"] == 2


def test_unknown_permission_is_a_programming_error():
    with pytest.raises(ValueError):
        require_permission("does:not:exist")
