from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BannerIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    desktop_media_id: uuid.UUID | None = None
    mobile_media_id: uuid.UUID | None = None
    url: str | None = Field(default=None, max_length=400)
    position: str = "home"
    start_at: datetime | None = None
    end_at: datetime | None = None
    order: int = 0
    active: bool = True


class BannerUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    desktop_media_id: uuid.UUID | None = None
    mobile_media_id: uuid.UUID | None = None
    url: str | None = None
    position: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    order: int | None = None
    active: bool | None = None


class BannerOut(BaseModel):
    id: uuid.UUID
    title: str
    url: str | None
    position: str
    start_at: datetime | None
    end_at: datetime | None
    order: int
    active: bool
    desktop_media_id: uuid.UUID | None
    mobile_media_id: uuid.UUID | None
    desktop_url: str | None
    mobile_url: str | None
