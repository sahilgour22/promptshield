"""
Shield — the main entry point for the PromptShield Python SDK.

Quick start:
    shield = Shield(api_key="ps_...", endpoint="http://localhost:8000")
    result = await shield.inspect(content="user message", direction="input")
    protected_client = shield.wrap(openai.AsyncOpenAI(...))
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable, Literal

import httpx

from .exceptions import BlockedByShield, ShieldUnavailable  # noqa: F401 — re-exported
from .models import DetectionResult

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class Shield:
    """PromptShield client with connection pooling and retry logic."""

    def __init__(
        self,
        api_key: str,
        endpoint: str = "http://localhost:8000",
        fail_mode: Literal["fail_open", "fail_closed"] = "fail_open",
        on_detection: Callable[[DetectionResult], None] | None = None,
    ) -> None:
        self._api_key = api_key
        self._endpoint = endpoint.rstrip("/")
        self._fail_mode = fail_mode
        self._on_detection = on_detection
        self._http = httpx.AsyncClient(
            base_url=self._endpoint,
            headers={"X-API-Key": api_key},
            timeout=httpx.Timeout(10.0),
        )

    async def inspect(
        self,
        content: str,
        direction: Literal["input", "output"] = "input",
        source: Literal["user", "tool", "agent"] = "user",
        agent_name: str = "unknown",
    ) -> DetectionResult:
        """Inspect content via the gateway. Returns a DetectionResult.

        Never raises on transient gateway errors — falls back to allow (fail_open)
        or raises ShieldUnavailable (fail_closed).
        """
        payload = {
            "content": content,
            "direction": direction,
            "source": source,
            "agent_name": agent_name,
        }
        try:
            data = await self._post_with_retry("/v1/inspect", payload)
        except ShieldUnavailable:
            if self._fail_mode == "fail_closed":
                raise
            logger.warning("promptshield_unavailable; failing open")
            return DetectionResult(
                request_id="unavailable",
                verdict="allow",
                attack_detected=False,
                attack_type="none",
                score=0.0,
                severity="info",
                reasoning="Shield unavailable; failing open",
                total_latency_ms=0,
            )

        result = DetectionResult(**data)

        if result.attack_detected and self._on_detection is not None:
            try:
                self._on_detection(result)
            except Exception:
                logger.warning("on_detection callback raised", exc_info=True)

        return result

    def wrap(self, client: Any) -> Any:
        """Wrap an OpenAI AsyncOpenAI or LangChain AgentExecutor with shield inspection.

        Returns a drop-in replacement that transparently inspects all I/O.
        Raises TypeError for unsupported client types.
        """
        from .wrappers import _wrap
        return _wrap(client, self)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> Shield:
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()

    async def _post_with_retry(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        last_exc: Exception | None = None
        for attempt in range(_MAX_RETRIES):
            try:
                resp = await self._http.post(path, json=payload)
                if resp.status_code not in _RETRYABLE_STATUS_CODES:
                    resp.raise_for_status()
                    return resp.json()
                last_exc = httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}", request=resp.request, response=resp
                )
            except (httpx.ConnectError, httpx.TimeoutException, httpx.RemoteProtocolError) as exc:
                last_exc = exc

            if attempt < _MAX_RETRIES - 1:
                await asyncio.sleep(0.5 * (2**attempt))  # 0.5s, 1s, 2s

        raise ShieldUnavailable(
            f"Gateway unreachable after {_MAX_RETRIES} attempts: {last_exc}"
        ) from last_exc
