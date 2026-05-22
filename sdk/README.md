# sdk/

Python SDK for PromptShield — wrap any LLM agent in three lines.

## What it does

Intercepts all input and output flowing through your agent and forwards it to the
PromptShield Gateway for real-time threat analysis. If an attack is detected, raises
`BlockedByShield` before the content reaches the model (or before the response is
returned to your code).

## Installation

```bash
pip install promptshield
# or from source:
pip install -e ./sdk
```

## Usage

### Wrap an OpenAI client

```python
import openai
from promptshield import Shield

client = openai.AsyncOpenAI(api_key="...")
shield = Shield(api_key="your-key", endpoint="http://localhost:8000")

safe_client = shield.wrap(client)

# Use exactly like the normal client — attacks are intercepted transparently
response = await safe_client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": user_input}],
)
```

### Wrap an Anthropic client

```python
import anthropic
from promptshield import Shield

client = anthropic.AsyncAnthropic(api_key="...")
shield = Shield(api_key="your-key", endpoint="http://localhost:8000")
safe_client = shield.wrap(client)
```

### Wrap a LangChain agent

```python
from langchain.agents import AgentExecutor
from promptshield import Shield

agent_executor = AgentExecutor(agent=..., tools=...)
shield = Shield(api_key="your-key", endpoint="http://localhost:8000")
safe_agent = shield.wrap(agent_executor)

result = await safe_agent.ainvoke({"input": user_input})
```

### Handling blocked requests

```python
from promptshield.exceptions import BlockedByShield

try:
    response = await safe_client.chat.completions.create(...)
except BlockedByShield as e:
    print(f"Attack blocked: {e.result.attack_type} (score: {e.result.score})")
    # e.result is a DetectionResult with full details
```

## Configuration

```python
shield = Shield(
    api_key="your-key",           # passed as X-API-Key header
    endpoint="http://localhost:8000",
    fail_mode="fail_open",        # "fail_open" | "fail_closed"
    on_detection=my_callback,     # optional: called on every detection event
)
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `api_key` | — | Gateway API key (X-API-Key header) |
| `endpoint` | `http://localhost:8000` | Gateway base URL |
| `fail_mode` | `fail_open` | What to do if the gateway is unreachable |
| `on_detection` | `None` | Callback `(DetectionResult) -> None` on any non-allow verdict |

## Environment variables

| Variable | Description |
|----------|-------------|
| `PROMPTSHIELD_ENDPOINT` | Overrides `endpoint` parameter |
| `PROMPTSHIELD_API_KEY` | Overrides `api_key` parameter |

## Package structure

```
promptshield/
├── __init__.py       # Re-exports: Shield, BlockedByShield, DetectionResult
├── client.py         # Shield class — inspect() and wrap()
├── wrappers.py       # Transparent wrappers for OpenAI, Anthropic, LangChain
├── models.py         # DetectionResult Pydantic model
└── exceptions.py     # BlockedByShield, ShieldUnavailable
```
