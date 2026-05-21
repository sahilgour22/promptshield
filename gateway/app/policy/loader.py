from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Policy

_DEFAULT_POLICY_PATH = Path(__file__).parent / "default_policy.yaml"


def load_from_file(path: str | Path | None = None) -> dict:
    target = Path(path) if path else _DEFAULT_POLICY_PATH
    with open(target, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


async def load_active_policy(session: AsyncSession) -> dict:
    """Load the most-recently-updated active policy from DB; fall back to default file."""
    result = await session.execute(
        select(Policy)
        .where(Policy.is_active == True)  # noqa: E712
        .order_by(Policy.updated_at.desc())
        .limit(1)
    )
    policy = result.scalar_one_or_none()
    if policy:
        return yaml.safe_load(policy.yaml_content)
    return load_from_file()
