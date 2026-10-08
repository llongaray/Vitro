from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, Computed, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.modules.media.models import Media


class Product(Base, TimestampMixin):
    __tablename__ = "products"
    __table_args__ = (
        Index("uq_products_tenant_slug", "tenant_id", "slug", unique=True, postgresql_where=text("deleted_at IS NULL")),
        Index("idx_products_tenant_active", "tenant_id", "is_active"),
        Index("idx_products_tenant_category", "tenant_id", "category_id"),
        Index("idx_products_tenant_promotion", "tenant_id", "is_promotion"),
        Index("idx_products_tenant_clearance", "tenant_id", "is_clearance"),
        Index("idx_products_search", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(80))
    brand: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    short_description: Mapped[str | None] = mapped_column(String(320))
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    promotional_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    show_price: Mapped[str] = mapped_column(String(16), default="inherit", nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_promotion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_clearance: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    clearance_label: Mapped[str | None] = mapped_column(String(80))
    clearance_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    clearance_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stock_display: Mapped[str | None] = mapped_column(String(80))
    keywords: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    seo_title: Mapped[str | None] = mapped_column(String(180))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    seo_canonical: Mapped[str | None] = mapped_column(String(400))
    seo_index: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    seo_follow: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    seo_og_image: Mapped[str | None] = mapped_column(String(400))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(keywords, '') || ' ' || coalesce(brand, ''))",
            persisted=True,
        ),
    )

    images: Mapped[list[ProductImage]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )


class ProductCategory(Base):
    __tablename__ = "product_categories"

    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media.id", ondelete="RESTRICT"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    alt: Mapped[str | None] = mapped_column(String(200))

    product: Mapped[Product] = relationship(back_populates="images")
    media: Mapped[Media] = relationship()
