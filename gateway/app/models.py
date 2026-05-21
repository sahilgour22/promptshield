import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Direction(str, enum.Enum):
    input = "input"
    output = "output"


class AttackType(str, enum.Enum):
    direct_injection = "direct_injection"
    indirect_injection = "indirect_injection"
    data_exfiltration = "data_exfiltration"
    jailbreak = "jailbreak"
    none = "none"


class Severity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class Verdict(str, enum.Enum):
    block = "block"
    sanitize = "sanitize"
    allow = "allow"
    log_only = "log_only"


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    direction: Mapped[Direction] = mapped_column(Enum(Direction), nullable=False)
    attack_type: Mapped[AttackType] = mapped_column(Enum(AttackType), nullable=False)
    severity: Mapped[Severity] = mapped_column(Enum(Severity), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    verdict: Mapped[Verdict] = mapped_column(Enum(Verdict), nullable=False)
    detector_name: Mapped[str] = mapped_column(Text, nullable=False)
    matched_patterns: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    sanitized_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_judge_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    policy_rule_id: Mapped[str | None] = mapped_column(Text, nullable=True)


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    yaml_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    final_verdict: Mapped[Verdict] = mapped_column(Enum(Verdict), nullable=False)
    total_latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
