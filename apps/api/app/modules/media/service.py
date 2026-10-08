from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.media.models import Media
from app.providers.storage import get_storage, media_url
from app.services.images import ImageRejected, process_image
from app.services.invalidate import invalidate_tenant

FOLDERS = {"products", "banners", "pages", "uploads"}


async def save_upload(session: AsyncSession, tenant_id: uuid.UUID, upload: UploadFile, folder: str, alt_text: str | None = None) -> Media:
    if folder not in FOLDERS:
        raise HTTPException(status_code=422, detail="Pasta de mídia inválida")
    data = await upload.read()
    settings = get_settings()
    try:
        main, thumb, width, height, digest = process_image(
            data,
            upload.filename or "",
            upload.content_type,
            settings.upload_max_bytes,
            settings.image_max_edge,
            settings.image_thumb_edge,
        )
    except ImageRejected as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    relative = f"tenants/{tenant_id}/{folder}/{digest}.webp"
    thumb_relative = f"tenants/{tenant_id}/{folder}/{digest}_thumb.webp"
    storage = get_storage()
    await storage.save(relative, main)
    await storage.save(thumb_relative, thumb)
    row = Media(
        tenant_id=tenant_id,
        provider="local",
        path=relative,
        thumb_path=thumb_relative,
        mime_type="image/webp",
        size=len(main),
        width=width,
        height=height,
        hash=digest,
        alt_text=alt_text,
        created_at=datetime.now(UTC),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await invalidate_tenant(session, tenant_id)
    return row


def media_out(row: Media) -> dict:
    return {
        "id": row.id,
        "url": media_url(row.path),
        "thumb_url": media_url(row.thumb_path),
        "alt_text": row.alt_text,
        "width": row.width,
        "height": row.height,
        "mime_type": row.mime_type,
    }
