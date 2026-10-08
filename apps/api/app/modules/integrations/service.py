from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.modules.integrations.models import ApiKey, Integration
from app.modules.tenants.models import Tenant
from app.services.invalidate import invalidate_tenant
from app.services.secrets import encrypt_secret

PROVIDERS = ("ga4", "meta_pixel", "gtm", "search_console")


def serialize_integration(row: Integration) -> dict:
    return {"id": row.id, "provider": row.provider, "public_id": row.public_id, "enabled": row.enabled}


class IntegrationIn(BaseModel):
    public_id: str = Field(min_length=1, max_length=160)
    enabled: bool = True
    secret: str | None = Field(default=None, max_length=400)


async def list_integrations(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = await session.scalars(select(Integration).where(Integration.tenant_id == tenant_id).order_by(Integration.provider))
    return [serialize_integration(row) for row in rows]


async def public_integrations(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = await session.scalars(
        select(Integration).where(Integration.tenant_id == tenant_id, Integration.enabled.is_(True)).order_by(Integration.provider)
    )
    return [{"provider": row.provider, "public_id": row.public_id} for row in rows]


async def upsert_integration(session: AsyncSession, tenant: Tenant, provider: str, data: IntegrationIn) -> dict:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=422, detail="Integração desconhecida")
    row = await session.scalar(select(Integration).where(Integration.tenant_id == tenant.id, Integration.provider == provider))
    secret = encrypt_secret(data.secret) if data.secret else None
    if row is None:
        row = Integration(
            tenant_id=tenant.id,
            provider=provider,
            public_id=data.public_id.strip(),
            secret_encrypted=secret,
            enabled=data.enabled,
        )
        session.add(row)
    else:
        row.public_id = data.public_id.strip()
        row.enabled = data.enabled
        if secret is not None:
            row.secret_encrypted = secret
    await session.commit()
    await session.refresh(row)
    await invalidate_tenant(session, tenant.id)
    return serialize_integration(row)


async def delete_integration(session: AsyncSession, tenant: Tenant, provider: str) -> None:
    row = await session.scalar(select(Integration).where(Integration.tenant_id == tenant.id, Integration.provider == provider))
    if row is None:
        raise HTTPException(status_code=404, detail="Integração não encontrada")
    await session.delete(row)
    await session.commit()
    await invalidate_tenant(session, tenant.id)


def serialize_key(row: ApiKey) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "prefix": row.prefix,
        "last_used_at": row.last_used_at,
        "revoked_at": row.revoked_at,
        "created_at": row.created_at,
    }


class ApiKeyIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


async def list_api_keys(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = await session.scalars(select(ApiKey).where(ApiKey.tenant_id == tenant_id).order_by(ApiKey.created_at.desc()))
    return [serialize_key(row) for row in rows]


async def create_api_key(session: AsyncSession, tenant_id: uuid.UUID, name: str) -> dict:
    raw = f"vtr_{secrets.token_urlsafe(32)}"
    row = ApiKey(tenant_id=tenant_id, name=name.strip(), prefix=raw[:12], key_hash=hash_token(raw))
    session.add(row)
    await session.commit()
    await session.refresh(row)
    payload = serialize_key(row)
    payload["key"] = raw
    return payload


async def revoke_api_key(session: AsyncSession, tenant_id: uuid.UUID, key_id: uuid.UUID) -> dict:
    row = await session.get(ApiKey, key_id)
    if row is None or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Chave não encontrada")
    row.revoked_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(row)
    return serialize_key(row)
