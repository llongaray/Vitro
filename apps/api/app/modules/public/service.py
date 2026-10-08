from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.banners.models import Banner
from app.modules.categories.models import Category
from app.modules.contacts.service import contact_label
from app.modules.media.models import Media
from app.modules.pages.models import Page
from app.modules.products.models import Product, ProductCategory, ProductImage
from app.modules.products.service import price_is_visible
from app.modules.promotions.service import active_promotion_product_ids
from app.modules.seo.service import compose_seo, entity_seo, lookup_redirect, product_json_ld
from app.modules.integrations.service import public_integrations
from app.modules.ads.service import public_ads
from app.modules.tenants.models import DEFAULT_SECTIONS, Tenant
from app.providers.storage import media_url
from app.services.cache import cache_get, cache_set


def _public_product_filters(tenant_id: uuid.UUID):
    now = datetime.now(UTC)
    return (
        Product.tenant_id == tenant_id,
        Product.deleted_at.is_(None),
        Product.is_active.is_(True),
        Product.published_at.is_not(None),
        Product.published_at <= now,
    )


def _image_payload(product: Product) -> list[dict]:
    items = []
    for image in product.images:
        if image.media is None:
            continue
        items.append(
            {
                "url": media_url(image.media.path),
                "thumb_url": media_url(image.media.thumb_path),
                "alt": image.alt or product.name,
            }
        )
    return items


def _money(value: Decimal | float | None, visible: bool) -> float | None:
    if not visible or value is None:
        return None
    return float(value)


def _clearance_active(product: Product, now: datetime | None = None) -> bool:
    if not product.is_clearance:
        return False
    moment = now or datetime.now(UTC)
    if product.clearance_start and product.clearance_start > moment:
        return False
    if product.clearance_end and product.clearance_end < moment:
        return False
    return True


def _product_card(tenant: Tenant, product: Product, promotion_ids: set[uuid.UUID] | None = None) -> dict:
    images = _image_payload(product)
    visible = price_is_visible(tenant.show_prices, product.show_price)
    on_promotion = product.id in (promotion_ids or set())
    site_name = tenant.site_name or tenant.trade_name or tenant.name
    return {
        "name": product.name,
        "slug": product.slug,
        "short_description": product.short_description,
        "brand": product.brand,
        "is_featured": product.is_featured,
        "price_visible": visible,
        "price": _money(product.price, visible),
        "promotional_price": _money(product.promotional_price, visible and on_promotion),
        "on_promotion": on_promotion,
        "on_clearance": _clearance_active(product),
        "clearance_label": product.clearance_label if _clearance_active(product) else None,
        "image": images[0] if images else None,
        "seo": entity_seo(
            tenant,
            product,
            f"{product.name} · {site_name}",
            product.short_description or product.description,
            images[0]["url"] if images else None,
        ),
    }


def _product_detail(tenant: Tenant, product: Product, promotion_ids: set[uuid.UUID] | None = None) -> dict:
    card = _product_card(tenant, product, promotion_ids)
    card.update(
        {
            "description": product.description,
            "stock_display": product.stock_display,
            "images": _image_payload(product),
            "category_slug": None,
        }
    )
    return card


async def _load_media(session: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, Media]:
    if not ids:
        return {}
    rows = await session.scalars(select(Media).where(Media.id.in_(ids)))
    return {row.id: row for row in rows}


def _tenant_payload(tenant: Tenant, logo: Media | None, favicon: Media | None) -> dict:
    site_name = tenant.site_name or tenant.trade_name or tenant.name
    return {
        "name": tenant.name,
        "trade_name": tenant.trade_name,
        "slug": tenant.slug,
        "description": tenant.description,
        "primary_color": tenant.primary_color,
        "secondary_color": tenant.secondary_color,
        "phone": tenant.phone,
        "whatsapp": tenant.whatsapp,
        "instagram": tenant.instagram,
        "facebook": tenant.facebook,
        "address": tenant.address,
        "business_hours": tenant.business_hours,
        "logo_url": media_url(logo.path) if logo else None,
        "favicon_url": media_url(favicon.path) if favicon else None,
        "language": tenant.language,
        "city": tenant.city,
        "state": tenant.state,
        "country": tenant.country,
        "indexing_enabled": tenant.indexing_enabled,
        "currency": tenant.currency,
        "contact": {
            "type": tenant.contact_type,
            "value": tenant.contact_value,
            "template": tenant.contact_message_template,
            "label": contact_label(tenant.contact_type),
        },
        "font_pair": tenant.font_pair or "classic",
        "hero_text": tenant.hero_text,
        "section_order": list(tenant.section_order or DEFAULT_SECTIONS),
        "seo": compose_seo(
            tenant,
            auto_title=site_name,
            auto_description=tenant.description,
            manual_title=tenant.seo_title,
            manual_description=tenant.seo_description,
            manual_index=True,
            manual_follow=True,
            manual_og=tenant.seo_og_image,
            fallback_og=media_url(logo.path) if logo else None,
        ),
    }


async def build_site(session: AsyncSession, tenant: Tenant) -> dict:
    key = f"tenant:{tenant.id}:homepage"
    cached = await cache_get(key)
    if cached:
        return cached
    logo = await session.get(Media, tenant.logo_media_id) if tenant.logo_media_id else None
    favicon = await session.get(Media, tenant.favicon_media_id) if tenant.favicon_media_id else None
    now = datetime.now(UTC)
    banners = list(
        await session.scalars(
            select(Banner)
            .where(
                Banner.tenant_id == tenant.id,
                Banner.deleted_at.is_(None),
                Banner.active.is_(True),
                or_(Banner.start_at.is_(None), Banner.start_at <= now),
                or_(Banner.end_at.is_(None), Banner.end_at >= now),
            )
            .order_by(Banner.sort_order, Banner.created_at)
        )
    )
    media = await _load_media(session, {item for row in banners for item in (row.desktop_media_id, row.mobile_media_id) if item})
    categories = list(
        await session.scalars(
            select(Category)
            .where(Category.tenant_id == tenant.id, Category.deleted_at.is_(None), Category.is_active.is_(True))
            .order_by(Category.sort_order, Category.name)
        )
    )
    promotion_ids = await active_promotion_product_ids(session, tenant.id)
    featured = list(
        await session.scalars(
            select(Product)
            .where(*_public_product_filters(tenant.id), Product.is_featured.is_(True))
            .options(selectinload(Product.images).selectinload(ProductImage.media))
            .order_by(Product.published_at.desc())
            .limit(8)
        )
    )
    promoted = await _listed_products(session, tenant, Product.id.in_(promotion_ids) if promotion_ids else Product.id.is_(None))
    clearance_now = datetime.now(UTC)
    cleared = await _listed_products(
        session,
        tenant,
        Product.is_clearance.is_(True),
        or_(Product.clearance_start.is_(None), Product.clearance_start <= clearance_now),
        or_(Product.clearance_end.is_(None), Product.clearance_end >= clearance_now),
    )
    pages = list(
        await session.scalars(
            select(Page).where(Page.tenant_id == tenant.id, Page.deleted_at.is_(None), Page.published.is_(True)).order_by(Page.title)
        )
    )
    cover_rows = await session.execute(
        select(ProductCategory.category_id, Media.path)
        .join(Product, Product.id == ProductCategory.product_id)
        .join(ProductImage, ProductImage.product_id == Product.id)
        .join(Media, Media.id == ProductImage.media_id)
        .where(ProductCategory.tenant_id == tenant.id, Product.deleted_at.is_(None), Product.is_active.is_(True))
        .order_by(ProductImage.sort_order)
    )
    covers: dict[uuid.UUID, str | None] = {}
    for category_id, path in cover_rows:
        covers.setdefault(category_id, media_url(path))
    payload = {
        "tenant": _tenant_payload(tenant, logo, favicon),
        "integrations": await public_integrations(session, tenant.id),
        "banners": [
            {
                "title": row.title,
                "url": row.url,
                "desktop_url": media_url(media[row.desktop_media_id].path) if row.desktop_media_id in media else None,
                "mobile_url": media_url(media[row.mobile_media_id].path) if row.mobile_media_id in media else None,
            }
            for row in banners
        ],
        "categories": [
            {
                "name": row.name,
                "slug": row.slug,
                "description": row.description,
                "image_url": covers.get(row.id),
            }
            for row in categories
        ],
        "featured_products": [_product_card(tenant, row, promotion_ids) for row in featured],
        "promotions": [_product_card(tenant, row, promotion_ids) for row in promoted],
        "clearance": [_product_card(tenant, row, promotion_ids) for row in cleared],
        "pages": [{"title": row.title, "slug": row.slug} for row in pages],
        "ads": await public_ads(session, tenant.id),
    }
    await cache_set(key, payload)
    return payload


async def list_public_products(session: AsyncSession, tenant: Tenant, *, q: str | None, category: str | None, page: int, limit: int, sort: str) -> dict:
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    use_cache = not q
    cache_key = f"tenant:{tenant.id}:catalog:{category or '-'}:{sort}:{page}:{limit}"
    if use_cache:
        cached = await cache_get(cache_key)
        if cached:
            return cached
    filters = list(_public_product_filters(tenant.id))
    stmt = select(Product).where(*filters)
    count_stmt = select(func.count()).select_from(Product).where(*filters)
    if category:
        category_row = await session.scalar(
            select(Category).where(Category.tenant_id == tenant.id, Category.slug == category, Category.deleted_at.is_(None), Category.is_active.is_(True))
        )
        if category_row is None:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        linked = select(ProductCategory.product_id).where(ProductCategory.category_id == category_row.id)
        category_filter = or_(Product.category_id == category_row.id, Product.id.in_(linked))
        stmt = stmt.where(category_filter)
        count_stmt = count_stmt.where(category_filter)
    if q:
        stmt = stmt.where(Product.search_vector.op("@@")(func.plainto_tsquery(text("'portuguese'"), q)))
        count_stmt = count_stmt.where(Product.search_vector.op("@@")(func.plainto_tsquery(text("'portuguese'"), q)))
    if sort == "name":
        stmt = stmt.order_by(Product.name.asc())
    elif sort == "recent":
        stmt = stmt.order_by(Product.published_at.desc())
    else:
        stmt = stmt.order_by(Product.is_featured.desc(), Product.published_at.desc())
    total = int(await session.scalar(count_stmt) or 0)
    rows = list(
        await session.scalars(
            stmt.options(selectinload(Product.images).selectinload(ProductImage.media)).offset((page - 1) * limit).limit(limit)
        )
    )
    promotion_ids = await active_promotion_product_ids(session, tenant.id)
    payload = {"items": [_product_card(tenant, row, promotion_ids) for row in rows], "page": page, "limit": limit, "total": total}
    if use_cache:
        await cache_set(cache_key, payload)
    return payload


async def _listed_products(session: AsyncSession, tenant: Tenant, *extra):
    return list(
        await session.scalars(
            select(Product)
            .where(*_public_product_filters(tenant.id), *extra)
            .options(selectinload(Product.images).selectinload(ProductImage.media))
            .order_by(Product.published_at.desc())
            .limit(24)
        )
    )


async def list_public_promotions(session: AsyncSession, tenant: Tenant) -> dict:
    promotion_ids = await active_promotion_product_ids(session, tenant.id)
    rows = await _listed_products(session, tenant, Product.id.in_(promotion_ids) if promotion_ids else Product.id.is_(None))
    return {"items": [_product_card(tenant, row, promotion_ids) for row in rows]}


async def list_public_clearance(session: AsyncSession, tenant: Tenant) -> dict:
    now = datetime.now(UTC)
    promotion_ids = await active_promotion_product_ids(session, tenant.id)
    rows = await _listed_products(
        session,
        tenant,
        Product.is_clearance.is_(True),
        or_(Product.clearance_start.is_(None), Product.clearance_start <= now),
        or_(Product.clearance_end.is_(None), Product.clearance_end >= now),
    )
    return {"items": [_product_card(tenant, row, promotion_ids) for row in rows]}


async def get_public_product(session: AsyncSession, tenant: Tenant, slug: str, origin: str) -> dict:
    cache_key = f"tenant:{tenant.id}:product:{slug}"
    cached = await cache_get(cache_key)
    if not cached:
        product = await session.scalar(
            select(Product)
            .where(*_public_product_filters(tenant.id), Product.slug == slug)
            .options(selectinload(Product.images).selectinload(ProductImage.media))
        )
        if product is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        promotion_ids = await active_promotion_product_ids(session, tenant.id)
        payload = _product_detail(tenant, product, promotion_ids)
        if product.category_id:
            category = await session.get(Category, product.category_id)
            if category and category.deleted_at is None and category.is_active:
                payload["category_slug"] = category.slug
                payload["category_name"] = category.name
        await cache_set(cache_key, payload)
        cached = payload
    result = dict(cached)
    result["json_ld"] = product_json_ld(result, tenant.currency, origin, result.get("category_name"))
    return result


async def public_redirect(session: AsyncSession, tenant: Tenant, path: str) -> dict | None:
    return await lookup_redirect(session, tenant, path)


async def list_public_categories(session: AsyncSession, tenant: Tenant) -> list[dict]:
    rows = await session.scalars(
        select(Category).where(Category.tenant_id == tenant.id, Category.deleted_at.is_(None), Category.is_active.is_(True)).order_by(Category.sort_order, Category.name)
    )
    return [{"name": row.name, "slug": row.slug, "description": row.description} for row in rows]


async def get_public_category(session: AsyncSession, tenant: Tenant, slug: str, page: int, limit: int) -> dict:
    row = await session.scalar(
        select(Category).where(Category.tenant_id == tenant.id, Category.slug == slug, Category.deleted_at.is_(None), Category.is_active.is_(True))
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    products = await list_public_products(session, tenant, q=None, category=slug, page=page, limit=limit, sort="featured")
    site_name = tenant.site_name or tenant.trade_name or tenant.name
    return {
        "name": row.name,
        "slug": row.slug,
        "description": row.description,
        "seo": entity_seo(tenant, row, f"{row.name} · {site_name}", row.description),
        "products": products,
    }


async def get_public_page(session: AsyncSession, tenant: Tenant, slug: str) -> dict:
    row = await session.scalar(
        select(Page).where(Page.tenant_id == tenant.id, Page.slug == slug, Page.deleted_at.is_(None), Page.published.is_(True))
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Página não encontrada")
    site_name = tenant.site_name or tenant.trade_name or tenant.name
    return {
        "title": row.title,
        "slug": row.slug,
        "content": row.content or "",
        "seo": entity_seo(tenant, row, f"{row.title} · {site_name}", row.content),
    }


async def build_sitemap(session: AsyncSession, tenant: Tenant) -> dict:
    if not tenant.indexing_enabled:
        return {"paths": []}
    paths = ["/", "/produtos", "/contato", "/cadastro"]
    promotion_ids = await active_promotion_product_ids(session, tenant.id)
    if promotion_ids:
        paths.append("/promocoes")
    clearance_count = await session.scalar(
        select(func.count()).select_from(Product).where(
            *_public_product_filters(tenant.id),
            Product.is_clearance.is_(True),
            or_(Product.clearance_end.is_(None), Product.clearance_end >= datetime.now(UTC)),
        )
    )
    if clearance_count:
        paths.append("/liquidacao")
    categories = await session.scalars(
        select(Category.slug).where(
            Category.tenant_id == tenant.id,
            Category.deleted_at.is_(None),
            Category.is_active.is_(True),
            Category.seo_index.is_(True),
        )
    )
    paths.extend(f"/categorias/{slug}" for slug in categories)
    products = await session.scalars(select(Product.slug).where(*_public_product_filters(tenant.id), Product.seo_index.is_(True)))
    paths.extend(f"/produtos/{slug}" for slug in products)
    pages = await session.scalars(
        select(Page.slug).where(Page.tenant_id == tenant.id, Page.deleted_at.is_(None), Page.published.is_(True), Page.seo_index.is_(True))
    )
    paths.extend(f"/pagina/{slug}" for slug in pages)
    return {"paths": paths}
