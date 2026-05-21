# PromptShield

AI security gateway — detects prompt injection and data exfiltration in real time.

## Structure

| Directory | Purpose |
|-----------|---------|
| `gateway/` | FastAPI backend — detection engine, policy engine, audit log |
| `dashboard/` | Next.js 14 dashboard — real-time incidents, analytics |
| `sdk/` | Python SDK — wraps gateway for agent developers |
| `victim-agent/` | Demo target agent for live attack demos |
| `attacks/` | Demo attack scripts |

## Quick Start

### Gateway

```bash
cd gateway
uv sync
cp .env.example .env   # fill in values
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Health check: `curl http://localhost:8000/health`

## Stack

- **Backend**: FastAPI + asyncpg + SQLAlchemy 2.0 async
- **Detection**: ProtectAI deberta-v3-base-prompt-injection-v2 + regex heuristics
- **LLM judge**: Azure OpenAI gpt-4o-mini
- **DB**: Postgres (Supabase)
- **Frontend**: Next.js 14 + Tailwind + shadcn/ui + Recharts
- **Hosting**: Azure Container Apps + Vercel
