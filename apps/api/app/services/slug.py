from __future__ import annotations

import re
import unicodedata

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = _NON_ALNUM.sub("-", normalized.lower()).strip("-")
    return slug[:80] or "item"


async def unique_slug(session: AsyncSession, model, tenant_id, source: str, exclude_id=None) -> str:
    base = slugify(source)
    candidate = base
    suffix = 2
    while True:
        stmt = select(model.id).where(model.tenant_id == tenant_id, model.slug == candidate, model.deleted_at.is_(None))
        if exclude_id is not None:
            stmt = stmt.where(model.id != exclude_id)
        found = await session.scalar(stmt)
        if found is None:
            return candidate
        candidate = f"{base[:70].rstrip('-')}-{suffix}"
        suffix += 1


async def resolve_slug(session: AsyncSession, model, tenant_id, requested: str | None, fallback: str, exclude_id=None) -> str:
    if requested:
        slug = slugify(requested)
        stmt = select(model.id).where(model.tenant_id == tenant_id, model.slug == slug, model.deleted_at.is_(None))
        if exclude_id is not None:
            stmt = stmt.where(model.id != exclude_id)
        if await session.scalar(stmt) is not None:
            raise HTTPException(status_code=409, detail="Slug já utilizado nesta loja")
        return slug
    return await unique_slug(session, model, tenant_id, fallback, exclude_id=exclude_id)
