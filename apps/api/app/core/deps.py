from __future__ import annotations

import uuid

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import tenant_id_var, user_id_var
from app.core.redis import get_redis
from app.core.security import decode_access_token
from app.modules.audit.service import set_audit_actor
from app.database.session import get_session
from app.modules.tenants.models import Domain, Tenant
from app.modules.users.models import User

bearer = HTTPBearer(auto_error=False)


def normalize_host(value: str | None) -> str:
    if not value:
        return ""
    host = value.split(",")[0].strip().lower()
    if host.startswith("["):
        return host
    return host.split(":")[0]


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def enforce_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    redis = get_redis()
    current = int(await redis.incr(key))
    if current == 1:
        await redis.expire(key, window_seconds)
    if current > limit:
        raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente em instantes.")


def request_hostname(request: Request) -> str:
    return normalize_host(request.headers.get("x-forwarded-host") or request.headers.get("host"))


async def get_tenant_by_host(request: Request, session: AsyncSession = Depends(get_session)) -> Tenant:
    hostname = request_hostname(request)
    tenant = await session.scalar(
        select(Tenant)
        .join(Domain, Domain.tenant_id == Tenant.id)
        .where(Domain.hostname == hostname, Domain.verified.is_(True))
    )
    if tenant is None:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    tenant_id_var.set(str(tenant.id))
    return tenant


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
        tenant_id = uuid.UUID(payload["tenant_id"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Sessão inválida") from exc
    user = await session.get(User, user_id)
    if user is None or not user.is_active or user.tenant_id != tenant_id:
        raise HTTPException(status_code=401, detail="Não autenticado")
    tenant_id_var.set(str(user.tenant_id))
    user_id_var.set(str(user.id))
    set_audit_actor(user.id, user.tenant_id)
    return user


async def get_current_tenant(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> Tenant:
    tenant = await session.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return tenant
