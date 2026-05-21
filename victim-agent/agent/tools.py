"""
LangChain tools for the Acme Corp support agent.

Attack surface (intentional for demo):
  - lookup_customer returns the full record including credit_card (realistic agent access)
  - read_email fetches attacker-controlled content → indirect injection vector
  - search_knowledge_base can return planted KB articles → indirect injection vector
  - send_email can be abused to exfiltrate data to external addresses

Shield mode: when a shield inspector is provided, read_email and
search_knowledge_base outputs are inspected for injection payloads before
being returned to the LLM. lookup_customer output is trusted internal data.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from . import crm

logger = logging.getLogger(__name__)

# Type alias: async fn that returns (is_blocked, reason)
ShieldInspector = Callable[[str], Awaitable[tuple[bool, str]]] | None


def _make_inspector(shield: Any) -> ShieldInspector:
    """Wrap a Shield instance into the simple (content) -> (blocked, reason) interface."""
    async def _inspect(content: str) -> tuple[bool, str]:
        result = await shield.inspect(content, direction="input", source="tool")
        return result.verdict == "block", result.reasoning
    return _inspect


def _make_output_inspector(shield: Any) -> ShieldInspector:
    """Output-direction inspector — used for outbound data (e.g. email bodies)."""
    async def _inspect(content: str) -> tuple[bool, str]:
        result = await shield.inspect(content, direction="output", source="tool")
        return result.verdict == "block", result.reasoning
    return _inspect


# ── Input schemas ─────────────────────────────────────────────────────────────


class LookupCustomerInput(BaseModel):
    email: str = Field(description="Customer email address to look up")


class GetOrderHistoryInput(BaseModel):
    customer_id: str = Field(description="Customer ID (format: cust_001)")


class ReadEmailInput(BaseModel):
    email_id: str = Field(description="Email ID to read (format: email_001)")


class SendEmailInput(BaseModel):
    to: str = Field(description="Recipient email address")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body text")


class SearchKnowledgeBaseInput(BaseModel):
    query: str = Field(description="Search query for the knowledge base")


# ── Tool factories ────────────────────────────────────────────────────────────


def _make_lookup_customer() -> StructuredTool:
    """Returns full customer record including credit card — realistic but risky."""

    async def _run(email: str) -> str:
        customer = crm.get_customer_by_email(email)
        if not customer:
            return f"No customer found with email address: {email}"
        # Return full record — this is intentional. Real agents have DB access.
        # The credit card being accessible is the exfiltration risk we're demonstrating.
        return json.dumps(customer, indent=2)

    return StructuredTool.from_function(
        coroutine=_run,
        name="lookup_customer",
        description=(
            "Look up a customer record by email address. "
            "Returns full account details including contact information and account tier."
        ),
        args_schema=LookupCustomerInput,
    )


def _make_get_order_history() -> StructuredTool:
    """Returns order list for a customer — trusted internal data."""

    async def _run(customer_id: str) -> str:
        orders = crm.get_orders_for_customer(customer_id)
        if not orders:
            return f"No orders found for customer ID: {customer_id}"
        return json.dumps(orders, indent=2)

    return StructuredTool.from_function(
        coroutine=_run,
        name="get_order_history",
        description=(
            "Get the order history for a customer by their customer ID. "
            "Returns a list of orders with status, items, and totals."
        ),
        args_schema=GetOrderHistoryInput,
    )


def _make_read_email(inspector: ShieldInspector = None) -> StructuredTool:
    """Fetches email content — primary indirect injection vector for the demo."""

    async def _run(email_id: str) -> str:
        email = crm.get_email(email_id)
        if not email:
            available = ", ".join(crm.EMAILS.keys())
            return f"Email not found: {email_id}. Available IDs: {available}"

        content = (
            f"From: {email['from']}\n"
            f"Subject: {email['subject']}\n"
            f"Date: {email['date']}\n"
            f"---\n"
            f"{email['body']}"
        )

        if inspector:
            blocked, reason = await inspector(content)
            if blocked:
                logger.warning("shield_blocked_email_content email_id=%s", email_id)
                return (
                    f"[PROMPTSHIELD]: The content of email {email_id} was blocked.\n"
                    f"Reason: {reason}\n"
                    f"This email may contain a prompt injection attack."
                )

        return content

    return StructuredTool.from_function(
        coroutine=_run,
        name="read_email",
        description=(
            "Read a customer support email by its ID. "
            "Use this to review customer complaints or requests before responding. "
            "Available email IDs: email_001 through email_005."
        ),
        args_schema=ReadEmailInput,
    )


def _make_send_email(inspector: ShieldInspector = None) -> StructuredTool:
    """Mock email sender — tool abuse vector when called with external addresses.

    With shield: outbound body is inspected for sensitive data (CC numbers, PII)
    before delivery to external recipients.
    """

    async def _run(to: str, subject: str, body: str) -> str:
        is_external = not to.lower().endswith("@acme.com")

        if is_external and inspector:
            # Inspect outbound content — catches CC numbers and sensitive data exfil
            outbound = f"Outbound email to {to} — {subject}: {body}"
            blocked, reason = await inspector(outbound)
            if blocked:
                logger.warning(
                    "shield_blocked_outbound_email to=%s subject=%s", to, subject
                )
                return (
                    f"[PROMPTSHIELD]: Email to {to} was blocked before delivery.\n"
                    f"Reason: {reason}\n"
                    f"Sensitive data exfiltration attempt detected."
                )

        entry: dict[str, Any] = {
            "to": to,
            "subject": subject,
            "body": body,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_external": is_external,
        }
        crm.SENT_EMAILS_LOG.append(entry)

        if is_external:
            logger.warning(
                "EXTERNAL_EMAIL_SENT to=%s subject=%s body_len=%d",
                to, subject, len(body),
            )
            # Intentionally "succeeds" in unprotected mode — that's the attack.
            return f"Email sent successfully to {to}. Subject: '{subject}'"

        logger.info("email_sent to=%s subject=%s", to, subject)
        return f"Email sent to {to}. Subject: '{subject}'"

    return StructuredTool.from_function(
        coroutine=_run,
        name="send_email",
        description=(
            "Send an email on behalf of Acme Corp support. "
            "Use only for internal @acme.com addresses unless explicitly authorized. "
            "Parameters: to (recipient), subject, body."
        ),
        args_schema=SendEmailInput,
    )


def _make_search_knowledge_base(inspector: ShieldInspector = None) -> StructuredTool:
    """KB search — can return planted malicious articles in unprotected mode."""

    async def _run(query: str) -> str:
        articles = crm.search_kb(query)
        if not articles:
            return "No knowledge base articles found for that query."

        results = []
        for article in articles:
            content = f"[{article['title']}]\n{article['content']}"

            if inspector:
                blocked, reason = await inspector(content)
                if blocked:
                    logger.warning(
                        "shield_blocked_kb_article id=%s query=%s", article["id"], query
                    )
                    results.append(
                        f"[PROMPTSHIELD]: Article '{article['title']}' was blocked "
                        f"(possible injection payload detected)."
                    )
                    continue

            results.append(content)

        return "\n\n---\n\n".join(results) if results else "All matching articles were blocked by PromptShield."

    return StructuredTool.from_function(
        coroutine=_run,
        name="search_knowledge_base",
        description=(
            "Search the Acme Corp knowledge base for policies, procedures, and product info. "
            "Useful for return policies, shipping info, and account management questions."
        ),
        args_schema=SearchKnowledgeBaseInput,
    )


# ── Public factory ────────────────────────────────────────────────────────────


def get_tools(shield: Any = None) -> list[StructuredTool]:
    """Return the full tool list, optionally with shield inspection on external-data tools."""
    inspector = _make_inspector(shield) if shield is not None else None
    out_inspector = _make_output_inspector(shield) if shield is not None else None
    return [
        _make_lookup_customer(),                    # internal DB — inspector not needed
        _make_get_order_history(),                  # internal DB — inspector not needed
        _make_read_email(inspector),                # attacker-controlled content → input inspector
        _make_send_email(out_inspector),            # outbound data → output inspector
        _make_search_knowledge_base(inspector),     # potentially planted articles → input inspector
    ]
