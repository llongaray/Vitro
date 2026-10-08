from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.modules.categories.models import Category
from app.modules.pages.models import Page
from app.modules.products.models import Product, ProductImage
from app.modules.seo.models import SeoRedirect
from app.modules.tenants.models import Tenant
from app.providers.storage import media_url
from app.services.cache import cache_get, cache_set


def compose_seo(
    tenant: Tenant,
    *,
    auto_title: str,
    auto_description: str | None,
    manual_title: str | None,
    manual_description: str | None,
    manual_index: bool,
    manual_follow: bool,
    manual_og: str | None,
    fallback_og: str | None = None,
) -> dict:
    title = (manual_title or auto_title or tenant.site_name or tenant.trade_name or tenant.name).strip()
    description = (manual_description or auto_description or tenant.seo_description or tenant.description or "").strip()[:300]
    og = manual_og or fallback_og or tenant.seo_og_image
    return {
        "title": title,
        "description": description,
        "index": bool(tenant.indexing_enabled and manual_index),
        "follow": bool(manual_follow),
        "og_image": media_url(og) if og else None,
    }


def entity_seo(tenant: Tenant, entity, auto_title: str, auto_description: str | None, fallback_og: str | None = None) -> dict:
    return compose_seo(
        tenant,
        auto_title=auto_title,
        auto_description=auto_description,
        manual_title=entity.seo_title,
        manual_description=entity.seo_description,
        manual_index=entity.seo_index,
        manual_follow=entity.seo_follow,
        manual_og=entity.seo_og_image,
        fallback_og=fallback_og,
    )


def normalize_path(path: str) -> str:
    value = "/" + path.strip().split("?")[0].lstrip("/")
    if len(value) > 1:
        value = value.rstrip("/")
    return value


async def record_redirect(session: AsyncSession, tenant_id: uuid.UUID, source: str, destination: str) -> None:
    source_path = normalize_path(source)
    destination_path = normalize_path(destination)
    if source_path == destination_path:
        return
    forward = await session.scalar(
        select(SeoRedirect).where(SeoRedirect.tenant_id == tenant_id, SeoRedirect.source_path == destination_path)
    )
    if forward is not None and forward.destination_path == source_path:
        await session.delete(forward)
        await session.flush()
    current = await session.scalar(
        select(SeoRedirect).where(SeoRedirect.tenant_id == tenant_id, SeoRedirect.source_path == source_path)
    )
    if current is None:
        session.add(SeoRedirect(tenant_id=tenant_id, source_path=source_path, destination_path=destination_path, status_code=301))
    else:
        current.destination_path = destination_path
        current.status_code = 301
    await session.flush()
    pointing = list(
        await session.scalars(
            select(SeoRedirect).where(SeoRedirect.tenant_id == tenant_id, SeoRedirect.destination_path == source_path)
        )
    )
    for item in pointing:
        if item.source_path == destination_path:
            await session.delete(item)
        else:
            item.destination_path = destination_path


async def lookup_redirect(session: AsyncSession, tenant: Tenant, path: str) -> dict | None:
    source = normalize_path(path)
    cache_key = f"tenant:{tenant.id}:redirects"
    cached = await cache_get(cache_key)
    if not isinstance(cached, dict):
        rows = list(await session.scalars(select(SeoRedirect).where(SeoRedirect.tenant_id == tenant.id)))
        cached = {row.source_path: {"destination": row.destination_path, "status_code": row.status_code} for row in rows}
        await cache_set(cache_key, cached)
    found = cached.get(source)
    if not found or found.get("destination") == source:
        return None
    return found


def product_json_ld(card: dict, currency: str, origin: str, category_name: str | None) -> dict:
    product: dict = {
        "@type": "Product",
        "name": card["name"],
        "url": f"{origin}/produtos/{card['slug']}",
    }
    if card.get("short_description") or card.get("description"):
        product["description"] = card.get("short_description") or card.get("description")
    images = [item["url"] for item in card.get("images") or [] if item.get("url")]
    if not images and card.get("image") and card["image"].get("url"):
        images = [card["image"]["url"]]
    if images:
        product["image"] = images
    if card.get("brand"):
        product["brand"] = {"@type": "Brand", "name": card["brand"]}
    shown = card["promotional_price"] if card.get("promotional_price") is not None else card.get("price")
    if card.get("price_visible") and shown is not None:
        product["offers"] = {
            "@type": "Offer",
            "priceCurrency": currency,
            "price": shown,
            "url": product["url"],
            "availability": "https://schema.org/InStock",
        }
    crumbs = [
        {"@type": "ListItem", "position": 1, "name": "Início", "item": origin + "/"},
    ]
    if category_name and card.get("category_slug"):
        crumbs.append(
            {
                "@type": "ListItem",
                "position": 2,
                "name": category_name,
                "item": f"{origin}/categorias/{card['category_slug']}",
            }
        )
    crumbs.append({"@type": "ListItem", "position": len(crumbs) + 1, "name": card["name"], "item": product["url"]})
    return {
        "@context": "https://schema.org",
        "@graph": [product, {"@type": "BreadcrumbList", "itemListElement": crumbs}],
    }


def _item(ok: bool, code: str, label: str, entity: str) -> dict:
    return {"ok": ok, "code": code, "label": label, "entity": entity}


async def audit_tenant(session: AsyncSession, tenant: Tenant) -> dict:
    settings = get_settings()
    items: list[dict] = []
    site_name = tenant.site_name or tenant.trade_name or tenant.name
    home = compose_seo(
        tenant,
        auto_title=site_name,
        auto_description=tenant.description,
        manual_title=tenant.seo_title,
        manual_description=tenant.seo_description,
        manual_index=True,
        manual_follow=True,
        manual_og=tenant.seo_og_image,
    )
    items.extend(
        [
            _item(bool(home["title"]), "title", "Título", site_name),
            _item(bool(home["description"]), "description", "Descrição", site_name),
            _item(True, "h1", "H1", site_name),
            _item(bool(tenant.slug), "slug", "Slug", site_name),
            _item(True, "canonical", "Canonical", site_name),
            _item(bool(home["index"]), "index", "Indexação", site_name),
            _item(bool(tenant.logo_media_id or tenant.seo_og_image), "image", "Imagem", site_name),
        ]
    )
    products = list(
        await session.scalars(
            select(Product)
            .where(Product.tenant_id == tenant.id, Product.deleted_at.is_(None))
            .options(selectinload(Product.images).selectinload(ProductImage.media))
        )
    )
    for product in products:
        seo = entity_seo(tenant, product, f"{product.name} · {site_name}", product.short_description or product.description)
        images = [image for image in product.images if image.media is not None]
        missing_alt = any(not (image.alt or image.media.alt_text) for image in images)
        oversized = any(
            (image.media.size or 0) > settings.upload_max_bytes or ((image.media.width or 0) > settings.image_max_edge)
            for image in images
        )
        items.extend(
            [
                _item(bool(seo["title"]), "title", "Título", product.name),
                _item(bool(seo["description"]), "description", "Descrição", product.name),
                _item(bool(product.name), "h1", "H1", product.name),
                _item(not missing_alt, "alt", "Alt", product.name),
                _item(bool(product.slug), "slug", "Slug", product.name),
                _item(bool(product.slug), "canonical", "Canonical", product.name),
                _item(bool(images), "image", "Imagem", product.name),
                _item(bool(seo["index"]), "index", "Indexação", product.name),
                _item(not oversized, "image_size", "Tamanho da imagem", product.name),
            ]
        )
    categories = list(await session.scalars(select(Category).where(Category.tenant_id == tenant.id, Category.deleted_at.is_(None))))
    for category in categories:
        seo = entity_seo(tenant, category, f"{category.name} · {site_name}", category.description)
        items.extend(
            [
                _item(bool(seo["title"]), "title", "Título", category.name),
                _item(bool(seo["description"]), "description", "Descrição", category.name),
                _item(bool(category.name), "h1", "H1", category.name),
                _item(bool(category.slug), "slug", "Slug", category.name),
                _item(bool(category.slug), "canonical", "Canonical", category.name),
                _item(bool(seo["index"]), "index", "Indexação", category.name),
            ]
        )
    pages = list(await session.scalars(select(Page).where(Page.tenant_id == tenant.id, Page.deleted_at.is_(None))))
    for page in pages:
        seo = entity_seo(tenant, page, f"{page.title} · {site_name}", page.content)
        items.extend(
            [
                _item(bool(seo["title"]), "title", "Título", page.title),
                _item(bool(seo["description"]), "description", "Descrição", page.title),
                _item(bool(page.title), "h1", "H1", page.title),
                _item(bool(page.slug), "slug", "Slug", page.title),
                _item(bool(page.slug), "canonical", "Canonical", page.title),
                _item(bool(seo["index"]), "index", "Indexação", page.title),
            ]
        )
    return {"items": items}
