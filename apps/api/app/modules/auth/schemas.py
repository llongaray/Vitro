from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.users.models import User


class RegisterStoreIn(BaseModel):
    store_name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=63, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    owner_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: str


class TenantBrief(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    hostname: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    tenant: TenantBrief


def user_out(user: User) -> UserOut:
    return UserOut.model_validate(user)


def refresh_expiry() -> datetime:
    from app.core.config import get_settings

    return datetime.now(UTC) + timedelta(days=get_settings().refresh_token_days)
