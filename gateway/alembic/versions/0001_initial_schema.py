"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    direction_enum = postgresql.ENUM("input", "output", name="direction")
    attack_type_enum = postgresql.ENUM(
        "direct_injection",
        "indirect_injection",
        "data_exfiltration",
        "jailbreak",
        "none",
        name="attacktype",
    )
    severity_enum = postgresql.ENUM(
        "critical", "high", "medium", "low", "info", name="severity"
    )
    verdict_enum = postgresql.ENUM(
        "block", "sanitize", "allow", "log_only", name="verdict"
    )

    direction_enum.create(op.get_bind(), checkfirst=True)
    attack_type_enum.create(op.get_bind(), checkfirst=True)
    severity_enum.create(op.get_bind(), checkfirst=True)
    verdict_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("agent_name", sa.Text(), nullable=False),
        sa.Column(
            "final_verdict",
            sa.Enum("block", "sanitize", "allow", "log_only", name="verdict"),
            nullable=False,
        ),
        sa.Column("total_latency_ms", sa.Integer(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
    )

    op.create_table(
        "incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "direction",
            sa.Enum("input", "output", name="direction"),
            nullable=False,
        ),
        sa.Column(
            "attack_type",
            sa.Enum(
                "direct_injection",
                "indirect_injection",
                "data_exfiltration",
                "jailbreak",
                "none",
                name="attacktype",
            ),
            nullable=False,
        ),
        sa.Column(
            "severity",
            sa.Enum("critical", "high", "medium", "low", "info", name="severity"),
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column(
            "verdict",
            sa.Enum("block", "sanitize", "allow", "log_only", name="verdict"),
            nullable=False,
        ),
        sa.Column("detector_name", sa.Text(), nullable=False),
        sa.Column(
            "matched_patterns", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("sanitized_content", sa.Text(), nullable=True),
        sa.Column("llm_judge_reasoning", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("policy_rule_id", sa.Text(), nullable=True),
    )
    op.create_index("ix_incidents_request_id", "incidents", ["request_id"])

    op.create_table(
        "policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("yaml_content", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("policies")
    op.drop_index("ix_incidents_request_id", table_name="incidents")
    op.drop_table("incidents")
    op.drop_table("requests")

    op.execute("DROP TYPE IF EXISTS verdict")
    op.execute("DROP TYPE IF EXISTS severity")
    op.execute("DROP TYPE IF EXISTS attacktype")
    op.execute("DROP TYPE IF EXISTS direction")
