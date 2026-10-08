from __future__ import annotations

import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import app_logger, log_json
from app.modules.tenants.models import Domain
from app.services.cache import delete_prefix


async def revalidate_tenant(hostname: str) -> None:
    settings = get_settings()
    url = f"{settings.site_internal_url.rstrip('/')}/api/revalidate"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                url,
                json={"tag": f"tenant:{hostname}"},
                headers={"x-revalidate-secret": settings.revalidate_secret},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        log_json(app_logger, "warning", "revalidate_failed", hostname=hostname)


async def invalidate_tenant(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    await delete_prefix(f"tenant:{tenant_id}:")
    hostname = await session.scalar(select(Domain.hostname).where(Domain.tenant_id == tenant_id, Domain.is_primary.is_(True)))
    if hostname:
        await revalidate_tenant(hostname)
