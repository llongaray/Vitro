from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import Ad
from app.modules.audit.service import record_audit
from app.modules.media.models import Media
from app.modules.notices.modules_service import module_enabled
from app.providers.storage import media_url
from app.services.invalidate import invalidate_tenant

POSITIONS = {"HOME_TOP", "HOME_MIDDLE", "CATALOG_TOP", "PRODUCT_PAGE", "SIDEBAR"}


class AdIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    url: str | None = None
    media_id: uuid.UUID | None = None
    position: str
    start_at: datetime | None = None
    end_at: datetime | None = None
    active: bool = True


class AdUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    url: str | None = None
    media_id: uuid.UUID | None = None
    position: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    active: bool | None = None


def _check_position(position: str) -> None:
    if position not in POSITIONS:
        raise HTTPException(status_code=422, detail="Posição inválida")


async def _image(session: AsyncSession, media_id: uuid.UUID | None) -> str | None:
    if media_id is None:
        return None
    media = await session.get(Media, media_id)
    if media is None:
        return None
    return media_url(media.path)


def serialize_ad(row: Ad, image: str | None) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "url": row.url,
        "media_id": row.media_id,
        "image_url": image,
        "position": row.position,
        "start_at": row.start_at,
        "end_at": row.end_at,
        "active": row.active,
    }


async def require_ads(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    if not await module_enabled(session, tenant_id, "ads"):
        raise HTTPException(status_code=404, detail="Recurso indisponível")


async def list_ads(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    await require_ads(session, tenant_id)
    rows = list(await session.scalars(select(Ad).where(Ad.tenant_id == tenant_id).order_by(Ad.created_at.desc())))
    return [serialize_ad(row, await _image(session, row.media_id)) for row in rows]


async def create_ad(session: AsyncSession, tenant_id: uuid.UUID, data: AdIn) -> dict:
    await require_ads(session, tenant_id)
    _check_position(data.position)
    row = Ad(
        tenant_id=tenant_id,
        title=data.title.strip(),
        url=(data.url or "").strip() or None,
        media_id=data.media_id,
        position=data.position,
        start_at=data.start_at,
        end_at=data.end_at,
        active=data.active,
    )
    session.add(row)
    await session.flush()
    await record_audit(session, "create", "ad", row.id, None, {"title": row.title, "position": row.position, "active": row.active})
    await session.commit()
    await session.refresh(row)
    await invalidate_tenant(session, tenant_id)
    return serialize_ad(row, await _image(session, row.media_id))


async def update_ad(session: AsyncSession, tenant_id: uuid.UUID, ad_id: uuid.UUID, data: AdUpdate) -> dict:
    await require_ads(session, tenant_id)
    row = await session.get(Ad, ad_id)
    if row is None or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Anúncio não encontrado")
    payload = data.model_dump(exclude_unset=True)
    if "position" in payload and payload["position"] is not None:
        _check_position(payload["position"])
    previous = {"title": row.title, "position": row.position, "active": row.active, "url": row.url}
    if "title" in payload and payload["title"]:
        row.title = payload["title"].strip()
    if "url" in payload:
        row.url = (payload["url"] or "").strip() or None
    if "media_id" in payload:
        row.media_id = payload["media_id"]
    if "position" in payload and payload["position"]:
        row.position = payload["position"]
    if "start_at" in payload:
        row.start_at = payload["start_at"]
    if "end_at" in payload:
        row.end_at = payload["end_at"]
    if "active" in payload:
        row.active = payload["active"]
    await record_audit(session, "update", "ad", row.id, previous, {"title": row.title, "position": row.position, "active": row.active, "url": row.url})
    await session.commit()
    await invalidate_tenant(session, tenant_id)
    return serialize_ad(row, await _image(session, row.media_id))


async def delete_ad(session: AsyncSession, tenant_id: uuid.UUID, ad_id: uuid.UUID) -> None:
    await require_ads(session, tenant_id)
    row = await session.get(Ad, ad_id)
    if row is None or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Anúncio não encontrado")
    await record_audit(session, "delete", "ad", row.id, {"title": row.title}, None)
    await session.delete(row)
    await session.commit()
    await invalidate_tenant(session, tenant_id)


async def public_ads(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    if not await module_enabled(session, tenant_id, "ads"):
        return []
    now = datetime.now(UTC)
    rows = list(
        await session.scalars(
            select(Ad).where(
                Ad.tenant_id == tenant_id,
                Ad.active.is_(True),
                or_(Ad.start_at.is_(None), Ad.start_at <= now),
                or_(Ad.end_at.is_(None), Ad.end_at >= now),
            )
        )
    )
    return [
        {"id": str(row.id), "title": row.title, "url": row.url, "position": row.position, "image_url": await _image(session, row.media_id)}
        for row in rows
    ]
