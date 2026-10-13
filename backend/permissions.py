"""
permissions.py — Role-based access control: the single source of truth.

Every service (platform API, forecast API, data sync) checks access with the
permissions defined here, and the frontend receives the signed-in user's
permission list from /api/auth/me, so a rule only ever changes in this file.

Pure Python with no database or web imports, so any service can import it.

Roles
  farmer  — grows crops; manages own farms, health checks, inputs, credit
  agent   — extension agent; supports the farms in their own region
  trader  — buys and sells; market data, inputs, credit
  admin   — runs the platform; everything, including users and data sync
  government — woreda / regional bureau / ATI / MoA staff: read-only aggregated
           reports for their area, never individual farmers
  agronomist — content reviewer: answers forwarded questions, keeps the knowledge base,
           protocols, calendar and dose tables, labels images, approves translations
  lender  — bank / microfinance staff: asks farmers to share their credit profile; sees a
           farmer's report only after the farmer approves (30 days, can be withdrawn)
  ngo_staff — NGO / development project staff: projects, project areas, advisory messages, impact reports
  regulator — EAA staff: registered-product list (import), counterfeit map, code issuance (read-only)
  farm_manager — manager or agronomist of a commercial farm: blocks, scouting, alerts, exports
  ati_officer — ATI ABC programme officer: read-only portfolio of all ABCs (aggregates, no member identities)
  abc_manager — manager of a farmer agribusiness company (ABC): members who accepted, contributions,
           planning, member messages, buyer requests
  agro_dealer — staff of a retail input shop: shop profile, stock flags, checks at sale
  supplier — staff of an input supplier organisation: own catalogue, code batches
           and verification reports (Input Trust)
"""

from __future__ import annotations

from typing import Iterable, Mapping

ROLES: tuple[str, ...] = ("farmer", "agent", "agronomist", "trader", "government", "supplier", "agro_dealer",
                          "abc_manager", "farm_manager", "regulator", "ngo_staff", "lender", "ati_officer", "admin")

# Roles anyone may choose on the public sign-up form. Agents get access to
# other farmers' data in their region and admins to everything, so those
# roles are only granted by an admin (PUT /api/admin/users/{id}/role).
SELF_REGISTER_ROLES: tuple[str, ...] = ("farmer", "trader")


class P:
    """Permission names. Format: <area>:<action>[:<scope>]."""

    MARKET_READ = "market:read"                # prices, regions, forecasts
    ADVISORY_USE = "advisory:use"              # AI market advisor chat
    PROFILE_MANAGE = "profile:manage"          # own name, region, language

    FARMS_MANAGE_OWN = "farms:manage:own"      # add / edit / delete own farms
    FARMS_READ_REGION = "farms:read:region"    # see farms in own region
    FARMS_MANAGE_ALL = "farms:manage:all"      # see and edit every farm

    CROP_HEALTH_USE = "crop_health:use"        # diagnose, save and resolve reports
                                               # (on farms the user can access)
    INPUTS_READ = "inputs:read"                # input suppliers + AI comparison
    FINANCIAL_READ = "financial:read"          # credit score + loan products

    USERS_MANAGE = "users:manage"              # list users, change role / active
    PLATFORM_STATS = "platform:stats"          # admin dashboard numbers
    SYNC_MANAGE = "sync:manage"                # data sync service (port 8002)
    MODELS_RETRAIN = "models:retrain"          # forecast retraining (port 8001)
    KNOWLEDGE_MANAGE = "knowledge:manage"      # upload / archive advisory guideline documents
    CONTENT_REVIEW = "content:review"          # review queue, content tables, image labels, translations
    ADVISORY_ADMIN = "advisory:admin"          # advisory thresholds, alert engine, escalation review
    INPUTS_VERIFY = "inputs:verify"            # check a product code, report a suspected fake (Input Trust)
    SUPPLIER_MANAGE = "supplier:manage"        # own organisation: catalogue, code batches, verification reports
    ORGS_MANAGE = "orgs:manage"                # create organisations and add their users
    CREDIT_REQUEST = "credit:request"          # lender: ask a farmer for their credit profile; report after approval
    NGO_MANAGE = "ngo:manage"                  # NGO projects: areas, advisory messages, impact reports (aggregated)
    REGISTRY_MANAGE = "registry:manage"        # regulator: product registry import, counterfeit map, code issuance
    ESTATE_MANAGE = "estate:manage"            # own commercial farm: blocks, scouting, disease alerts, exports
    ABC_MANAGE = "abc:manage"                  # own ABC: members, contributions, planning, messages, buyer requests
    TRADE_REQUEST = "trade:request"            # post buy requests to ABCs and read their answers
    DEALER_MANAGE = "dealer:manage"            # own agro-dealer shop: profile, products in stock, checks at sale
    REPORTS_READ = "reports:read"              # aggregated area reports (no individual farmers)
    AUDIT_READ = "audit:read"                  # read the audit log (admin actions, access to farmer data)
    ABC_PORTFOLIO = "abc:portfolio"            # read-only ABC portfolio (ATI: all ABCs; government: own area)
    DA_WORK = "da:work"                        # DA Copilot: my farmers, visit list, escalation inbox,
                                               # verify diagnoses, register farmers (with consent)


ALL_PERMISSIONS: frozenset[str] = frozenset(
    v for k, v in vars(P).items() if not k.startswith("_") and isinstance(v, str)
)

# Plain-language text for the admin Roles and Permissions screens.
ROLE_DESCRIPTIONS: Mapping[str, str] = {
    "farmer": "Grows crops. Manages their own farms, checks crop health, compares input suppliers and sees loan options.",
    "agent": "Supports farmers in their own region who agreed to share their data: visit list, escalated questions, crop health checks.",
    "trader": "Buys and sells produce. Follows market prices, compares input suppliers and sees loan options.",
    "agronomist": "Content reviewer. Answers questions forwarded by DAs, keeps the knowledge base, protocols, crop calendar and dose tables, labels photos for retraining and approves translations.",
    "supplier": "Staff of an input supplier. Manages their organisation's products and code batches and sees where their codes are checked.",
    "ngo_staff": "NGO or development project staff. Runs projects in chosen woredas: advisory messages to farmers there and aggregated impact reports.",
    "lender": "Bank or microfinance staff. Asks farmers to share their credit profile and sees a farmer's report only after the farmer approves in the app.",
    "regulator": "Regulator (EAA) staff. Imports the official registered-product list and sees counterfeit reports and code issuance nationwide.",
    "farm_manager": "Manager or agronomist of a commercial farm. Keeps the farm's blocks, scouting records and harvest plan.",
    "abc_manager": "Manager of a farmer agribusiness company (ABC). Works with members who accepted: contributions, crop planning, messages and buyer requests.",
    "agro_dealer": "Staff of a retail input shop. Keeps the shop profile and products in stock, and checks product codes at sale.",
    "ati_officer": "ATI ABC programme officer. Sees every ABC's formation status, members, capital, machinery use and compliance alerts, never individual members.",
    "government": "Woreda, regional bureau, ATI or MoA staff. Sees aggregated reports and outbreak maps for their area, never individual farmers.",
    "admin": "Runs the platform. Has every permission, including managing users, roles and data sync.",
}

# (area, label, description) per permission, in display order.
PERMISSION_INFO: Mapping[str, tuple[str, str, str]] = {
    P.MARKET_READ: ("Market & advice", "See market prices and forecasts",
                    "Weekly prices, regional comparisons, market heatmap and price forecasts."),
    P.ADVISORY_USE: ("Market & advice", "Use the AI market advisor",
                     "Ask the AI advisor questions about prices, selling and farming."),
    P.PROFILE_MANAGE: ("Market & advice", "Edit own profile",
                       "Change own name, zone, woreda and language."),
    P.FARMS_MANAGE_OWN: ("Farms & crop health", "Add and edit own farms",
                         "Create, edit and delete the farms they own."),
    P.FARMS_READ_REGION: ("Farms & crop health", "See farms in own region",
                          "View every farm whose owner is in the same region. Their region is set by an admin."),
    P.FARMS_MANAGE_ALL: ("Farms & crop health", "See and edit every farm",
                         "View and change any farm on the platform."),
    P.CROP_HEALTH_USE: ("Farms & crop health", "Run crop health checks",
                        "Diagnose problems, save health reports and mark them solved, on farms they can see."),
    P.INPUTS_READ: ("Inputs & finance", "Browse input suppliers",
                    "Find seed, fertilizer and chemical suppliers and compare them with AI."),
    P.FINANCIAL_READ: ("Inputs & finance", "See credit score and loans",
                       "View their farm credit score and matching loan products."),
    P.USERS_MANAGE: ("Administration", "Manage users and roles",
                     "List users, change roles and regions, and switch accounts on or off."),
    P.PLATFORM_STATS: ("Administration", "See platform statistics",
                       "View totals for users, farms and health reports."),
    P.SYNC_MANAGE: ("Administration", "Run data sync",
                    "Download new prices from nmis.et, set the daily schedule and view sync history."),
    P.MODELS_RETRAIN: ("Administration", "Retrain forecast models",
                       "Start retraining of the price forecast models."),
    P.KNOWLEDGE_MANAGE: ("Administration", "Manage advisory knowledge base",
                         "Upload, tag, archive and re-index the guideline documents the AI advisor answers from."),
    P.CONTENT_REVIEW: ("Administration", "Review advisory content",
                       "Answer forwarded questions, edit protocol / calendar / dose tables, label photos, approve translations."),
    P.ADVISORY_ADMIN: ("Administration", "Administer the AI advisory",
                       "Change advisory thresholds, run the alert engine and review escalations."),
    P.INPUTS_VERIFY: ("Inputs & finance", "Check a product code",
                      "Check whether a seed, fertilizer or chemical pack is genuine, and report a suspected fake."),
    P.SUPPLIER_MANAGE: ("Inputs & finance", "Manage own supplier organisation",
                        "List products, create code batches and labels, recall batches and see verification reports."),
    P.NGO_MANAGE: ("Market & advice", "Run NGO projects",
                   "Create projects, choose their woredas, send advisory messages there and see aggregated impact."),
    P.CREDIT_REQUEST: ("Inputs & finance", "Request farmer credit profiles",
                       "Ask a farmer to share their credit profile, and read the report while the farmer's approval lasts."),
    P.REGISTRY_MANAGE: ("Inputs & finance", "Regulate registered products",
                        "Import the official product list, see the national counterfeit map and supplier code issuance."),
    P.ESTATE_MANAGE: ("Farms & crop health", "Manage own commercial farm",
                      "Add blocks, record scouting, see disease alerts near the blocks, export the harvest plan."),
    P.ABC_MANAGE: ("Farms & crop health", "Manage own ABC",
                   "Invite farmers, record contributions, plan inputs and harvests, message members, answer buyers."),
    P.TRADE_REQUEST: ("Market & advice", "Post buy requests",
                      "Ask ABCs for a crop and quantity, and read their answers."),
    P.DEALER_MANAGE: ("Inputs & finance", "Manage own shop",
                      "Keep the shop profile and products in stock, and check product codes when selling."),
    P.ORGS_MANAGE: ("Administration", "Manage organisations",
                    "Create supplier organisations, add their users and suspend them."),
    P.REPORTS_READ: ("Market & advice", "See area reports",
                     "Aggregated figures for their area: farmers reached, photo checks by disease, outbreaks, alerts. Small numbers are hidden."),
    P.AUDIT_READ: ("Administration", "Read the audit log",
                   "See who changed what in administration, and who opened farmers' data."),
    P.ABC_PORTFOLIO: ("Market & advice", "See the ABC portfolio",
                      "ABCs in their area (ATI: all): status, members, capital, machinery and compliance alerts, without member names."),
    P.DA_WORK: ("Farms & crop health", "Work as a Development Agent",
                "See my farmers and visit list, answer escalated questions, verify diagnoses and register farmers."),
}

_EVERYONE = {P.MARKET_READ, P.ADVISORY_USE, P.PROFILE_MANAGE}

ROLE_PERMISSIONS: Mapping[str, frozenset[str]] = {
    "farmer": frozenset(_EVERYONE | {
        P.FARMS_MANAGE_OWN,
        P.CROP_HEALTH_USE,
        P.INPUTS_READ,
        P.INPUTS_VERIFY,
        P.FINANCIAL_READ,
    }),
    "agent": frozenset(_EVERYONE | {
        P.FARMS_READ_REGION,
        P.CROP_HEALTH_USE,
        P.DA_WORK,
        P.REPORTS_READ,
        P.INPUTS_VERIFY,
    }),
    "trader": frozenset(_EVERYONE | {
        P.INPUTS_READ,
        P.INPUTS_VERIFY,
        P.FINANCIAL_READ,
        P.TRADE_REQUEST,
    }),
    # Read-only: market data and aggregated reports. No advisor (it answers about one's own farm).
    "agronomist": frozenset(_EVERYONE | {P.KNOWLEDGE_MANAGE, P.CONTENT_REVIEW}),
    "government": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.REPORTS_READ, P.ABC_PORTFOLIO}),
    "ati_officer": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.REPORTS_READ, P.ABC_PORTFOLIO}),
    "supplier": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.SUPPLIER_MANAGE}),
    "agro_dealer": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.INPUTS_VERIFY, P.DEALER_MANAGE}),
    "abc_manager": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.ABC_MANAGE}),
    "farm_manager": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.ESTATE_MANAGE, P.INPUTS_VERIFY}),
    "regulator": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.REGISTRY_MANAGE}),
    "ngo_staff": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.NGO_MANAGE}),
    "lender": frozenset({P.MARKET_READ, P.PROFILE_MANAGE, P.CREDIT_REQUEST}),
    "admin": ALL_PERMISSIONS,
}


def permissions_for(role: str | None) -> frozenset[str]:
    """Permissions granted to a role; unknown roles get none."""
    return ROLE_PERMISSIONS.get(role or "", frozenset())


def has_permission(role: str | None, *perms: str) -> bool:
    """True when the role holds at least one of `perms`."""
    granted = permissions_for(role)
    return any(p in granted for p in perms)


def sorted_permissions(role: str | None) -> list[str]:
    """Stable list for API responses."""
    return sorted(permissions_for(role))


# ── Record-level rules ─────────────────────────────────────────────────────────
# Role permissions say *what* a user may do; these say *which records*.

def can_read_farm(user: Mapping, farm: Mapping, owner_region: str | None) -> bool:
    """Owner, an agent in the farm owner's region, or an admin."""
    role = user.get("role")
    if has_permission(role, P.FARMS_MANAGE_ALL):
        return True
    if farm.get("user_id") == user.get("id"):
        return True
    return (
        has_permission(role, P.FARMS_READ_REGION)
        and bool(user.get("region"))
        and owner_region == user.get("region")
    )


def can_edit_farm(user: Mapping, farm: Mapping) -> bool:
    """Owners with farms:manage:own, or admins. Agents advise; they do not edit."""
    role = user.get("role")
    if has_permission(role, P.FARMS_MANAGE_ALL):
        return True
    return farm.get("user_id") == user.get("id") and has_permission(role, P.FARMS_MANAGE_OWN)


def validate_roles(roles: Iterable[str]) -> None:
    """Fail fast if the role / permission tables drift apart (checked at import)."""
    missing = set(roles) ^ set(ROLE_PERMISSIONS)
    if missing:
        raise RuntimeError(f"Role/permission table out of sync: {sorted(missing)}")
    undescribed = (set(roles) ^ set(ROLE_DESCRIPTIONS)) | (ALL_PERMISSIONS ^ set(PERMISSION_INFO))
    if undescribed:
        raise RuntimeError(f"Missing or extra descriptions: {sorted(undescribed)}")


validate_roles(ROLES)
