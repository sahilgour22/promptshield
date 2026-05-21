"""
Acme Corp Support Agent — FastAPI application.

Endpoints:
  POST /chat              Chat with the support agent
  GET  /demo              Browser demo UI
  GET  /health            Health check
  GET  /emails            List available email IDs (for demo)
  GET  /sent-emails       Inspect the sent-email log (attack evidence)

Shield toggle:
  • Default: SHIELD_ENABLED env var (false by default)
  • Per-request override: ?shield=on  or  ?shield=off
"""
from __future__ import annotations

import logging
import os
import pathlib
from typing import Any, Literal
from uuid import uuid4

import structlog
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = structlog.get_logger()

app = FastAPI(
    title="Acme Corp Support Agent",
    description="AI customer support bot — PromptShield demo target",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_STATIC_DIR = pathlib.Path(__file__).parent / "static"


# ── Request / Response models ─────────────────────────────────────────────────


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_history: list[ConversationMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[dict[str, Any]]
    blocked: bool = False
    shield_event: dict[str, Any] | None = None
    session_id: str
    shield_enabled: bool


# ── Helpers ───────────────────────────────────────────────────────────────────


def _resolve_shield(query_param: str | None) -> bool:
    """Query param ?shield=on|off overrides the SHIELD_ENABLED env var."""
    if query_param is not None:
        return query_param.lower() == "on"
    return os.getenv("SHIELD_ENABLED", "false").lower() == "true"


# ── Endpoints ─────────────────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "victim-agent"}


@app.get("/demo", response_class=HTMLResponse)
async def demo() -> FileResponse:
    return FileResponse(_STATIC_DIR / "demo.html", media_type="text/html")


@app.get("/emails")
async def list_emails() -> dict[str, Any]:
    from .crm import EMAILS
    return {
        "emails": [
            {"id": e["id"], "from": e["from"], "subject": e["subject"], "date": e["date"]}
            for e in EMAILS.values()
        ],
        "attack_vectors": ["email_003", "email_004"],
    }


@app.get("/sent-emails")
async def sent_emails() -> dict[str, Any]:
    from .crm import SENT_EMAILS_LOG
    return {
        "count": len(SENT_EMAILS_LOG),
        "emails": SENT_EMAILS_LOG,
        "external_count": sum(1 for e in SENT_EMAILS_LOG if e.get("is_external")),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    shield: str | None = Query(default=None, pattern="^(on|off)$"),
) -> ChatResponse:
    from .core import run_agent

    shield_enabled = _resolve_shield(shield)

    log.info(
        "chat_request",
        session_id=body.session_id,
        shield_enabled=shield_enabled,
        message_len=len(body.message),
        history_len=len(body.conversation_history),
    )

    history = [m.model_dump() for m in body.conversation_history]
    result = await run_agent(
        message=body.message,
        conversation_history=history,
        shield_enabled=shield_enabled,
    )

    return ChatResponse(
        response=result["response"],
        tool_calls=result["tool_calls"],
        blocked=result["blocked"],
        shield_event=result.get("shield_event"),
        session_id=body.session_id,
        shield_enabled=shield_enabled,
    )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "agent.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "9000")),
        reload=True,
    )
