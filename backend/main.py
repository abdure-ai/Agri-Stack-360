"""
main.py — FastAPI application entry point for the NMIS Agri-Platform API.

Run from the NMIS project root:
    uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import meta, prices, chat
from backend.routers.auth_router import router as auth_router
from backend.routers.users import router as users_router
from backend.routers.crop_health import router as crop_health_router
from backend.routers.suppliers import router as suppliers_router
from backend.routers.financial import router as financial_router
from backend.routers.admin import router as admin_router
from backend.routers.geo import router as geo_router
from backend.routers.knowledge_admin import router as knowledge_router
from backend.routers.advisory import router as advisory_router
from backend.routers.ai_keys_admin import router as ai_keys_router
from backend.routers.da import router as da_router
from backend.routers.advisory_admin import router as advisory_admin_router
from backend.routers.reports import router as reports_router
from backend.routers.input_trust import router as input_trust_router
from backend.routers import review as review_routes
from backend.routers.dealer import router as dealer_router
from backend.routers import abc as abc_routes
from backend.routers import estate as estate_routes
from backend.routers.regulator import router as regulator_router
from backend.routers import ngo as ngo_routes
from backend.routers import credit as credit_routes
from backend.routers.beckn import router as beckn_router
from backend.routers.tips import router as tips_router
from backend.routers.livestock import router as livestock_router
from backend.routers.maps import router as maps_router
from backend.routers.abc_company import router as abc_company_router
from backend import ai_keys
from backend import admin_areas, audit, erasure, input_trust, platform_db, tips, training_data
from backend.advisory.schema import ensure_schema
from backend.platform_db import get_platform_connection

# Address and advisory tables (idempotent; adds missing tables/columns only).
admin_areas.ensure_schema(get_platform_connection())
ai_keys.ensure_schema(get_platform_connection())
ensure_schema(get_platform_connection())
audit.ensure_schema(get_platform_connection())
erasure.ensure_schema(get_platform_connection())
review_routes.ensure_schema(get_platform_connection())
abc_routes.ensure_schema(get_platform_connection())
from backend import abc_company  # noqa: E402
abc_company.ensure_schema(get_platform_connection())
estate_routes.ensure_schema(get_platform_connection())
ngo_routes.ensure_schema(get_platform_connection())
credit_routes.ensure_schema(get_platform_connection())
training_data.ensure_schema(get_platform_connection())
tips.ensure_schema(get_platform_connection())
input_trust.ensure_schema(get_platform_connection())

app = FastAPI(
    title="NMIS Agri-Platform API",
    description=(
        "Agricultural intelligence platform for Ethiopian farmers, extension agents, and traders. "
        "Market prices, crop health diagnosis, input intelligence, financial profiling, and RBAC."
    ),
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    # Phones and other computers on the same private network (e.g. http://192.168.1.6:5173).
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-TTS-Engine", "X-TTS-Cached"],
)

# Change requests under /api/admin, /api/advisory/admin and /api/da go to the audit log.
# The factory looks the connection up on each request (tests swap it).
app.add_middleware(audit.AuditMiddleware, conn_factory=lambda: platform_db.get_platform_connection())

# Existing routers
app.include_router(meta.router,   prefix="/api")
app.include_router(prices.router, prefix="/api")
app.include_router(chat.router,   prefix="/api")

# New platform routers
app.include_router(auth_router,        prefix="/api")
app.include_router(users_router,       prefix="/api")
app.include_router(crop_health_router, prefix="/api")
app.include_router(suppliers_router,   prefix="/api")
app.include_router(financial_router,   prefix="/api")
app.include_router(admin_router,       prefix="/api")
app.include_router(geo_router,         prefix="/api")
app.include_router(knowledge_router,   prefix="/api")
app.include_router(ai_keys_router,     prefix="/api")
app.include_router(advisory_router,    prefix="/api")
app.include_router(da_router,          prefix="/api")
app.include_router(advisory_admin_router, prefix="/api")
app.include_router(reports_router,     prefix="/api")
app.include_router(input_trust_router, prefix="/api")
app.include_router(review_routes.router, prefix="/api")
app.include_router(dealer_router,      prefix="/api")
app.include_router(abc_routes.router, prefix="/api")
app.include_router(estate_routes.router, prefix="/api")
app.include_router(regulator_router,   prefix="/api")
app.include_router(ngo_routes.router, prefix="/api")
app.include_router(credit_routes.router, prefix="/api")
app.include_router(tips_router,        prefix="/api")
app.include_router(livestock_router,   prefix="/api")
app.include_router(maps_router,        prefix="/api")
app.include_router(abc_company_router, prefix="/api")
app.include_router(beckn_router,       prefix="/api")   # signed network requests, off unless BECKN_ENABLED=1


@app.on_event("startup")
def _warm_market_metadata():
    """The crop/market lists take ~10 s to build from the price table; do it before the first request."""
    import threading

    def warm():
        try:
            from backend.routers.meta import _get_meta

            _get_meta()
        except Exception:
            pass

    threading.Thread(target=warm, name="warm-meta", daemon=True).start()


@app.on_event("startup")
def _start_advisory_alerts():
    """Hourly alert cycle (outbreaks, due follow-ups) on its own database connection."""
    import sqlite3

    from backend.advisory.alerts import AlertScheduler
    from backend.platform_db import DB_PATH

    def connect():
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    from backend.advisory import registry

    app.state.alert_scheduler = AlertScheduler(connect, interval_seconds=3600, weather_factory=registry.weather)
    app.state.alert_scheduler.start()
    # Daily tips: tomorrow's drafts every morning, for an agronomist/admin to approve (backend/tips.py).
    app.state.tip_scheduler = tips.TipScheduler(connect, registry.llm, registry.embedder)
    app.state.tip_scheduler.start()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "NMIS Agri-Platform API v2.0"}
