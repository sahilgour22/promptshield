"""
Policy engine: evaluates a DetectionResult against YAML-defined rules and
returns the first matching PolicyDecision.

Supported condition operators: ==, !=, >, <, >=, <=, in [a,b,c], contains x
A condition value may also be a list, in which case ALL items must pass (AND).
"""

import operator
from dataclasses import dataclass

from app.detectors.base import DetectionResult
from app.models import Severity, Verdict

_CMP_OPS: dict[str, object] = {
    ">=": operator.ge,
    "<=": operator.le,
    ">": operator.gt,
    "<": operator.lt,
    "==": operator.eq,
    "!=": operator.ne,
}


@dataclass
class PolicyDecision:
    action: Verdict
    rule_id: str | None
    severity: Severity
    reasoning: str


def _evaluate_condition(condition: str | list, field_value: object) -> bool:
    """
    Evaluate one condition (or a list of AND-conditions) against field_value.

    String form examples:
      ">= 0.8"        → numeric comparison
      "direct_injection" → equality
      "in [a, b, c]"  → membership
      "contains foo"  → substring
    """
    if isinstance(condition, list):
        return all(_evaluate_condition(c, field_value) for c in condition)

    cond = str(condition).strip()

    # Operator-based numeric comparison (try longest prefix first)
    for op_str in (">=", "<=", ">", "<", "==", "!="):
        if cond.startswith(op_str):
            rhs = cond[len(op_str):].strip()
            try:
                return _CMP_OPS[op_str](float(field_value), float(rhs))
            except (ValueError, TypeError):
                pass  # fall through to string comparison

    # "in [a, b, c]"
    if cond.lower().startswith("in "):
        items = [
            i.strip().strip("\"'")
            for i in cond[3:].strip().strip("[]").split(",")
        ]
        return str(field_value) in items

    # "contains foo"
    if cond.lower().startswith("contains "):
        needle = cond[9:].strip().strip("\"'")
        return needle in str(field_value)

    # Default: equality
    return str(field_value) == cond


class PolicyEngine:
    def __init__(self, policy: dict) -> None:
        self._policy = policy

    def evaluate(self, result: DetectionResult) -> PolicyDecision:
        """Return the first rule whose `when` conditions match result."""
        for rule in self._policy.get("rules", []):
            if self._rule_matches(rule.get("when", {}), result):
                return PolicyDecision(
                    action=Verdict(rule["action"]),
                    rule_id=rule.get("id"),
                    severity=Severity(rule["severity"]),
                    reasoning=rule.get(
                        "description",
                        f"Matched rule '{rule.get('id', 'unknown')}'",
                    ),
                )

        default = self._policy.get("default_action", "allow")
        return PolicyDecision(
            action=Verdict(default),
            rule_id=None,
            severity=Severity.info,
            reasoning="No rule matched; default action applied",
        )

    def _rule_matches(self, when: dict, result: DetectionResult) -> bool:
        for key, condition in when.items():
            if key == "attack_type":
                if not _evaluate_condition(condition, result.attack_type.value):
                    return False
            elif key == "score":
                if not _evaluate_condition(condition, result.score):
                    return False
            # Unknown condition keys silently skip (forward-compat)
        return True
