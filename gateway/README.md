# PromptShield Gateway

FastAPI backend for the PromptShield AI security gateway.

## Setup

```bash
# Install dependencies (requires uv)
uv sync

# Configure environment
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL and Azure OpenAI credentials

# Run database migrations
uv run alembic upgrade head

# Start dev server
uv run uvicorn app.main:app --reload
```

## Verify

```bash
curl http://localhost:8000/health
# {"status":"ok","version":"0.1.0"}
```

## Tests

```bash
uv run pytest
```
