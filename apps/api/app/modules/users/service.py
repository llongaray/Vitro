from __future__ import annotations

import uuid

from fastapi import HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.modules.audit.service import record_audit
from app.modules.users.models import User

ROLES = {"OWNER", "ADMIN", "EDITOR", "VIEWER"}


class UserIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    role: str | None = None
    is_active: bool | None = None


def serialize_user(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active}


async def list_users(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = await session.scalars(select(User).where(User.tenant_id == tenant_id).order_by(User.created_at))
    return [serialize_user(row) for row in rows]


async def _active_owners(session: AsyncSession, tenant_id: uuid.UUID) -> int:
    return int(
        await session.scalar(
            select(func.count()).select_from(User).where(User.tenant_id == tenant_id, User.role == "OWNER", User.is_active.is_(True))
        )
        or 0
    )


async def create_user(session: AsyncSession, tenant_id: uuid.UUID, data: UserIn) -> dict:
    if data.role not in ROLES:
        raise HTTPException(status_code=422, detail="Papel inválido")
    user = User(
        tenant_id=tenant_id,
        name=data.name.strip(),
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        role=data.role,
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="E-mail já usado nesta loja") from exc
    await record_audit(session, "create", "user", user.id, None, {"name": user.name, "email": user.email, "role": user.role})
    await session.commit()
    await session.refresh(user)
    return serialize_user(user)


async def update_user(session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, data: UserUpdate) -> dict:
    user = await session.get(User, user_id)
    if user is None or user.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    payload = data.model_dump(exclude_unset=True)
    if "role" in payload and payload["role"] not in ROLES:
        raise HTTPException(status_code=422, detail="Papel inválido")
    leaving_owner = user.role == "OWNER" and user.is_active and (
        payload.get("is_active") is False or ("role" in payload and payload["role"] != "OWNER")
    )
    if leaving_owner and await _active_owners(session, tenant_id) <= 1:
        raise HTTPException(status_code=422, detail="A loja precisa de um responsável ativo")
    previous = {"name": user.name, "role": user.role, "is_active": user.is_active}
    if "name" in payload and payload["name"]:
        user.name = payload["name"].strip()
    if "role" in payload:
        user.role = payload["role"]
    if "is_active" in payload:
        user.is_active = payload["is_active"]
    await record_audit(
        session,
        "update",
        "user",
        user.id,
        previous,
        {"name": user.name, "role": user.role, "is_active": user.is_active},
    )
    await session.commit()
    await session.refresh(user)
    return serialize_user(user)
