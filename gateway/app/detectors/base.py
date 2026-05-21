import abc
from dataclasses import dataclass, field

from app.models import AttackType


@dataclass
class DetectionResult:
    attack_type: AttackType
    score: float  # 0.0 – 1.0
    detector_name: str
    matched_patterns: dict = field(default_factory=dict)
    latency_ms: int = 0
    reasoning: str = ""


class BaseDetector(abc.ABC):
    name: str

    @abc.abstractmethod
    async def detect(self, content: str) -> DetectionResult: ...
