from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

EventType = Literal["page_view", "product_view", "category_view", "search", "contact_click", "coupon_claim", "banner_click"]


class EventIn(BaseModel):
    event_type: EventType
    entity_type: str | None = Field(default=None, max_length=40)
    entity_slug: str | None = Field(default=None, max_length=180)
    metadata: dict | None = None


class RankedItem(BaseModel):
    name: str
    views: int


class SearchItem(BaseModel):
    q: str
    count: int


class SummaryOut(BaseModel):
    visits: int
    users: int
    views: int
    clicks: int
    customers: int
    coupons: int
    top_products: list[RankedItem]
    top_categories: list[RankedItem]
    top_searches: list[SearchItem]
    contact_conversion: float
