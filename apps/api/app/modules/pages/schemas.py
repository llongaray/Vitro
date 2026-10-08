from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PageKind = Literal["about", "contact", "privacy", "terms", "custom"]


class PageIn(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    slug: str | None = Field(default=None, max_length=180)
    content: str | None = None
    kind: PageKind = "custom"
    published: bool = False
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)


class PageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    slug: str | None = None
    content: str | None = None
    kind: PageKind | None = None
    published: bool | None = None
    seo_title: str | None = None
    seo_description: str | None = None


class PageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    content: str | None
    kind: str
    published: bool
    seo_title: str | None
    seo_description: str | None
