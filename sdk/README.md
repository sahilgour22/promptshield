# PromptShield Python SDK

Protect LLM applications from prompt injection, jailbreaks, and data exfiltration — in three lines.

## Install

```bash
pip install -e ./sdk                       # local dev
pip install -e "./sdk[openai]"             # with OpenAI wrapper
pip install -e "./sdk[all]"                # with all integrations
```

## Quick start

```python
from promptshield import Shield

shield = Shield(api_key="ps_...", endpoint="http://localhost:8000")

# Explicit inspection
result = await shield.inspect(content="user input", direction="input", source="user")
if result.verdict == "block":
    raise BlockedByShield(result.reasoning)

# Wrap OpenAI — every call is automatically inspected
from openai import AsyncOpenAI
client = shield.wrap(AsyncOpenAI(api_key="sk-..."))
response = await client.chat.completions.create(
    messages=[{"role": "user", "content": "Hello!"}],
    model="gpt-4o",
)

# Wrap LangChain agent
from langchain.agents import AgentExecutor
protected_agent = shield.wrap(agent_executor)
result = await protected_agent.ainvoke({"input": "user query"})
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | required | Your PromptShield API key (`ps_...`) |
| `endpoint` | `http://localhost:8000` | Gateway URL |
| `fail_mode` | `"fail_open"` | `"fail_open"` (allow on gateway error) or `"fail_closed"` (raise ShieldUnavailable) |
| `on_detection` | `None` | Callback fired on every detection: `(result: DetectionResult) -> None` |

## Exceptions

- `BlockedByShield(reasoning, result)` — verdict was `"block"`; `exc.result` is the full `DetectionResult`
- `ShieldUnavailable` — gateway unreachable and `fail_mode="fail_closed"`

## OpenAI wrapper behaviour

`shield.wrap(AsyncOpenAI(...))` returns a drop-in replacement that:

1. Inspects every message in `messages` before the API call (direction=`input`)
2. Makes the real OpenAI API call
3. Inspects `response.choices[0].message.content` after (direction=`output`)
4. Raises `BlockedByShield` at either step if the verdict is `block`

## Telemetry callback

```python
def on_detection(result):
    metrics.increment("promptshield.detections", tags={"attack": result.attack_type})

shield = Shield(api_key="ps_...", on_detection=on_detection)
```

## Retry behaviour

Transient errors (5xx, network timeouts) are retried up to **3 times** with exponential
backoff (0.5 s → 1 s → 2 s). All retries exhausted → `ShieldUnavailable`.

## TestPyPI publish

```bash
pip install build twine
python -m build sdk/
twine upload --repository testpypi sdk/dist/*
```
