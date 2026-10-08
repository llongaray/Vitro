from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


DEFAULT_SECTIONS = ["hero", "banners", "categories", "featured", "promotions", "clearance", "about"]


def _default_sections() -> list[str]:
    return list(DEFAULT_SECTIONS)


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    trade_name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(63), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    logo_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("media.id", ondelete="SET NULL", use_alter=True, name="fk_tenants_logo_media"),
    )
    favicon_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("media.id", ondelete="SET NULL", use_alter=True, name="fk_tenants_favicon_media"),
    )
    primary_color: Mapped[str] = mapped_column(String(16), default="#9a3412", nullable=False)
    secondary_color: Mapped[str] = mapped_column(String(16), default="#1c1917", nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    whatsapp: Mapped[str | None] = mapped_column(String(40))
    instagram: Mapped[str | None] = mapped_column(String(120))
    facebook: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    business_hours: Mapped[str | None] = mapped_column(Text)
    timezone: Mapped[str] = mapped_column(String(64), default="America/Sao_Paulo", nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="BRL", nullable=False)
    locale: Mapped[str] = mapped_column(String(16), default="pt-BR", nullable=False)
    show_prices: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    contact_type: Mapped[str] = mapped_column(String(24), default="whatsapp", nullable=False)
    contact_value: Mapped[str | None] = mapped_column(String(200))
    contact_message_template: Mapped[str | None] = mapped_column(Text)
    seo_title: Mapped[str | None] = mapped_column(String(180))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    seo_og_image: Mapped[str | None] = mapped_column(String(400))
    site_name: Mapped[str | None] = mapped_column(String(160))
    language: Mapped[str] = mapped_column(String(16), default="pt-BR", nullable=False)
    city: Mapped[str | None] = mapped_column(String(120))
    state: Mapped[str | None] = mapped_column(String(80))
    country: Mapped[str | None] = mapped_column(String(80), default="Brasil")
    indexing_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    font_pair: Mapped[str] = mapped_column(String(24), default="classic", nullable=False)
    hero_text: Mapped[str | None] = mapped_column(Text)
    section_order: Mapped[list] = mapped_column(JSONB, nullable=False, default=_default_sections)

    domains: Mapped[list[Domain]] = relationship(back_populates="tenant")


class Domain(Base):
    __tablename__ = "domains"
    __table_args__ = (UniqueConstraint("hostname", name="uq_domains_hostname"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_token: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="domains")
