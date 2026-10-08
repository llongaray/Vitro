from __future__ import annotations

from pathlib import Path

from sqlalchemy import text

from app.core.config import get_settings
from app.core.redis import get_redis
from app.database.session import engine


async def check_database() -> bool:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def check_redis() -> bool:
    try:
        return bool(await get_redis().ping())
    except Exception:
        return False


async def check_storage() -> bool:
    try:
        root = Path(get_settings().storage_path)
        root.mkdir(parents=True, exist_ok=True)
        probe = root / ".health"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True
    except Exception:
        return False
