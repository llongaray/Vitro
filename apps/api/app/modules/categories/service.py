from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.service import record_audit
from app.modules.categories.models import Category
from app.modules.seo.service import record_redirect
from app.services.invalidate import invalidate_tenant
from app.services.slug import resolve_slug


async def list_categories(session: AsyncSession, tenant_id: uuid.UUID) -> list[Category]:
    result = await session.scalars(
        select(Category)
        .where(Category.tenant_id == tenant_id, Category.deleted_at.is_(None))
        .order_by(Category.sort_order, Category.name)
    )
    return list(result)


async def get_category(session: AsyncSession, tenant_id: uuid.UUID, category_id: uuid.UUID) -> Category:
    row = await session.scalar(
        select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id, Category.deleted_at.is_(None))
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return row


async def create_category(session: AsyncSession, tenant_id: uuid.UUID, data) -> Category:
    slug = await resolve_slug(session, Category, tenant_id, data.slug, data.name)
    row = Category(tenant_id=tenant_id, name=data.name.strip(), slug=slug, description=data.description, is_active=data.is_active, sort_order=data.sort_order, seo_title=data.seo_title, seo_description=data.seo_description)
    session.add(row)
    try:
        await session.flush()
        await record_audit(session, "create", "category", row.id, None, {"name": row.name, "slug": row.slug})
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Slug já utilizado nesta loja") from exc
    await session.refresh(row)
    await invalidate_tenant(session, tenant_id)
    return row


async def update_category(session: AsyncSession, tenant_id: uuid.UUID, category_id: uuid.UUID, data) -> Category:
    row = await get_category(session, tenant_id, category_id)
    payload = data.model_dump(exclude_unset=True)
    if "name" in payload and payload["name"]:
        row.name = payload["name"].strip()
    if "slug" in payload and payload["slug"]:
        previous = row.slug
        row.slug = await resolve_slug(session, Category, tenant_id, payload["slug"], row.name, exclude_id=row.id)
        await record_redirect(session, tenant_id, f"/categorias/{previous}", f"/categorias/{row.slug}")
    for field in ("description", "is_active", "sort_order", "seo_title", "seo_description"):
        if field in payload:
            setattr(row, field, payload[field])
    await record_audit(session, "update", "category", row.id, None, payload)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Slug já utilizado nesta loja") from exc
    await session.refresh(row)
    await invalidate_tenant(session, tenant_id)
    return row


async def delete_category(session: AsyncSession, tenant_id: uuid.UUID, category_id: uuid.UUID) -> None:
    row = await get_category(session, tenant_id, category_id)
    row.deleted_at = datetime.now(UTC)
    row.is_active = False
    await record_audit(session, "delete", "category", row.id, {"name": row.name}, None)
    await session.commit()
    await invalidate_tenant(session, tenant_id)


async def count_categories(session: AsyncSession, tenant_id: uuid.UUID) -> int:
    return int(await session.scalar(select(func.count()).select_from(Category).where(Category.tenant_id == tenant_id, Category.deleted_at.is_(None))) or 0)
