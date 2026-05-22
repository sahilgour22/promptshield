"""
Wrappers for OpenAI and LangChain clients.

Usage via Shield.wrap():
  protected = shield.wrap(openai.AsyncOpenAI(...))
  protected = shield.wrap(agent_executor)
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .client import Shield

logger = logging.getLogger(__name__)


def _wrap(client: Any, shield: Shield) -> Any:
    """Detect client type and return the right protective wrapper."""
    try:
        import openai
        if isinstance(client, openai.AsyncOpenAI):
            return _ProtectedAsyncOpenAI(client, shield)
    except ImportError:
        pass

    try:
        import anthropic
        if isinstance(client, (anthropic.AsyncAnthropic, anthropic.Anthropic)):
            return _ProtectedAsyncAnthropic(client, shield)
    except ImportError:
        pass

    # Support both old AgentExecutor (langchain <1.0) and new CompiledStateGraph (langchain >=1.0)
    try:
        from langchain.agents import AgentExecutor
        if isinstance(client, AgentExecutor):
            return _ProtectedLangChainAgent(client, shield)
    except (ImportError, AttributeError):
        pass

    try:
        from langgraph.graph.state import CompiledStateGraph
        if isinstance(client, CompiledStateGraph):
            return _ProtectedLangChainAgent(client, shield)
    except ImportError:
        pass

    raise TypeError(
        f"shield.wrap() does not support {type(client).__name__}. "
        "Supported types: openai.AsyncOpenAI, anthropic.AsyncAnthropic, "
        "langchain.agents.AgentExecutor, langgraph.CompiledStateGraph"
    )


# ── OpenAI wrapper ────────────────────────────────────────────────────────────


class _ProtectedAsyncOpenAI:
    """Thin proxy around AsyncOpenAI; intercepts chat.completions.create."""

    def __init__(self, client: Any, shield: Shield) -> None:
        self._client = client
        self._shield = shield
        self.chat = _ProtectedChat(client.chat, shield)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)


class _ProtectedChat:
    def __init__(self, chat: Any, shield: Shield) -> None:
        self._chat = chat
        self._shield = shield
        self.completions = _ProtectedCompletions(chat.completions, shield)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._chat, name)


class _ProtectedCompletions:
    def __init__(self, completions: Any, shield: Shield) -> None:
        self._completions = completions
        self._shield = shield

    async def create(self, messages: list[dict[str, Any]], **kwargs: Any) -> Any:
        from .exceptions import BlockedByShield

        # Inspect each input message before sending to OpenAI
        for msg in messages:
            content = msg.get("content") or ""
            if not content:
                continue
            role = msg.get("role", "user")
            source = "user" if role == "user" else "tool" if role == "tool" else "agent"
            result = await self._shield.inspect(
                content=content,
                direction="input",
                source=source,
            )
            if result.verdict == "block":
                raise BlockedByShield(result.reasoning, result)

        # Forward to the real OpenAI API
        response = await self._completions.create(messages=messages, **kwargs)

        # Inspect the model's output
        choice = response.choices[0] if response.choices else None
        output_content = choice.message.content if choice and choice.message else None
        if output_content:
            result = await self._shield.inspect(
                content=output_content,
                direction="output",
                source="agent",
            )
            if result.verdict == "block":
                raise BlockedByShield(result.reasoning, result)

        return response

    def __getattr__(self, name: str) -> Any:
        return getattr(self._completions, name)


# ── Anthropic wrapper ─────────────────────────────────────────────────────────


class _ProtectedAsyncAnthropic:
    """Thin proxy around AsyncAnthropic / Anthropic; intercepts messages.create."""

    def __init__(self, client: Any, shield: Shield) -> None:
        self._client = client
        self._shield = shield
        self.messages = _ProtectedAnthropicMessages(client.messages, shield)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)


class _ProtectedAnthropicMessages:
    def __init__(self, messages: Any, shield: Shield) -> None:
        self._messages = messages
        self._shield = shield

    async def create(self, messages: list[dict[str, Any]], **kwargs: Any) -> Any:
        from .exceptions import BlockedByShield

        for msg in messages:
            raw = msg.get("content") or ""
            # Anthropic content can be a string or a list of typed blocks
            if isinstance(raw, list):
                content = " ".join(
                    b.get("text", "") for b in raw
                    if isinstance(b, dict) and b.get("type") == "text"
                )
            else:
                content = str(raw)
            if not content.strip():
                continue
            source = "user" if msg.get("role") == "user" else "agent"
            result = await self._shield.inspect(content=content, direction="input", source=source)
            if result.verdict == "block":
                raise BlockedByShield(result.reasoning, result)

        # Call the real Anthropic API (sync clients get run via asyncio)
        import asyncio
        import inspect as _inspect
        if _inspect.iscoroutinefunction(self._messages.create):
            response = await self._messages.create(messages=messages, **kwargs)
        else:
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self._messages.create(messages=messages, **kwargs)
            )

        # Inspect output — response.content is a list of ContentBlock objects
        output_text = "".join(
            getattr(block, "text", "") for block in (response.content or [])
        )
        if output_text.strip():
            result = await self._shield.inspect(content=output_text, direction="output", source="agent")
            if result.verdict == "block":
                raise BlockedByShield(result.reasoning, result)

        return response

    def __getattr__(self, name: str) -> Any:
        return getattr(self._messages, name)


# ── LangChain wrapper ─────────────────────────────────────────────────────────


class _ProtectedLangChainAgent:
    """Wraps a LangChain AgentExecutor; inspects invoke/ainvoke I/O."""

    def __init__(self, agent: Any, shield: Shield) -> None:
        self._agent = agent
        self._shield = shield

    async def ainvoke(self, inputs: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        from .exceptions import BlockedByShield

        # Support both old {"input": ...} and new {"messages": [...]} formats
        if "messages" in inputs:
            msgs = inputs["messages"]
            human_msgs = [m for m in msgs if getattr(m, "type", None) == "human"]
            user_input = human_msgs[-1].content if human_msgs else str(inputs)
        else:
            user_input = inputs.get("input") or str(inputs)

        result = await self._shield.inspect(
            content=user_input,
            direction="input",
            source="user",
        )
        if result.verdict == "block":
            raise BlockedByShield(result.reasoning, result)

        output = await self._agent.ainvoke(inputs, **kwargs)

        # Support both old {"output": ...} and new {"messages": [...]} formats
        if "messages" in output:
            ai_msgs = [m for m in output["messages"] if getattr(m, "type", None) == "ai"]
            agent_output = ai_msgs[-1].content if ai_msgs else str(output)
        else:
            agent_output = output.get("output") or str(output)

        result = await self._shield.inspect(
            content=agent_output,
            direction="output",
            source="agent",
        )
        if result.verdict == "block":
            raise BlockedByShield(result.reasoning, result)

        return output

    def invoke(self, inputs: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        import asyncio
        return asyncio.get_event_loop().run_until_complete(self.ainvoke(inputs, **kwargs))

    def __getattr__(self, name: str) -> Any:
        return getattr(self._agent, name)
