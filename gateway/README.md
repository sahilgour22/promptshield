# gateway/

FastAPI detection engine — the core of PromptShield.

## What it does

- Receives inspection requests from the SDK (or directly via HTTP)
- Runs the detector ensemble against the content
- Evaluates results against the active YAML policy
- Returns a verdict (`block` / `sanitize` / `log_only` / `allow`) with reasoning
- Persists incidents to Postgres asynchronously
- Broadcasts incidents + stats to the dashboard over WebSocket

## Quick start

```bash
# Install dependencies (requires uv — https://docs.astral.sh/uv/)
uv sync

# Configure
cp .env.example .env
# Required: DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/promptshield

# Create tables
uv run alembic upgrade head

# Seed the default detection policy
uv run python seed_policy.py

# Start (dev)
uv run uvicorn app.main:app --reload --port 8000

# Start (prod)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/inspect` | Submit content for threat analysis |
| `GET` | `/v1/policies` | List all policies |
| `POST` | `/v1/policies` | Create and activate a new policy |
| `GET` | `/incidents` | List incidents (dashboard) |
| `GET` | `/stats/today` | Aggregated stats for today |
| `WS` | `/ws/incidents` | Live incident stream |
| `GET` | `/metrics` | Prometheus exposition format |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Interactive API docs (Swagger) |

## Environment variables

| Variable | Default | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql+asyncpg://...` | Yes |
| `ENVIRONMENT` | `development` | No |
| `LOG_LEVEL` | `INFO` | No |
| `AZURE_OPENAI_ENDPOINT` | — | No |
| `AZURE_OPENAI_API_KEY` | — | No |
| `AZURE_OPENAI_DEPLOYMENT` | — | No |

## Architecture

```
app/
├── main.py              # FastAPI factory, middleware, lifespan
├── config.py            # Pydantic settings (reads .env)
├── db.py                # Async SQLAlchemy engine + session factory
├── models.py            # ORM models: Incident, Policy, Request
├── schemas.py           # Pydantic response schemas
├── logging_config.py    # Structlog JSON/console logging
├── detectors/
│   ├── base.py          # BaseDetector ABC + DetectionResult
│   ├── regex_detector.py # 30+ regex patterns across 4 categories
│   └── runner.py        # DetectorRunner orchestrator
├── policy/
│   ├── engine.py        # YAML rule evaluator
│   ├── loader.py        # Load active policy from DB
│   └── default_policy.yaml
└── routers/
    ├── inspect.py       # POST /v1/inspect
    ├── dashboard.py     # /incidents, /policies, /stats/*
    ├── ws.py            # WebSocket /ws/incidents
    └── metrics.py       # GET /metrics (Prometheus)
```

## Adding a detector

1. Subclass `BaseDetector` in `app/detectors/`
2. Implement `async def detect(self, content: str) -> DetectionResult`
3. Add an instance to `DetectorRunner._detectors` in `runner.py`

The runner picks the result with the highest score across all detectors.

## Policy format

```yaml
rules:
  - id: "block-injection"
    description: "Block high-confidence direct injection"
    when:
      attack_type: "direct_injection"
      score: ">= 0.8"
    action: "block"
    severity: "critical"
default_action: "allow"
```

Valid actions: `block`, `sanitize`, `log_only`, `allow`
Valid severities: `critical`, `high`, `medium`, `low`, `info`
