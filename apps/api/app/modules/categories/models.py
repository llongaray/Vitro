from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"
    __table_args__ = (
        Index("uq_categories_tenant_slug", "tenant_id", "slug", unique=True, postgresql_where=text("deleted_at IS NULL")),
        Index("idx_categories_tenant_active", "tenant_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    seo_title: Mapped[str | None] = mapped_column(String(180))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    seo_canonical: Mapped[str | None] = mapped_column(String(400))
    seo_index: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    seo_follow: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    seo_og_image: Mapped[str | None] = mapped_column(String(400))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
