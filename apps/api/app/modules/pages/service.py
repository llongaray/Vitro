from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.pages.models import Page
from app.modules.audit.service import record_audit
from app.modules.seo.service import record_redirect
from app.services.invalidate import invalidate_tenant
from app.services.slug import resolve_slug


async def list_pages(session: AsyncSession, tenant_id: uuid.UUID) -> list[Page]:
    return list(await session.scalars(select(Page).where(Page.tenant_id == tenant_id, Page.deleted_at.is_(None)).order_by(Page.title)))


async def get_page(session: AsyncSession, tenant_id: uuid.UUID, page_id: uuid.UUID) -> Page:
    row = await session.scalar(select(Page).where(Page.id == page_id, Page.tenant_id == tenant_id, Page.deleted_at.is_(None)))
    if row is None:
        raise HTTPException(status_code=404, detail="Página não encontrada")
    return row


async def create_page(session: AsyncSession, tenant_id: uuid.UUID, data) -> Page:
    row = Page(
        tenant_id=tenant_id,
        title=data.title.strip(),
        slug=await resolve_slug(session, Page, tenant_id, data.slug, data.title),
        content=data.content,
        kind=data.kind,
        published=data.published,
        seo_title=data.seo_title,
        seo_description=data.seo_description,
    )
    session.add(row)
    try:
        await session.flush()
        await record_audit(session, "create", "page", row.id, None, {"title": row.title, "slug": row.slug})
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Slug já utilizado nesta loja") from exc
    await session.refresh(row)
    await invalidate_tenant(session, tenant_id)
    return row


async def update_page(session: AsyncSession, tenant_id: uuid.UUID, page_id: uuid.UUID, data) -> Page:
    row = await get_page(session, tenant_id, page_id)
    payload = data.model_dump(exclude_unset=True)
    if "title" in payload and payload["title"]:
        row.title = payload["title"].strip()
    if "slug" in payload and payload["slug"]:
        previous = row.slug
        row.slug = await resolve_slug(session, Page, tenant_id, payload["slug"], row.title, exclude_id=row.id)
        await record_redirect(session, tenant_id, f"/pagina/{previous}", f"/pagina/{row.slug}")
    for field in ("content", "kind", "published", "seo_title", "seo_description"):
        if field in payload:
            setattr(row, field, payload[field])
    await record_audit(session, "update", "page", row.id, None, payload)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Slug já utilizado nesta loja") from exc
    await session.refresh(row)
    await invalidate_tenant(session, tenant_id)
    return row


async def delete_page(session: AsyncSession, tenant_id: uuid.UUID, page_id: uuid.UUID) -> None:
    row = await get_page(session, tenant_id, page_id)
    row.deleted_at = datetime.now(UTC)
    row.published = False
    await record_audit(session, "delete", "page", row.id, {"title": row.title}, None)
    await session.commit()
    await invalidate_tenant(session, tenant_id)


async def count_pages(session: AsyncSession, tenant_id: uuid.UUID) -> int:
    return int(await session.scalar(select(func.count()).select_from(Page).where(Page.tenant_id == tenant_id, Page.deleted_at.is_(None))) or 0)
