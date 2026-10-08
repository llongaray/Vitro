from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.banners.models import Banner
from app.modules.audit.service import record_audit
from app.modules.media.models import Media
from app.providers.storage import media_url
from app.services.invalidate import invalidate_tenant


async def _media_map(session: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, Media]:
    if not ids:
        return {}
    rows = await session.scalars(select(Media).where(Media.id.in_(ids)))
    return {row.id: row for row in rows}


def serialize_banner(row: Banner, media: dict[uuid.UUID, Media]) -> dict:
    desktop = media.get(row.desktop_media_id) if row.desktop_media_id else None
    mobile = media.get(row.mobile_media_id) if row.mobile_media_id else None
    return {
        "id": row.id,
        "title": row.title,
        "url": row.url,
        "position": row.position,
        "start_at": row.start_at,
        "end_at": row.end_at,
        "order": row.sort_order,
        "active": row.active,
        "desktop_media_id": row.desktop_media_id,
        "mobile_media_id": row.mobile_media_id,
        "desktop_url": media_url(desktop.path) if desktop else None,
        "mobile_url": media_url(mobile.path) if mobile else None,
    }


async def list_banners(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = list(
        await session.scalars(
            select(Banner).where(Banner.tenant_id == tenant_id, Banner.deleted_at.is_(None)).order_by(Banner.sort_order, Banner.created_at)
        )
    )
    media = await _media_map(session, {item for row in rows for item in (row.desktop_media_id, row.mobile_media_id) if item})
    return [serialize_banner(row, media) for row in rows]


async def _owned_media(session: AsyncSession, tenant_id: uuid.UUID, media_id: uuid.UUID | None) -> None:
    if media_id is None:
        return
    row = await session.scalar(select(Media.id).where(Media.id == media_id, Media.tenant_id == tenant_id))
    if row is None:
        raise HTTPException(status_code=422, detail="Mídia inválida")


async def create_banner(session: AsyncSession, tenant_id: uuid.UUID, data) -> dict:
    await _owned_media(session, tenant_id, data.desktop_media_id)
    await _owned_media(session, tenant_id, data.mobile_media_id)
    row = Banner(
        tenant_id=tenant_id,
        title=data.title.strip(),
        desktop_media_id=data.desktop_media_id,
        mobile_media_id=data.mobile_media_id,
        url=data.url,
        position=data.position,
        start_at=data.start_at,
        end_at=data.end_at,
        sort_order=data.order,
        active=data.active,
    )
    session.add(row)
    await session.flush()
    await record_audit(session, "create", "banner", row.id, None, {"title": row.title, "position": row.position})
    await session.commit()
    await session.refresh(row)
    await invalidate_tenant(session, tenant_id)
    media = await _media_map(session, {item for item in (row.desktop_media_id, row.mobile_media_id) if item})
    return serialize_banner(row, media)


async def update_banner(session: AsyncSession, tenant_id: uuid.UUID, banner_id: uuid.UUID, data) -> dict:
    row = await session.scalar(select(Banner).where(Banner.id == banner_id, Banner.tenant_id == tenant_id, Banner.deleted_at.is_(None)))
    if row is None:
        raise HTTPException(status_code=404, detail="Banner não encontrado")
    payload = data.model_dump(exclude_unset=True)
    if "desktop_media_id" in payload:
        await _owned_media(session, tenant_id, payload["desktop_media_id"])
        row.desktop_media_id = payload["desktop_media_id"]
    if "mobile_media_id" in payload:
        await _owned_media(session, tenant_id, payload["mobile_media_id"])
        row.mobile_media_id = payload["mobile_media_id"]
    if "title" in payload and payload["title"]:
        row.title = payload["title"].strip()
    for field in ("url", "position", "start_at", "end_at", "active"):
        if field in payload:
            setattr(row, field, payload[field])
    if "order" in payload:
        row.sort_order = payload["order"]
    await record_audit(session, "update", "banner", row.id, None, payload)
    await session.commit()
    await invalidate_tenant(session, tenant_id)
    media = await _media_map(session, {item for item in (row.desktop_media_id, row.mobile_media_id) if item})
    return serialize_banner(row, media)


async def delete_banner(session: AsyncSession, tenant_id: uuid.UUID, banner_id: uuid.UUID) -> None:
    row = await session.scalar(select(Banner).where(Banner.id == banner_id, Banner.tenant_id == tenant_id, Banner.deleted_at.is_(None)))
    if row is None:
        raise HTTPException(status_code=404, detail="Banner não encontrado")
    row.deleted_at = datetime.now(UTC)
    row.active = False
    await record_audit(session, "delete", "banner", row.id, {"title": row.title}, None)
    await session.commit()
    await invalidate_tenant(session, tenant_id)


async def count_banners(session: AsyncSession, tenant_id: uuid.UUID) -> int:
    return int(await session.scalar(select(func.count()).select_from(Banner).where(Banner.tenant_id == tenant_id, Banner.deleted_at.is_(None))) or 0)
