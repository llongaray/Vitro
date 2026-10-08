from __future__ import annotations

import json

from app.core.redis import get_redis


async def cache_get(key: str) -> dict | list | None:
    raw = await get_redis().get(key)
    if not raw:
        return None
    return json.loads(raw)


async def cache_set(key: str, value: dict | list, ttl: int = 60) -> None:
    await get_redis().set(key, json.dumps(value, ensure_ascii=False), ex=ttl)


async def delete_prefix(prefix: str) -> None:
    redis = get_redis()
    keys = [key async for key in redis.scan_iter(match=f"{prefix}*")]
    if keys:
        await redis.delete(*keys)
