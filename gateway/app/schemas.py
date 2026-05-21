import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models import AttackType, Direction, Severity, Verdict


class HealthResponse(BaseModel):
    status: str
    version: str


class IncidentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    created_at: datetime
    request_id: uuid.UUID
    direction: Direction
    attack_type: AttackType
    severity: Severity
    score: float
    verdict: Verdict
    detector_name: str
    matched_patterns: dict
    raw_content: str
    sanitized_content: str | None
    llm_judge_reasoning: str | None
    latency_ms: int
    policy_rule_id: str | None


class PolicyRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    yaml_content: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class RequestRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    created_at: datetime
    agent_name: str
    final_verdict: Verdict
    total_latency_ms: int
    metadata_: dict = Field(alias="metadata")
