from __future__ import annotations

import uuid

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.banners.service import count_banners
from app.modules.audit.service import record_audit
from app.modules.categories.service import count_categories
from app.modules.media.models import Media
from app.modules.pages.service import count_pages
from app.modules.products.service import count_products
from app.modules.tenants.models import Domain, Tenant
from app.providers.storage import media_url
from app.services.invalidate import invalidate_tenant

SETTING_FIELDS = (
    "name",
    "trade_name",
    "description",
    "primary_color",
    "secondary_color",
    "phone",
    "whatsapp",
    "instagram",
    "facebook",
    "address",
    "business_hours",
    "show_prices",
    "logo_media_id",
    "favicon_media_id",
    "seo_title",
    "seo_description",
    "site_name",
    "language",
    "city",
    "state",
    "country",
    "indexing_enabled",
)


async def _hostname(session: AsyncSession, tenant_id: uuid.UUID) -> str | None:
    return await session.scalar(select(Domain.hostname).where(Domain.tenant_id == tenant_id, Domain.is_primary.is_(True)))


async def serialize_settings(session: AsyncSession, tenant: Tenant) -> dict:
    logo = await session.get(Media, tenant.logo_media_id) if tenant.logo_media_id else None
    favicon = await session.get(Media, tenant.favicon_media_id) if tenant.favicon_media_id else None
    return {
        "name": tenant.name,
        "trade_name": tenant.trade_name,
        "slug": tenant.slug,
        "hostname": await _hostname(session, tenant.id),
        "description": tenant.description,
        "primary_color": tenant.primary_color,
        "secondary_color": tenant.secondary_color,
        "phone": tenant.phone,
        "whatsapp": tenant.whatsapp,
        "instagram": tenant.instagram,
        "facebook": tenant.facebook,
        "address": tenant.address,
        "business_hours": tenant.business_hours,
        "show_prices": tenant.show_prices,
        "logo_media_id": tenant.logo_media_id,
        "favicon_media_id": tenant.favicon_media_id,
        "logo_url": media_url(logo.path) if logo else None,
        "favicon_url": media_url(favicon.path) if favicon else None,
        "seo_title": tenant.seo_title,
        "seo_description": tenant.seo_description,
        "site_name": tenant.site_name,
        "language": tenant.language,
        "city": tenant.city,
        "state": tenant.state,
        "country": tenant.country,
        "indexing_enabled": tenant.indexing_enabled,
        "timezone": tenant.timezone,
        "currency": tenant.currency,
        "locale": tenant.locale,
    }


async def update_settings(session: AsyncSession, tenant: Tenant, data: BaseModel) -> dict:
    payload = data.model_dump(exclude_unset=True)
    for field in SETTING_FIELDS:
        if field in payload:
            value = payload[field]
            if isinstance(value, str):
                value = value.strip()
            setattr(tenant, field, value)
    await record_audit(session, "update", "settings", tenant.id, None, payload)
    await session.commit()
    await session.refresh(tenant)
    await invalidate_tenant(session, tenant.id)
    return await serialize_settings(session, tenant)


async def overview(session: AsyncSession, tenant_id: uuid.UUID) -> dict:
    return {
        "products": await count_products(session, tenant_id),
        "categories": await count_categories(session, tenant_id),
        "banners": await count_banners(session, tenant_id),
        "pages": await count_pages(session, tenant_id),
    }


class SettingsUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    trade_name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    primary_color: str | None = Field(default=None, max_length=16)
    secondary_color: str | None = Field(default=None, max_length=16)
    phone: str | None = None
    whatsapp: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    address: str | None = None
    business_hours: str | None = None
    show_prices: bool | None = None
    logo_media_id: uuid.UUID | None = None
    favicon_media_id: uuid.UUID | None = None
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)
    site_name: str | None = Field(default=None, max_length=160)
    language: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    indexing_enabled: bool | None = None


class ContactUpdate(BaseModel):
    contact_type: str | None = None
    contact_value: str | None = None
    contact_message_template: str | None = None
