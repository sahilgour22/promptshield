"""
Shared utilities for all PromptShield demo attack scripts.
"""
from __future__ import annotations

import os
import time
from typing import Any

import httpx
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax

AGENT_URL = os.getenv("VICTIM_AGENT_URL", "http://localhost:9000")

console = Console(highlight=False)


# -- Pretty printing -----------------------------------------------------------


def print_attack_header(number: str, name: str, shield: str) -> None:
    shield_on = shield == "on"
    mode_str = (
        "[bold green]SHIELD ON  OK  -- expect BLOCK[/bold green]"
        if shield_on
        else "[bold red]SHIELD OFF [!]  -- expect BREACH[/bold red]"
    )
    console.print()
    console.print(Panel(
        f"[bold cyan]Attack {number}[/bold cyan]  [white]{name}[/white]\n{mode_str}",
        title="[bold magenta]PromptShield Demo Attack[/bold magenta]",
        border_style="cyan",
        padding=(0, 2),
    ))


def print_payload(payload: str, label: str = "Payload") -> None:
    console.print(f"\n[bold yellow]> {label}:[/bold yellow]")
    console.print(Panel(
        Syntax(payload, "text", theme="monokai", word_wrap=True),
        border_style="yellow",
        padding=(0, 1),
    ))


def print_response(response_text: str, tool_calls: list[dict], latency_ms: int) -> None:
    console.print(f"\n[bold yellow]> Agent response[/bold yellow] [dim]({latency_ms} ms)[/dim]:")
    console.print(Panel(response_text[:1800], border_style="dim white", padding=(0, 1)))
    if tool_calls:
        names = [t.get("tool", "?") for t in tool_calls]
        console.print(f"[dim]  Tools called: {names}[/dim]")


def print_verdict(blocked: bool, shield_event: dict | None = None) -> None:
    if blocked:
        se = shield_event or {}
        detail = (
            f"[dim]Detector:[/dim]   {se.get('attack_type', '--')}\n"
            f"[dim]Confidence:[/dim] {float(se.get('score', 0)):.0%}\n"
            f"[dim]Reason:[/dim]     {se.get('reasoning', '--')}"
        )
        console.print(Panel(
            f"[bold green]OK  ATTACK BLOCKED[/bold green]\n\n{detail}",
            title="[bold green]VERDICT[/bold green]",
            border_style="green",
            padding=(0, 2),
        ))
    else:
        console.print(Panel(
            "[bold red]FAIL  ATTACK SUCCEEDED[/bold red]\n\n"
            "[dim]PromptShield was not active -- the attack went through.[/dim]",
            title="[bold red]VERDICT[/bold red]",
            border_style="red",
            padding=(0, 2),
        ))


# -- HTTP helpers --------------------------------------------------------------


def chat(
    message: str,
    shield: str,
    history: list[dict] | None = None,
    agent_url: str = AGENT_URL,
    timeout: float = 60.0,
) -> tuple[bool, str, list[dict], dict | None, int]:
    """
    POST /chat to the victim agent.

    Returns: (blocked, response_text, tool_calls, shield_event, latency_ms)
    """
    payload: dict[str, Any] = {
        "message": message,
        "conversation_history": history or [],
    }
    with httpx.Client(timeout=timeout) as client:
        t0 = time.monotonic()
        resp = client.post(
            f"{agent_url}/chat",
            params={"shield": shield},
            json=payload,
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

    resp.raise_for_status()
    data = resp.json()
    return (
        data.get("blocked", False),
        data.get("response", ""),
        data.get("tool_calls", []),
        data.get("shield_event"),
        latency_ms,
    )


def get_sent_emails(agent_url: str = AGENT_URL) -> list[dict]:
    """Fetch the sent-email log from the victim agent."""
    with httpx.Client(timeout=10) as client:
        resp = client.get(f"{agent_url}/sent-emails")
    resp.raise_for_status()
    return resp.json().get("emails", [])


def clear_sent_emails_log(agent_url: str = AGENT_URL) -> None:
    """Best-effort clear of the in-memory sent-emails log (no endpoint; restart needed)."""
    pass  # Log is in-memory; agents handle this via restart between demo runs


# -- Success heuristics --------------------------------------------------------


def response_contains_any(text: str, keywords: list[str]) -> bool:
    lower = text.lower()
    return any(k.lower() in lower for k in keywords)
