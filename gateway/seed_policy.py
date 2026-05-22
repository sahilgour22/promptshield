"""Seed the default policy into the database."""
import asyncio
import os
import uuid
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

with open("app/policy/default_policy.yaml") as f:
    yaml_content = f.read()

INSERT_SQL = """
    INSERT INTO policies (id, name, yaml_content, is_active)
    VALUES ($1, $2, $3, true)
    ON CONFLICT DO NOTHING
"""


async def seed() -> None:
    import asyncpg

    conn = await asyncpg.connect(
        host=host, port=port, database=db, user=user, password=password
    )
    try:
        await conn.execute(INSERT_SQL, uuid.uuid4(), "default", yaml_content)
        count = await conn.fetchval("SELECT COUNT(*) FROM policies")
        print(f"Policies in DB: {count}")
    finally:
        await conn.close()


asyncio.run(seed())
