from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PromotionProductIn(BaseModel):
    product_id: uuid.UUID
    promotional_price: float | None = Field(default=None, ge=0)


class PromotionIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    active: bool = True
    products: list[PromotionProductIn] = []


class PromotionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    active: bool | None = None
    products: list[PromotionProductIn] | None = None


class PromotionProductOut(BaseModel):
    product_id: uuid.UUID
    name: str
    promotional_price: float | None


class PromotionOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    start_at: datetime | None
    end_at: datetime | None
    active: bool
    products: list[PromotionProductOut]
