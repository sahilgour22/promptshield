"""One-shot migration script: creates all tables in Supabase via asyncpg."""
import asyncio
import os
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv

load_dotenv()

raw_url = os.environ["DATABASE_URL"]
parsed = urlparse(raw_url)
host = parsed.hostname
port = parsed.port or 5432
db = parsed.path.lstrip("/")
user = unquote(parsed.username)
password = unquote(parsed.password)
print(f"Connecting to {host}:{port}/{db} as {user}…")

DDL_STATEMENTS = [
    "CREATE TYPE IF NOT EXISTS direction AS ENUM ('input', 'output')",
    "CREATE TYPE IF NOT EXISTS attacktype AS ENUM ('direct_injection','indirect_injection','data_exfiltration','jailbreak','none')",
    "CREATE TYPE IF NOT EXISTS severity AS ENUM ('critical','high','medium','low','info')",
    "CREATE TYPE IF NOT EXISTS verdict AS ENUM ('block','sanitize','allow','log_only')",
    """CREATE TABLE IF NOT EXISTS requests (
        id UUID PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        agent_name TEXT NOT NULL,
        final_verdict verdict NOT NULL,
        total_latency_ms INTEGER NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'
    )""",
    """CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        request_id UUID NOT NULL,
        direction direction NOT NULL,
        attack_type attacktype NOT NULL,
        severity severity NOT NULL,
        score FLOAT NOT NULL,
        verdict verdict NOT NULL,
        detector_name TEXT NOT NULL,
        matched_patterns JSONB NOT NULL DEFAULT '{}',
        raw_content TEXT NOT NULL,
        sanitized_content TEXT,
        llm_judge_reasoning TEXT,
        latency_ms INTEGER NOT NULL,
        policy_rule_id TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS ix_incidents_request_id ON incidents (request_id)",
    """CREATE TABLE IF NOT EXISTS policies (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        yaml_content TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )""",
    "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)",
    "INSERT INTO alembic_version (version_num) VALUES ('0001') ON CONFLICT DO NOTHING",
]

# Enums need special handling — CREATE TYPE IF NOT EXISTS isn't valid in older Postgres
ENUM_DDL = [
    ("direction", "input, output"),
    ("attacktype", "direct_injection, indirect_injection, data_exfiltration, jailbreak, none"),
    ("severity", "critical, high, medium, low, info"),
    ("verdict", "block, sanitize, allow, log_only"),
]


async def migrate() -> None:
    import asyncpg

    conn = await asyncpg.connect(
        host=host, port=port, database=db, user=user, password=password
    )
    try:
        for name, values in ENUM_DDL:
            await conn.execute(f"""
                DO $$ BEGIN
                    CREATE TYPE {name} AS ENUM ({', '.join(f"'{v.strip()}'" for v in values.split(','))});
                EXCEPTION WHEN duplicate_object THEN null;
                END $$;
            """)
            print(f"  enum {name} OK")

        for stmt in DDL_STATEMENTS:
            if stmt.startswith("CREATE TYPE"):
                continue
            await conn.execute(stmt)
            first_line = stmt.strip().split("\n")[0][:60]
            print(f"  {first_line} OK")

        print("\nMigration complete.")
    finally:
        await conn.close()


asyncio.run(migrate())
