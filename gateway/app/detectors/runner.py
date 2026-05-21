import time

import structlog

from app.detectors.base import BaseDetector, DetectionResult
from app.detectors.regex_detector import RegexDetector
from app.models import AttackType

logger = structlog.get_logger()


class DetectorRunner:
    """Runs all registered detectors and returns the highest-confidence result."""

    def __init__(self) -> None:
        self._detectors: list[BaseDetector] = [RegexDetector()]

    async def run(self, content: str) -> tuple[DetectionResult, list[DetectionResult]]:
        """
        Returns (best_result, all_results).

        best_result — the detection with the highest score across all detectors.
        all_results — one DetectionResult per detector (for breakdown reporting).
        """
        all_results: list[DetectionResult] = []

        for detector in self._detectors:
            t0 = time.monotonic()
            try:
                result = await detector.detect(content)
            except Exception as exc:
                logger.warning(
                    "detector_failed",
                    detector=detector.name,
                    error=str(exc),
                )
                result = DetectionResult(
                    attack_type=AttackType.none,
                    score=0.0,
                    detector_name=detector.name,
                    reasoning=f"Detector error: {exc}",
                )
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            all_results.append(result)

        best = max(all_results, key=lambda r: r.score)
        return best, all_results
