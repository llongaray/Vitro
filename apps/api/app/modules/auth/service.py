from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    burn_password_check,
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    verify_password,
)
from app.modules.auth.models import RefreshToken
from app.modules.auth.schemas import RegisterStoreIn, TenantBrief, TokenOut, UserOut, refresh_expiry
from app.modules.notices.modules_service import ensure_store_defaults
from app.modules.tenants.models import Domain, Tenant
from app.modules.users.models import User

RESERVED_SLUGS = {"www", "api", "admin", "mail", "media", "app", "static", "localhost", "nginx"}


async def _issue(session: AsyncSession, user: User, tenant: Tenant, hostname: str) -> tuple[TokenOut, str]:
    raw = new_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=refresh_expiry(),
            created_at=datetime.now(UTC),
        )
    )
    await session.commit()
    access = create_access_token(user_id=user.id, tenant_id=user.tenant_id, role=user.role)
    payload = TokenOut(
        access_token=access,
        user=UserOut.model_validate(user),
        tenant=TenantBrief(id=tenant.id, slug=tenant.slug, name=tenant.name, hostname=hostname),
    )
    return payload, raw


async def register_store(session: AsyncSession, data: RegisterStoreIn) -> tuple[TokenOut, str]:
    slug = data.slug.lower()
    if slug in RESERVED_SLUGS:
        raise HTTPException(status_code=422, detail="Este endereço de loja está reservado")
    if await session.scalar(select(Tenant.id).where(Tenant.slug == slug)):
        raise HTTPException(status_code=409, detail="Já existe uma loja com este endereço")
    settings = get_settings()
    hostname = f"{slug}.{settings.base_domain}"
    if await session.scalar(select(Domain.id).where(Domain.hostname == hostname)):
        raise HTTPException(status_code=409, detail="Já existe uma loja com este endereço")
    tenant = Tenant(
        name=data.store_name.strip(),
        trade_name=data.store_name.strip(),
        slug=slug,
        site_name=data.store_name.strip(),
        show_prices=False,
        contact_message_template="Olá! Vi o produto {product_name} no site e gostaria de mais informações.\n\n{product_url}",
        country="Brasil",
        language="pt-BR",
        locale="pt-BR",
        currency="BRL",
        timezone="America/Sao_Paulo",
    )
    session.add(tenant)
    await session.flush()
    session.add(
        Domain(
            tenant_id=tenant.id,
            hostname=hostname,
            is_primary=True,
            verified=True,
            created_at=datetime.now(UTC),
        )
    )
    user = User(
        tenant_id=tenant.id,
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        name=data.owner_name.strip(),
        role="OWNER",
    )
    session.add(user)
    await session.flush()
    await ensure_store_defaults(session, tenant.id)
    return await _issue(session, user, tenant, hostname)


async def login(session: AsyncSession, tenant: Tenant, email: str, password: str) -> tuple[TokenOut, str]:
    user = await session.scalar(select(User).where(User.tenant_id == tenant.id, User.email == email.lower(), User.is_active.is_(True)))
    if user is None:
        burn_password_check(password)
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    if not verify_password(user.password_hash, password):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    user.last_login_at = datetime.now(UTC)
    hostname = await session.scalar(select(Domain.hostname).where(Domain.tenant_id == tenant.id, Domain.is_primary.is_(True)))
    return await _issue(session, user, tenant, hostname or "")


async def rotate_refresh(session: AsyncSession, raw_token: str | None) -> tuple[TokenOut, str]:
    if not raw_token:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    stored = await session.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token)))
    now = datetime.now(UTC)
    if stored is None or stored.revoked_at is not None or stored.expires_at <= now:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    stored.revoked_at = now
    user = await session.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    tenant = await session.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    hostname = await session.scalar(select(Domain.hostname).where(Domain.tenant_id == tenant.id, Domain.is_primary.is_(True)))
    return await _issue(session, user, tenant, hostname or "")


async def revoke_refresh(session: AsyncSession, raw_token: str | None) -> None:
    if not raw_token:
        return
    stored = await session.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token)))
    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(UTC)
        await session.commit()
