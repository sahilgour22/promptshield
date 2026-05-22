import asyncio
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from structlog.contextvars import bind_contextvars, clear_contextvars

from app.config import settings
from app.db import engine
from app.logging_config import configure_logging
from app.routers import dashboard as dashboard_router
from app.routers import inspect as inspect_router
from app.routers import ws as ws_router
from app.routers import metrics as metrics_router
from app.schemas import HealthResponse

configure_logging()

logger = structlog.get_logger()

_DESCRIPTION = """
PromptShield is a real-time security gateway for AI agents.

It intercepts every message, tool output, and API response flowing through your agent
and classifies it for prompt injection, jailbreak attempts, and data exfiltration.

**Detection categories**
- `direct_injection` — instructions that attempt to override the system prompt
- `jailbreak` — attempts to remove safety constraints or enter unrestricted modes
- `data_exfiltration` — commands to transmit sensitive data to external endpoints
- `indirect_injection` — instructions hidden in documents, emails, or tool outputs

**Verdicts**: `block` · `sanitize` · `log_only` · `allow`

**SDK**: `pip install promptshield` — wraps OpenAI, Anthropic, and LangChain agents transparently.
"""


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("startup", environment=settings.environment)
    async with engine.begin() as conn:
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    logger.info("database_connected")

    stats_task = asyncio.create_task(ws_router.stats_broadcast_loop())

    yield

    stats_task.cancel()
    try:
        await stats_task
    except asyncio.CancelledError:
        pass

    await engine.dispose()
    logger.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="PromptShield Gateway",
        version="0.1.0",
        description=_DESCRIPTION,
        contact={"name": "PromptShield Team", "email": "bagmoji18@gmail.com"},
        license_info={"name": "MIT"},
        openapi_tags=[
            {"name": "inspect", "description": "Core inspection endpoint — submit content for threat analysis."},
            {"name": "dashboard", "description": "REST APIs consumed by the Next.js dashboard."},
            {"name": "realtime", "description": "WebSocket feed for live incident streaming."},
            {"name": "meta", "description": "Health check, Prometheus metrics, and service info."},
        ],
        lifespan=lifespan,
    )

    # ── Middleware ─────────────────────────────────────────────────────────────

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if not settings.is_production else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        """Attach a request ID to every log line for this request via structlog contextvars."""
        clear_contextvars()
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        bind_contextvars(request_id=request_id, path=request.url.path)
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # ── Routers ────────────────────────────────────────────────────────────────

    app.include_router(inspect_router.router)
    app.include_router(ws_router.router)
    app.include_router(dashboard_router.router)
    app.include_router(metrics_router.router)

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", version="0.1.0")

    return app


app = create_app()
