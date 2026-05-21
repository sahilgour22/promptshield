from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import DetectionResult


class BlockedByShield(Exception):
    """Raised when PromptShield's verdict is 'block'."""

    def __init__(self, reasoning: str, result: DetectionResult | None = None) -> None:
        super().__init__(reasoning)
        self.reasoning = reasoning
        self.result = result


class ShieldUnavailable(Exception):
    """Raised when the gateway is unreachable and fail_mode='fail_closed'."""
