from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import enforce_rate_limit
from app.core.security import hash_token
from app.database.session import get_session
from app.modules.integrations.models import ApiKey
from app.modules.pages.models import Page
from app.modules.public.service import list_public_categories, list_public_products
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/external", tags=["external"])


async def tenant_from_key(
    x_api_key: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> Tenant:
    if not x_api_key or not x_api_key.startswith("vtr_"):
        raise HTTPException(status_code=401, detail="Chave ausente")
    row = await session.scalar(select(ApiKey).where(ApiKey.key_hash == hash_token(x_api_key), ApiKey.revoked_at.is_(None)))
    if row is None:
        raise HTTPException(status_code=401, detail="Chave inválida")
    await enforce_rate_limit(f"rl:external:{row.prefix}", 60, 60)
    row.last_used_at = datetime.now(UTC)
    tenant = await session.get(Tenant, row.tenant_id)
    await session.commit()
    if tenant is None:
        raise HTTPException(status_code=401, detail="Chave inválida")
    return tenant


@router.get("/products")
async def external_products(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=24, ge=1, le=100),
    tenant: Tenant = Depends(tenant_from_key),
    session: AsyncSession = Depends(get_session),
):
    return await list_public_products(session, tenant, q=None, category=None, page=page, limit=limit, sort="recent")


@router.get("/categories")
async def external_categories(tenant: Tenant = Depends(tenant_from_key), session: AsyncSession = Depends(get_session)):
    return await list_public_categories(session, tenant)


@router.get("/pages")
async def external_pages(tenant: Tenant = Depends(tenant_from_key), session: AsyncSession = Depends(get_session)):
    rows = await session.scalars(
        select(Page).where(Page.tenant_id == tenant.id, Page.deleted_at.is_(None), Page.published.is_(True)).order_by(Page.title)
    )
    return [{"title": row.title, "slug": row.slug} for row in rows]
