from __future__ import annotations

import re
import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.tenants.models import Domain, Tenant
from app.services.dns import lookup_txt

_HOST = re.compile(r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def serialize_domain(domain: Domain) -> dict:
    return {
        "id": domain.id,
        "hostname": domain.hostname,
        "is_primary": domain.is_primary,
        "verified": domain.verified,
        "verification_token": domain.verification_token,
        "dns_name": f"_vitrio-challenge.{domain.hostname}",
        "created_at": domain.created_at,
    }


def normalize_hostname(value: str) -> str:
    host = value.strip().lower().rstrip(".")
    if "://" in host or "/" in host:
        raise HTTPException(status_code=422, detail="Informe só o hostname")
    if ":" in host:
        raise HTTPException(status_code=422, detail="Informe o hostname sem porta")
    if not _HOST.match(host) or len(host) > 253:
        raise HTTPException(status_code=422, detail="Hostname inválido")
    return host


async def list_domains(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = await session.scalars(select(Domain).where(Domain.tenant_id == tenant_id).order_by(Domain.created_at))
    return [serialize_domain(row) for row in rows]


async def create_domain(session: AsyncSession, tenant: Tenant, hostname: str) -> dict:
    host = normalize_hostname(hostname)
    settings = get_settings()
    suffix = f".{settings.base_domain}"
    if host == settings.base_domain or host.endswith(suffix):
        slug = "" if host == settings.base_domain else host[: -len(suffix)]
        owner = await session.scalar(select(Tenant).where(Tenant.slug == slug)) if slug else None
        if owner is not None and owner.id != tenant.id:
            raise HTTPException(status_code=409, detail="Esse hostname é o subdomínio de outra loja")
        if owner is not None:
            raise HTTPException(status_code=409, detail="O subdomínio da plataforma já está ativo")
        raise HTTPException(status_code=409, detail="Hostname reservado ao subdomínio da plataforma")
    existing = await session.scalar(select(Domain).where(Domain.hostname == host))
    if existing is not None:
        detail = "Hostname já usado por outra loja" if existing.tenant_id != tenant.id else "Hostname já cadastrado"
        raise HTTPException(status_code=409, detail=detail)
    domain = Domain(
        tenant_id=tenant.id,
        hostname=host,
        is_primary=False,
        verified=False,
        verification_token=secrets.token_urlsafe(24),
        created_at=datetime.now(UTC),
    )
    session.add(domain)
    await session.commit()
    await session.refresh(domain)
    return serialize_domain(domain)


async def _owned(session: AsyncSession, tenant_id: uuid.UUID, domain_id: uuid.UUID) -> Domain:
    domain = await session.get(Domain, domain_id)
    if domain is None or domain.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Domínio não encontrado")
    return domain


async def verify_domain(session: AsyncSession, tenant_id: uuid.UUID, domain_id: uuid.UUID) -> dict:
    domain = await _owned(session, tenant_id, domain_id)
    token = (domain.verification_token or "").strip()
    found = [item.strip().strip('"') for item in lookup_txt(domain.hostname)]
    if not token or token not in found:
        raise HTTPException(status_code=422, detail="O registro TXT ainda não confere")
    domain.verified = True
    await session.commit()
    await session.refresh(domain)
    return serialize_domain(domain)


async def make_primary(session: AsyncSession, tenant_id: uuid.UUID, domain_id: uuid.UUID) -> dict:
    domain = await _owned(session, tenant_id, domain_id)
    if not domain.verified:
        raise HTTPException(status_code=422, detail="Só um domínio verificado pode ser o primário")
    await session.execute(update(Domain).where(Domain.tenant_id == tenant_id).values(is_primary=False))
    domain.is_primary = True
    await session.commit()
    await session.refresh(domain)
    return serialize_domain(domain)
