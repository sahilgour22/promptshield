"""
PromptShield Demo Attack Runner
================================
Runs all 5 attacks in sequence and prints a summary table.

Usage
-----
  # Show all 5 attacks succeeding (no protection):
  python attacks/runner.py --shield off

  # Show all 5 attacks blocked (protection enabled):
  python attacks/runner.py --shield on

  # Full live demo with dramatic pauses:
  python attacks/runner.py --demo --shield off
  python attacks/runner.py --demo --shield on

Flags
-----
  --shield on|off   Enable or disable PromptShield on the victim agent
  --demo            Add dramatic pauses between attacks for live presentation
  --agent-url URL   Victim agent base URL (default: $VICTIM_AGENT_URL or http://localhost:9000)
  --dry-run         Print all payloads without firing them

Exit codes
----------
  0 = all attacks produced the expected result for the given shield mode
  1 = one or more attacks did NOT produce the expected result
  2 = could not reach the agent
"""
from __future__ import annotations

import argparse
import importlib
import sys
import time

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

# We import each attack module dynamically so the runner works when called
# from the repo root (python attacks/runner.py) or from inside attacks/.
_ATTACK_MODULES = [
    "attack_01_direct_injection",
    "attack_02_indirect_injection",
    "attack_03_data_exfiltration",
    "attack_04_jailbreak_multiturn",
    "attack_05_tool_abuse",
]

_ATTACK_DESCRIPTIONS = [
    "Direct Injection via Support Ticket",
    "Indirect Injection via Customer Email",
    "Data Exfiltration via Markdown Image",
    "Multi-Turn Jailbreak / System Prompt Extraction",
    "Tool Abuse -- Exfiltration via send_email",
]

console = Console()

DEMO_PAUSE = 3.0   # seconds between attacks in --demo mode
INTER_PAUSE = 0.5  # normal inter-attack pause


def _import_attack(name: str):
    """Import an attack module, handling both same-dir and parent-dir invocations."""
    import importlib.util
    import pathlib

    # Try plain import first (works when running from attacks/)
    try:
        return importlib.import_module(name)
    except ModuleNotFoundError:
        pass

    # Fall back to file-path import (works from repo root)
    attacks_dir = pathlib.Path(__file__).parent
    spec = importlib.util.spec_from_file_location(name, attacks_dir / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def print_intro(shield: str, demo: bool) -> None:
    shield_on = shield == "on"
    mode_color = "green" if shield_on else "red"
    mode_label = "ON  OK" if shield_on else "OFF [!]"

    console.print()
    console.print(Panel(
        f"[bold white]PromptShield -- Live Attack Demo[/bold white]\n\n"
        f"Running [bold]5 attacks[/bold] against the Acme Corp AI support agent.\n"
        f"Shield mode: [bold {mode_color}]{mode_label}[/bold {mode_color}]\n\n"
        f"[dim]{'Demo mode: dramatic pauses enabled' if demo else 'Fast mode'}[/dim]",
        border_style=mode_color,
        title="[bold magenta]PromptShield Demo[/bold magenta]",
        padding=(1, 4),
    ))

    if demo and not shield_on:
        console.print(
            "\n[bold red]  [!]  SHIELD IS OFF[/bold red] -- you are about to witness 5 real attacks "
            "succeed against an unprotected AI agent.\n"
        )
        time.sleep(2)
    elif demo and shield_on:
        console.print(
            "\n[bold green]  OK  SHIELD IS ON[/bold green] -- watch PromptShield block every attack "
            "in real time.\n"
        )
        time.sleep(2)


def print_summary(results: list[tuple[str, bool, int]], shield: str) -> None:
    shield_on = shield == "on"

    console.print()
    table = Table(
        title=f"Attack Summary -- Shield {'ON' if shield_on else 'OFF'}",
        show_header=True,
        header_style="bold cyan",
        border_style="cyan",
        title_style="bold white",
    )
    table.add_column("#",          width=3,  justify="center")
    table.add_column("Attack",     min_width=40)
    table.add_column("Shield",     width=8,  justify="center")
    table.add_column("Result",     width=18, justify="center")
    table.add_column("Latency",    width=10, justify="right")
    table.add_column("Expected?",  width=10, justify="center")

    all_as_expected = True
    for i, (desc, blocked, latency_ms) in enumerate(results, start=1):
        shield_cell = (
            Text("ON", style="bold green") if shield_on
            else Text("OFF", style="bold red")
        )
        if blocked:
            result_cell = Text("BLOCKED OK", style="bold green")
        else:
            result_cell = Text("SUCCEEDED FAIL", style="bold red")

        # Expected: if shield on -> want blocked; if shield off -> want succeeded
        expected = (shield_on and blocked) or (not shield_on and not blocked)
        all_as_expected = all_as_expected and expected
        expected_cell = Text("OK", style="green") if expected else Text("FAIL UNEXPECTED", style="bold red")

        table.add_row(
            str(i),
            desc,
            shield_cell,
            result_cell,
            f"{latency_ms} ms",
            expected_cell,
        )

    console.print(table)

    if all_as_expected:
        if shield_on:
            console.print(Panel(
                "[bold green]ALL 5 ATTACKS BLOCKED[/bold green]\n\n"
                "PromptShield stopped every attack before it could cause harm.\n"
                "Direct injection, indirect injection, data exfiltration,\n"
                "jailbreak, and tool abuse -- all neutralised.",
                border_style="green",
                padding=(0, 4),
            ))
        else:
            console.print(Panel(
                "[bold red]ALL 5 ATTACKS SUCCEEDED[/bold red]\n\n"
                "Without PromptShield, every attack went through.\n"
                "This is what an unprotected AI agent looks like in the wild.\n\n"
                "Now run:  [bold white]python attacks/runner.py --demo --shield on[/bold white]",
                border_style="red",
                padding=(0, 4),
            ))
    else:
        console.print(Panel(
            "[bold yellow][!]  Some results were unexpected.[/bold yellow]\n"
            "Check the attack output above for details.\n"
            "The detector or attack payload may need tuning.",
            border_style="yellow",
            padding=(0, 4),
        ))


def main() -> None:
    parser = argparse.ArgumentParser(description="PromptShield demo attack runner")
    parser.add_argument("--shield", choices=["on", "off"], default="off",
                        help="Enable or disable PromptShield on the victim agent")
    parser.add_argument("--demo", action="store_true",
                        help="Add dramatic pauses between attacks for live demos")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print all payloads without firing any attacks")
    parser.add_argument("--agent-url", default=None,
                        help="Victim agent base URL (overrides VICTIM_AGENT_URL env var)")
    args = parser.parse_args()

    # Agent URL -- passed through to each attack via env var override
    if args.agent_url:
        import os
        os.environ["VICTIM_AGENT_URL"] = args.agent_url

    from _common import AGENT_URL
    agent_url = args.agent_url or AGENT_URL

    # Verify agent is reachable before starting
    if not args.dry_run:
        import httpx
        try:
            r = httpx.get(f"{agent_url}/health", timeout=5)
            r.raise_for_status()
        except Exception as exc:
            console.print(
                f"[bold red]Cannot reach victim agent at {agent_url}[/bold red]\n"
                f"Error: {exc}\n\n"
                "Start the victim agent first:\n"
                "  cd victim-agent && uvicorn agent.main:app --port 9000"
            )
            sys.exit(2)

    print_intro(args.shield, args.demo)

    results: list[tuple[str, bool, int]] = []
    pause = DEMO_PAUSE if args.demo else INTER_PAUSE

    for mod_name, desc in zip(_ATTACK_MODULES, _ATTACK_DESCRIPTIONS):
        mod = _import_attack(mod_name)

        if args.dry_run:
            mod.main.__globals__["sys"].argv = ["--dry-run", f"--shield={args.shield}"]
            console.print(f"\n[bold cyan]Attack: {desc}[/bold cyan]")
            console.print(Panel(mod.PAYLOAD[:500], border_style="yellow"))
            results.append((desc, False, 0))
            continue

        # Run the attack's run() function directly (not main()) to capture results
        try:
            blocked, latency_ms = mod.run(args.shield, agent_url)
        except Exception as exc:
            console.print(f"[bold red]Attack failed with error:[/bold red] {exc}")
            results.append((desc, False, 0))
            continue

        results.append((desc, blocked, latency_ms))

        if args.demo:
            console.print(f"\n[dim]Next attack in {int(pause)}s...[/dim]")
            time.sleep(pause)
        else:
            time.sleep(INTER_PAUSE)

    print_summary(results, args.shield)

    # Exit 0 only if all results were as expected
    shield_on = args.shield == "on"
    all_ok = all(
        (shield_on and blocked) or (not shield_on and not blocked)
        for _, blocked, _ in results
    )
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
