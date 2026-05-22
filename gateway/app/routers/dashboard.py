"""
Dashboard REST endpoints (no /v1 prefix — consumed directly by the Next.js frontend).

GET  /incidents           list incidents with pagination + filters
GET  /incidents/{id}      single incident
GET  /policies            list policies
POST /policies            create policy
PATCH /policies/{id}      update policy (activate / deactivate / rename)
GET  /stats/today         aggregated stats for today
"""

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
import yaml
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Incident, Policy, Verdict
from app.schemas import IncidentRead, PolicyRead

logger = structlog.get_logger()

router = APIRouter(tags=["dashboard"], prefix="")


# ── Incidents ─────────────────────────────────────────────────────────────────


@router.get("/incidents", response_model=list[IncidentRead])
async def list_incidents(
    limit: int = 50,
    offset: int = 0,
    severity: str | None = None,
    verdict: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[Incident]:
    q = select(Incident).order_by(Incident.created_at.desc())
    if severity:
        q = q.where(Incident.severity == severity)
    if verdict:
        q = q.where(Incident.verdict == verdict)
    q = q.limit(limit).offset(offset)
    result = await session.execute(q)
    return result.scalars().all()


@router.get("/incidents/{incident_id}", response_model=IncidentRead)
async def get_incident(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> Incident:
    result = await session.execute(
        select(Incident).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


# ── Policies ──────────────────────────────────────────────────────────────────


class PolicyCreate(BaseModel):
    name: str
    yaml_content: str


class PolicyPatch(BaseModel):
    name: str | None = None
    yaml_content: str | None = None
    is_active: bool | None = None


@router.get("/policies", response_model=list[PolicyRead])
async def list_policies(
    session: AsyncSession = Depends(get_session),
) -> list[Policy]:
    result = await session.execute(select(Policy).order_by(Policy.updated_at.desc()))
    return result.scalars().all()


@router.post("/policies", response_model=PolicyRead, status_code=201)
async def create_policy(
    body: PolicyCreate,
    session: AsyncSession = Depends(get_session),
) -> Policy:
    yaml.safe_load(body.yaml_content)

    existing = await session.execute(select(Policy).where(Policy.is_active == True))  # noqa: E712
    for p in existing.scalars():
        p.is_active = False

    policy = Policy(name=body.name, yaml_content=body.yaml_content, is_active=True)
    session.add(policy)
    await session.commit()
    await session.refresh(policy)
    return policy


@router.patch("/policies/{policy_id}", response_model=PolicyRead)
async def update_policy(
    policy_id: uuid.UUID,
    body: PolicyPatch,
    session: AsyncSession = Depends(get_session),
) -> Policy:
    result = await session.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")

    if body.yaml_content is not None:
        yaml.safe_load(body.yaml_content)
        policy.yaml_content = body.yaml_content
    if body.name is not None:
        policy.name = body.name
    if body.is_active is not None:
        if body.is_active:
            # deactivate others before activating this one
            others = await session.execute(
                select(Policy).where(Policy.id != policy_id, Policy.is_active == True)  # noqa: E712
            )
            for p in others.scalars():
                p.is_active = False
        policy.is_active = body.is_active

    await session.commit()
    await session.refresh(policy)
    return policy


# ── Stats ─────────────────────────────────────────────────────────────────────


@router.get("/stats/today")
async def stats_today(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total = (
        await session.execute(
            select(func.count()).select_from(Incident).where(Incident.created_at >= today_start)
        )
    ).scalar_one()

    blocked = (
        await session.execute(
            select(func.count())
            .select_from(Incident)
            .where(Incident.created_at >= today_start, Incident.verdict == Verdict.block)
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
