"""
WebSocket live feed — /ws/incidents

Broadcasts:
  - {"type": "incident", ...IncidentRead fields}   on every new detection
  - {"type": "stats", ...}                          every STATS_INTERVAL seconds
  - {"type": "ping"}                                heartbeat every HEARTBEAT_INTERVAL seconds
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select

from app.db import async_session_factory
from app.models import AttackType, Incident, Verdict

logger = structlog.get_logger()

router = APIRouter(tags=["realtime"])

HEARTBEAT_INTERVAL = 30  # seconds between per-connection pings
STATS_INTERVAL = 5  # seconds between stats broadcasts


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.add(ws)
        logger.info("ws_client_connected", total=len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)
        logger.info("ws_client_disconnected", total=len(self._connections))

    async def broadcast(self, payload: dict[str, Any]) -> None:
        if not self._connections:
            return
        message = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.discard(ws)

    @property
    def count(self) -> int:
        return len(self._connections)


# Module-level singleton — shared by ws_incidents handler and inspect router
manager = ConnectionManager()


async def _query_stats() -> dict[str, Any]:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    async with async_session_factory() as session:
        total = (
            await session.execute(
                select(func.count())
                .select_from(Incident)
                .where(Incident.created_at >= today_start)
            )
        ).scalar_one()

        blocked = (
            await session.execute(
                select(func.count())
                .select_from(Incident)
                .where(
                    Incident.created_at >= today_start,
                    Incident.verdict == Verdict.block,
                )
            )
        ).scalar_one()

        avg_latency = (
            await session.execute(
                select(func.avg(Incident.latency_ms))
                .select_from(Incident)
                .where(Incident.created_at >= today_start)
            )
        ).scalar_one() or 0.0

        rows = (
            await session.execute(
                select(Incident.attack_type, func.count())
                .select_from(Incident)
                .where(Incident.created_at >= today_start)
                .group_by(Incident.attack_type)
            )
        ).fetchall()

    return {
        "total_incidents_today": total,
        "blocked_count": blocked,
        "avg_latency_ms": round(float(avg_latency), 2),
        "attacks_by_type": {row[0].value: row[1] for row in rows},
    }


async def stats_broadcast_loop() -> None:
    """Long-running task started at app startup; broadcasts stats to all clients."""
    while True:
        await asyncio.sleep(STATS_INTERVAL)
        if manager.count == 0:
            continue
        try:
            stats = await _query_stats()
            await manager.broadcast({"type": "stats", **stats})
        except Exception as exc:
            logger.warning("stats_broadcast_failed", error=str(exc))


async def _heartbeat(ws: WebSocket) -> None:
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        try:
            await ws.send_text(json.dumps({"type": "ping"}))
        except Exception:
            break


@router.websocket("/ws/incidents")
async def ws_incidents(ws: WebSocket) -> None:
    await manager.connect(ws)
    heartbeat_task = asyncio.create_task(_heartbeat(ws))
    try:
        while True:
            # Drain client messages (keep-alive / client-side pings)
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
        manager.disconnect(ws)
