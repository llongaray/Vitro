from __future__ import annotations

import uuid

from pydantic import BaseModel, Field


class MediaOut(BaseModel):
    id: uuid.UUID
    url: str
    thumb_url: str | None
    alt_text: str | None = None
    width: int | None = None
    height: int | None = None
    mime_type: str
