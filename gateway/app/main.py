import asyncio
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import engine
from app.logging_config import configure_logging
from app.routers import inspect as inspect_router
from app.routers import ws as ws_router
from app.schemas import HealthResponse

configure_logging()

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", environment=settings.environment)
    async with engine.begin() as conn:
        # Verify DB connectivity on startup
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    logger.info("database connected")

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
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if not settings.is_production else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(inspect_router.router)
    app.include_router(ws_router.router)

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", version="0.1.0")

    return app


app = create_app()
