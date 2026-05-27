# Stage 1: build dependencies into a venv
FROM python:3.11-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir hatchling

COPY pyproject.toml .
COPY app/ app/

RUN pip install --no-cache-dir --prefix=/install .

# Stage 2: lean runtime image
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .

# Non-root user for security
RUN useradd -r -u 1000 appuser && chown -R appuser /app
USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
