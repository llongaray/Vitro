from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DiscountType = Literal["PERCENTAGE", "FIXED"]
CouponScope = Literal["ALL_PRODUCTS", "CATEGORY", "PRODUCT"]


class CouponIn(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    discount_type: DiscountType
    discount_value: float = Field(ge=0)
    start_at: datetime | None = None
    end_at: datetime | None = None
    max_uses: int | None = Field(default=None, ge=1)
    max_uses_per_customer: int | None = Field(default=None, ge=1)
    minimum_value: float | None = Field(default=None, ge=0)
    active: bool = True
    scope: CouponScope = "ALL_PRODUCTS"
    category_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    grant_on_signup: bool = False


class CouponUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=40)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    discount_type: DiscountType | None = None
    discount_value: float | None = Field(default=None, ge=0)
    start_at: datetime | None = None
    end_at: datetime | None = None
    max_uses: int | None = Field(default=None, ge=1)
    max_uses_per_customer: int | None = Field(default=None, ge=1)
    minimum_value: float | None = None
    active: bool | None = None
    scope: CouponScope | None = None
    category_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    grant_on_signup: bool | None = None


class CouponOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    discount_type: str
    discount_value: float
    start_at: datetime | None
    end_at: datetime | None
    max_uses: int | None
    max_uses_per_customer: int | None
    minimum_value: float | None
    active: bool
    scope: str
    category_id: uuid.UUID | None
    product_id: uuid.UUID | None
    grant_on_signup: bool


class ClaimIn(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    email: str = Field(min_length=3, max_length=255)


class ClaimOut(BaseModel):
    code: str
    name: str
    discount_type: str
    discount_value: float
    scope: str
    scope_label: str
