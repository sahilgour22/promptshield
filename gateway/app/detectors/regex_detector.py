"""
Heuristic regex detector for prompt injection, jailbreak, and data exfiltration.

Each rule is a tuple of (pattern, confidence_score, attack_type).
Score for a detection = max(matched scores) + 0.05 per additional match, capped at 1.0.
"""

import re
from typing import NamedTuple

from app.detectors.base import BaseDetector, DetectionResult
from app.models import AttackType

_FLAG = re.IGNORECASE | re.DOTALL


class _Rule(NamedTuple):
    pattern: str
    score: float
    attack_type: AttackType


_RULES: list[_Rule] = [
    # ── Direct injection ─────────────────────────────────────────────────────
    _Rule(r"ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions?", 0.92, AttackType.direct_injection),
    _Rule(r"ignore\s+your\s+(?:previous\s+)?instructions?", 0.92, AttackType.direct_injection),
    _Rule(r"disregard\s+(?:all\s+)?(?:previous|prior|your)\s+instructions?", 0.90, AttackType.direct_injection),
    _Rule(r"forget\s+(?:everything|all)\s+(?:above|before|prior|previous)", 0.88, AttackType.direct_injection),
    _Rule(r"override\s+(?:your\s+)?(?:instructions?|system\s+prompt|training)", 0.90, AttackType.direct_injection),
    _Rule(r"new\s+instructions?\s*:", 0.85, AttackType.direct_injection),
    _Rule(r"system\s+override\s*:", 0.90, AttackType.direct_injection),
    _Rule(r"your\s+(?:real|true|actual)\s+instructions?\s+(?:are|say)", 0.85, AttackType.direct_injection),
    _Rule(r"(?:hidden|secret|real)\s+system\s+prompt", 0.88, AttackType.direct_injection),
    _Rule(r"from\s+now\s+on[,\s]+(?:you|ignore|act|pretend)", 0.78, AttackType.direct_injection),
    _Rule(r"you\s+are\s+now\s+(?!an?\s+(?:helpful\s+)?assistant)", 0.72, AttackType.direct_injection),
    _Rule(r"pretend\s+(?:you\s+are|to\s+be)\s+(?!a\s+(?:helpful|useful))", 0.72, AttackType.direct_injection),
    _Rule(r"don't\s+(?:follow|obey)\s+(?:your\s+)?(?:instructions?|guidelines?|rules?)", 0.70, AttackType.direct_injection),
    _Rule(r"stop\s+being\s+(?:an?\s+)?(?:assistant|helpful|ai)", 0.65, AttackType.direct_injection),
    _Rule(r"(?:bypass|skip)\s+(?:your\s+)?(?:safety|filter|content)", 0.75, AttackType.direct_injection),
    _Rule(r"\[(?:SYSTEM|INST|SYS)\]", 0.68, AttackType.direct_injection),

    # ── Jailbreak ────────────────────────────────────────────────────────────
    _Rule(r"\bDAN\b", 0.88, AttackType.jailbreak),
    _Rule(r"do\s+anything\s+now", 0.88, AttackType.jailbreak),
    _Rule(r"jailbreak", 0.90, AttackType.jailbreak),
    _Rule(r"developer\s+mode\s+enabled", 0.90, AttackType.jailbreak),
    _Rule(r"enable\s+(?:unrestricted|developer|god|chaos)\s+mode", 0.88, AttackType.jailbreak),
    _Rule(r"pretend\s+you\s+have\s+no\s+restrictions?", 0.88, AttackType.jailbreak),
    _Rule(r"you\s+are\s+not\s+(?:an?\s+ai|bound\s+by|restricted)", 0.82, AttackType.jailbreak),
    _Rule(r"(?:no\s+more|without\s+any)\s+(?:restrictions?|limits?|filters?|ethics?)", 0.80, AttackType.jailbreak),
    _Rule(r"roleplay\s+as\s+(?:an?\s+)?(?:evil|malicious|unrestricted|uncensored)", 0.85, AttackType.jailbreak),
    _Rule(r"grandma\s+(?:trick|exploit|hack|loophole)", 0.78, AttackType.jailbreak),
    _Rule(r"hypothetically[,\s]+(?:if\s+)?(?:you|there\s+were)\s+no\s+restrictions?", 0.72, AttackType.jailbreak),

    # ── Data exfiltration ────────────────────────────────────────────────────
    _Rule(
        r"(?:send|post|transmit|upload|exfiltrate|leak)\s+(?:this|the|all|my|user)?\s*"
        r"(?:data|information|content|history|conversation|messages?)\s+to\s+https?://",
        0.95, AttackType.data_exfiltration,
    ),
    _Rule(r"https?://\S+[?&](?:data|q|query|content|text|payload)=", 0.85, AttackType.data_exfiltration),
    _Rule(r"(?:curl|wget)\s+['\"]?https?://", 0.82, AttackType.data_exfiltration),
    _Rule(r"fetch\s*\(\s*['\"]https?://", 0.80, AttackType.data_exfiltration),
    _Rule(r"exfiltrate", 0.90, AttackType.data_exfiltration),
    _Rule(r"base64\s*(?:encode)?\s*(?:and\s+)?(?:send|post|transmit)", 0.85, AttackType.data_exfiltration),
    _Rule(r"leak\s+(?:the|this|all|user)?\s*(?:data|information|content|history)", 0.88, AttackType.data_exfiltration),
    _Rule(r"send.*to.*(?:attacker|hacker|evil|malicious)\b", 0.92, AttackType.data_exfiltration),
    _Rule(r"steal\s+(?:the|user)?\s*(?:data|credentials?|tokens?|keys?)", 0.90, AttackType.data_exfiltration),

    # Credit card number in output (exfiltration via tool or response)
    _Rule(r"\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b", 0.95, AttackType.data_exfiltration),
    # Request to send account/payment data to an external email address
    _Rule(
        r"send\s+.{0,150}(?:payment|credit\s*card|billing|account)\s+"
        r"(?:info(?:rmation)?|data|details?|numbers?|history)\b",
        0.85, AttackType.data_exfiltration,
    ),

    # ── Indirect injection ───────────────────────────────────────────────────
    _Rule(r"when\s+(?:you\s+)?(?:read|see|process|encounter)\s+this", 0.72, AttackType.indirect_injection),
    _Rule(r"tell\s+the\s+(?:ai|assistant|model|llm|chatbot)\s+to", 0.75, AttackType.indirect_injection),
    _Rule(r"instruct\s+the\s+(?:ai|assistant|model|llm)\s+to", 0.78, AttackType.indirect_injection),
    _Rule(r"if\s+(?:you\s+are|you're)\s+an?\s+(?:ai|assistant|model|llm)", 0.68, AttackType.indirect_injection),
    _Rule(r"<(?:system|instruction|command|prompt)>", 0.80, AttackType.indirect_injection),
    _Rule(r"---\s*(?:system|instruction|admin|override)\s*---", 0.82, AttackType.indirect_injection),
    _Rule(r"note\s+to\s+(?:ai|assistant|model|llm)\s*:", 0.78, AttackType.indirect_injection),
    _Rule(r"\[(?:HIDDEN|SECRET|ADMIN|OVERRIDE)\s+(?:INSTRUCTION|COMMAND|MESSAGE)\]", 0.85, AttackType.indirect_injection),
]

_COMPILED: list[tuple[re.Pattern, float, AttackType]] = [
    (re.compile(r.pattern, _FLAG), r.score, r.attack_type)
    for r in _RULES
]


class RegexDetector(BaseDetector):
    name = "regex"

    async def detect(self, content: str) -> DetectionResult:
        hits: list[tuple[str, float, AttackType, str]] = []  # (pattern_str, score, attack_type, matched_text)

        for compiled, score, attack_type in _COMPILED:
            m = compiled.search(content)
            if m:
                hits.append((compiled.pattern, score, attack_type, m.group(0)))

        if not hits:
            return DetectionResult(
                attack_type=AttackType.none,
                score=0.0,
                detector_name=self.name,
                matched_patterns={},
                reasoning="No patterns matched",
            )

        # Group by attack_type, pick the type with the highest max score
        by_type: dict[AttackType, list[tuple[str, float, str]]] = {}
        for pattern, score, attack_type, matched_text in hits:
            by_type.setdefault(attack_type, []).append((pattern, score, matched_text))

        best_type = max(by_type, key=lambda t: max(s for _, s, _ in by_type[t]))
        type_hits = by_type[best_type]

        base_score = max(s for _, s, _ in type_hits)
        # Small bonus per additional match (diminishing returns, cap at 1.0)
        bonus = min(0.1, 0.05 * (len(type_hits) - 1))
        final_score = min(1.0, base_score + bonus)

        matched_patterns = [p for p, _, _ in type_hits]
        matched_texts = [t for _, _, t in type_hits]

        return DetectionResult(
            attack_type=best_type,
            score=round(final_score, 4),
            detector_name=self.name,
            matched_patterns={
                "patterns": matched_patterns,
                "matched_text": matched_texts,
            },
            reasoning=f"Matched {len(type_hits)} pattern(s) for {best_type.value}: {matched_texts[:3]}",
        )
