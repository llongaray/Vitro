from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from app.modules.coupons.schemas import ClaimOut


class CustomerIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=3, max_length=255)
    phone: str = Field(min_length=8, max_length=40)
    birth_date: date | None = None
    accepted_marketing: bool = False
    accepted_terms: bool = False


class CustomerOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    birth_date: date | None
    accepted_marketing: bool
    accepted_terms: bool
    created_at: datetime


class SignupOut(CustomerOut):
    coupon: ClaimOut | None = None
