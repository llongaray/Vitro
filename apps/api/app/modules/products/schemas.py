from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    slug: str | None = Field(default=None, max_length=180)
    sku: str | None = Field(default=None, max_length=80)
    brand: str | None = Field(default=None, max_length=120)
    description: str | None = None
    short_description: str | None = Field(default=None, max_length=320)
    price: float | None = Field(default=None, ge=0)
    promotional_price: float | None = Field(default=None, ge=0)
    show_price: Literal["inherit", "show", "hide"] = "inherit"
    is_clearance: bool = False
    clearance_label: str | None = Field(default=None, max_length=80)
    clearance_start: datetime | None = None
    clearance_end: datetime | None = None
    is_featured: bool = False
    is_active: bool = True
    publish: bool = False
    stock_display: str | None = Field(default=None, max_length=80)
    keywords: str | None = None
    category_id: uuid.UUID | None = None
    category_ids: list[uuid.UUID] = []
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)
    seo_index: bool = True
    seo_follow: bool = True


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    slug: str | None = Field(default=None, max_length=180)
    sku: str | None = None
    brand: str | None = None
    description: str | None = None
    short_description: str | None = None
    price: float | None = Field(default=None, ge=0)
    promotional_price: float | None = Field(default=None, ge=0)
    show_price: Literal["inherit", "show", "hide"] | None = None
    is_clearance: bool | None = None
    clearance_label: str | None = Field(default=None, max_length=80)
    clearance_start: datetime | None = None
    clearance_end: datetime | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    publish: bool | None = None
    stock_display: str | None = None
    keywords: str | None = None
    category_id: uuid.UUID | None = None
    category_ids: list[uuid.UUID] | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_index: bool | None = None
    seo_follow: bool | None = None


class ImageOut(BaseModel):
    id: uuid.UUID
    url: str | None
    thumb_url: str | None
    alt: str | None
    sort_order: int


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    sku: str | None
    brand: str | None
    description: str | None
    short_description: str | None
    price: float | None
    promotional_price: float | None = None
    show_price: str
    is_promotion: bool = False
    is_clearance: bool = False
    clearance_label: str | None = None
    clearance_start: datetime | None = None
    clearance_end: datetime | None = None
    is_featured: bool
    is_active: bool
    published: bool
    published_at: datetime | None
    stock_display: str | None
    keywords: str | None
    category_id: uuid.UUID | None
    seo_title: str | None
    seo_description: str | None
    seo_index: bool
    seo_follow: bool
    images: list[ImageOut]


class ProductPage(BaseModel):
    items: list[ProductOut]
    page: int
    limit: int
    total: int
