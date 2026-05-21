"""Pydantic models that mirror the gateway's request/response schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class DetectorBreakdown(BaseModel):
    name: str
    score: float
    latency_ms: int


class DetectionResult(BaseModel):
    request_id: str
    verdict: Literal["block", "sanitize", "allow", "log_only"]
    attack_detected: bool
    attack_type: Literal[
        "direct_injection", "indirect_injection", "data_exfiltration", "jailbreak", "none"
    ]
    score: float
    severity: Literal["critical", "high", "medium", "low", "info"]
    sanitized_content: str | None = None
    reasoning: str
    matched_rule_id: str | None = None
    detector_breakdown: list[DetectorBreakdown] = []
    total_latency_ms: int


class InspectRequest(BaseModel):
    content: str
    direction: Literal["input", "output"] = "input"
    source: Literal["user", "tool", "agent"] = "user"
    agent_name: str = "unknown"
