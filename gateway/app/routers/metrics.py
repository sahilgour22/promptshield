"""
GET /metrics  — Prometheus exposition format for engineering dashboards.

Exposes counters and histograms derived from the Incident table so that
external Prometheus scrapers / Grafana can plot detection trends.
"""

import time
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import AttackType, Incident, Severity, Verdict

logger = structlog.get_logger()

router = APIRouter(tags=["meta"])

_START_TIME = time.time()

# Prometheus histogram bucket boundaries (ms)
_LATENCY_BUCKETS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000]


def _prom_counter(name: str, help_text: str, value: int | float, labels: dict | None = None) -> str:
    label_str = ""
    if labels:
        pairs = ",".join(f'{k}="{v}"' for k, v in labels.items())
        label_str = f"{{{pairs}}}"
    return (
        f"# HELP {name} {help_text}\n"
        f"# TYPE {name} counter\n"
        f"{name}{label_str} {value}\n"
    )


def _prom_gauge(name: str, help_text: str, value: int | float, labels: dict | None = None) -> str:
    label_str = ""
    if labels:
        pairs = ",".join(f'{k}="{v}"' for k, v in labels.items())
        label_str = f"{{{pairs}}}"
    return (
        f"# HELP {name} {help_text}\n"
        f"# TYPE {name} gauge\n"
        f"{name}{label_str} {value}\n"
    )


@router.get("/metrics", response_class=PlainTextResponse, include_in_schema=False)
async def metrics(session: AsyncSession = Depends(get_session)) -> str:
    lines: list[str] = []

    # ── Uptime ────────────────────────────────────────────────────────────────
    uptime_seconds = time.time() - _START_TIME
    lines.append(_prom_gauge(
        "promptshield_uptime_seconds",
        "Seconds since the gateway process started",
        round(uptime_seconds, 2),
    ))

    # ── Total inspections by verdict ──────────────────────────────────────────
    verdict_rows = (
        await session.execute(
            select(Incident.verdict, func.count())
            .select_from(Incident)
            .group_by(Incident.verdict)
        )
    ).fetchall()

    lines.append("# HELP promptshield_inspections_total Total inspection requests processed\n"
                 "# TYPE promptshield_inspections_total counter")
    total = 0
    verdict_counts: dict[str, int] = {}
    for verdict, count in verdict_rows:
        verdict_counts[verdict.value] = count
        total += count
        lines.append(f'promptshield_inspections_total{{verdict="{verdict.value}"}} {count}')
    lines.append("")

    # ── Blocked requests ──────────────────────────────────────────────────────
    blocked = verdict_counts.get(Verdict.block.value, 0)
    lines.append(_prom_counter(
        "promptshield_blocked_total",
        "Total inspection requests that resulted in a block verdict",
        blocked,
    ))

    # ── Attacks by type ───────────────────────────────────────────────────────
    attack_rows = (
        await session.execute(
            select(Incident.attack_type, func.count())
            .select_from(Incident)
            .group_by(Incident.attack_type)
        )
    ).fetchall()

    lines.append("# HELP promptshield_attacks_by_type_total Attacks detected per category\n"
                 "# TYPE promptshield_attacks_by_type_total counter")
    for attack_type, count in attack_rows:
        lines.append(f'promptshield_attacks_by_type_total{{type="{attack_type.value}"}} {count}')
    lines.append("")

    # ── Attacks by severity ───────────────────────────────────────────────────
    sev_rows = (
        await session.execute(
            select(Incident.severity, func.count())
            .select_from(Incident)
            .group_by(Incident.severity)
        )
    ).fetchall()

    lines.append("# HELP promptshield_incidents_by_severity_total Incidents per severity level\n"
                 "# TYPE promptshield_incidents_by_severity_total counter")
    for severity, count in sev_rows:
        lines.append(f'promptshield_incidents_by_severity_total{{severity="{severity.value}"}} {count}')
    lines.append("")

    # ── Latency histogram ─────────────────────────────────────────────────────
    latency_rows = (
        await session.execute(
            select(Incident.latency_ms)
            .select_from(Incident)
            .where(Incident.latency_ms.is_not(None))
        )
    ).scalars().all()

    latencies = [float(v) for v in latency_rows if v is not None]

    lines.append("# HELP promptshield_inspection_latency_ms_bucket Detection latency histogram (ms)\n"
                 "# TYPE promptshield_inspection_latency_ms_bucket histogram")

    bucket_counts = {b: 0 for b in _LATENCY_BUCKETS}
    for lat in latencies:
        for b in _LATENCY_BUCKETS:
            if lat <= b:
                bucket_counts[b] += 1

    for b in _LATENCY_BUCKETS:
        lines.append(f'promptshield_inspection_latency_ms_bucket{{le="{b}"}} {bucket_counts[b]}')
    lines.append(f'promptshield_inspection_latency_ms_bucket{{le="+Inf"}} {len(latencies)}')

    if latencies:
        lines.append(f"promptshield_inspection_latency_ms_sum {sum(latencies):.2f}")
        lines.append(f"promptshield_inspection_latency_ms_count {len(latencies)}")
    lines.append("")

    # ── Today's stats ─────────────────────────────────────────────────────────
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_total = (
        await session.execute(
            select(func.count())
            .select_from(Incident)
            .where(Incident.created_at >= today_start)
        )
    ).scalar_one()

    lines.append(_prom_gauge(
        "promptshield_incidents_today",
        "Number of incidents recorded since midnight UTC",
        today_total,
    ))

    return "\n".join(lines) + "\n"
