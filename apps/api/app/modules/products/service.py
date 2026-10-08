from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.categories.models import Category
from app.modules.media.models import Media
from app.modules.media.service import save_upload
from app.modules.products.models import Product, ProductCategory, ProductImage
from app.modules.audit.service import record_audit
from app.modules.seo.service import record_redirect
from app.providers.storage import get_storage, media_url
from app.services.invalidate import invalidate_tenant
from app.services.slug import resolve_slug


def _options():
    return selectinload(Product.images).selectinload(ProductImage.media)


async def _get(session: AsyncSession, tenant_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    row = await session.scalar(
        select(Product)
        .where(Product.id == product_id, Product.tenant_id == tenant_id, Product.deleted_at.is_(None))
        .options(_options())
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return row


async def _sync_categories(session: AsyncSession, product: Product, tenant_id: uuid.UUID, category_id, category_ids) -> None:
    ids: list[uuid.UUID] = []
    if category_ids is not None:
        ids = list(dict.fromkeys(category_ids))
    elif category_id is not None:
        ids = [category_id]
    if category_id and category_id not in ids:
        ids.insert(0, category_id)
    if ids:
        found = list(
            await session.scalars(
                select(Category.id).where(Category.tenant_id == tenant_id, Category.id.in_(ids), Category.deleted_at.is_(None))
            )
        )
        if len(found) != len(set(ids)):
            raise HTTPException(status_code=422, detail="Categoria inválida")
    await session.execute(delete(ProductCategory).where(ProductCategory.product_id == product.id))
    for item_id in ids:
        session.add(ProductCategory(product_id=product.id, category_id=item_id, tenant_id=tenant_id))
    if category_id is not None or category_ids is not None:
        product.category_id = category_id or (ids[0] if ids else None)


def _apply_publish(product: Product, publish: bool | None) -> None:
    if publish is None:
        return
    if publish:
        product.published_at = product.published_at or datetime.now(UTC)
    else:
        product.published_at = None


async def list_products(session: AsyncSession, tenant_id: uuid.UUID, page: int, limit: int) -> tuple[list[Product], int]:
    filters = (Product.tenant_id == tenant_id, Product.deleted_at.is_(None))
    total = int(await session.scalar(select(func.count()).select_from(Product).where(*filters)) or 0)
    rows = list(
        await session.scalars(
            select(Product).where(*filters).options(_options()).order_by(Product.created_at.desc()).offset((page - 1) * limit).limit(limit)
        )
    )
    return rows, total


async def create_product(session: AsyncSession, tenant_id: uuid.UUID, data) -> Product:
    slug = await resolve_slug(session, Product, tenant_id, data.slug, data.name)
    product = Product(
        tenant_id=tenant_id,
        name=data.name.strip(),
        slug=slug,
        sku=data.sku,
        brand=data.brand,
        description=data.description,
        short_description=data.short_description,
        price=data.price,
        promotional_price=Decimal(str(data.promotional_price)) if data.promotional_price is not None else None,
        show_price=data.show_price,
        is_clearance=data.is_clearance,
        clearance_label=data.clearance_label,
        clearance_start=data.clearance_start,
        clearance_end=data.clearance_end,
        is_featured=data.is_featured,
        is_active=data.is_active,
        stock_display=data.stock_display,
        keywords=data.keywords,
        seo_title=data.seo_title,
        seo_description=data.seo_description,
        seo_index=data.seo_index,
        seo_follow=data.seo_follow,
    )
    _apply_publish(product, data.publish)
    session.add(product)
    await session.flush()
    await _sync_categories(session, product, tenant_id, data.category_id, data.category_ids or None)
    await record_audit(session, "create", "product", product.id, None, data.model_dump(mode="json"))
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Slug já utilizado nesta loja") from exc
    await invalidate_tenant(session, tenant_id)
    return await _get(session, tenant_id, product.id)


async def update_product(session: AsyncSession, tenant_id: uuid.UUID, product_id: uuid.UUID, data) -> Product:
    product = await _get(session, tenant_id, product_id)
    payload = data.model_dump(exclude_unset=True)
    if "name" in payload and payload["name"]:
        product.name = payload["name"].strip()
    if "slug" in payload and payload["slug"]:
        previous = product.slug
        product.slug = await resolve_slug(session, Product, tenant_id, payload["slug"], product.name, exclude_id=product.id)
        await record_redirect(session, tenant_id, f"/produtos/{previous}", f"/produtos/{product.slug}")
    for field in (
        "sku",
        "brand",
        "description",
        "short_description",
        "price",
        "show_price",
        "is_clearance",
        "clearance_label",
        "clearance_start",
        "clearance_end",
        "is_featured",
        "is_active",
        "stock_display",
        "keywords",
        "seo_title",
        "seo_description",
        "seo_index",
        "seo_follow",
    ):
        if field in payload:
            setattr(product, field, payload[field])
    if "promotional_price" in payload:
        product.promotional_price = Decimal(str(payload["promotional_price"])) if payload["promotional_price"] is not None else None
    if "publish" in payload:
        _apply_publish(product, payload["publish"])
    if "category_id" in payload or "category_ids" in payload:
        await _sync_categories(session, product, tenant_id, payload.get("category_id"), payload.get("category_ids"))
    await record_audit(session, "update", "product", product.id, None, payload)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Slug já utilizado nesta loja") from exc
    await invalidate_tenant(session, tenant_id)
    return await _get(session, tenant_id, product.id)


async def delete_product(session: AsyncSession, tenant_id: uuid.UUID, product_id: uuid.UUID) -> None:
    product = await _get(session, tenant_id, product_id)
    product.deleted_at = datetime.now(UTC)
    product.is_active = False
    await record_audit(session, "delete", "product", product.id, {"name": product.name}, None)
    await session.commit()
    await invalidate_tenant(session, tenant_id)


async def add_image(session: AsyncSession, tenant_id: uuid.UUID, product_id: uuid.UUID, upload: UploadFile, alt: str | None) -> Product:
    product = await _get(session, tenant_id, product_id)
    media = await save_upload(session, tenant_id, upload, "products", alt)
    current = await session.scalar(select(func.max(ProductImage.sort_order)).where(ProductImage.product_id == product.id))
    product.images.append(
        ProductImage(
            product_id=product.id,
            media_id=media.id,
            tenant_id=tenant_id,
            sort_order=(current or 0) + 1,
            alt=alt or product.name,
        )
    )
    await session.commit()
    session.expire(product, ["images"])
    await invalidate_tenant(session, tenant_id)
    return await _get(session, tenant_id, product.id)


async def delete_image(session: AsyncSession, tenant_id: uuid.UUID, product_id: uuid.UUID, image_id: uuid.UUID) -> None:
    product = await _get(session, tenant_id, product_id)
    image = next((item for item in product.images if item.id == image_id), None)
    if image is None:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    media = await session.get(Media, image.media_id)
    await session.delete(image)
    await session.commit()
    if media is not None:
        storage = get_storage()
        await storage.delete(media.path)
        await storage.delete(media.thumb_path)
        await session.delete(media)
        await session.commit()
    await invalidate_tenant(session, tenant_id)


def serialize_product(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "sku": product.sku,
        "brand": product.brand,
        "description": product.description,
        "short_description": product.short_description,
        "price": float(product.price) if isinstance(product.price, Decimal) else product.price,
        "promotional_price": float(product.promotional_price) if isinstance(product.promotional_price, Decimal) else product.promotional_price,
        "show_price": product.show_price,
        "is_promotion": product.is_promotion,
        "is_clearance": product.is_clearance,
        "clearance_label": product.clearance_label,
        "clearance_start": product.clearance_start,
        "clearance_end": product.clearance_end,
        "is_featured": product.is_featured,
        "is_active": product.is_active,
        "published": product.published_at is not None,
        "published_at": product.published_at,
        "stock_display": product.stock_display,
        "keywords": product.keywords,
        "category_id": product.category_id,
        "seo_title": product.seo_title,
        "seo_description": product.seo_description,
        "seo_index": product.seo_index,
        "seo_follow": product.seo_follow,
        "images": [
            {
                "id": image.id,
                "url": media_url(image.media.path) if image.media else None,
                "thumb_url": media_url(image.media.thumb_path) if image.media else None,
                "alt": image.alt,
                "sort_order": image.sort_order,
            }
            for image in product.images
        ],
    }


async def count_products(session: AsyncSession, tenant_id: uuid.UUID) -> int:
    return int(await session.scalar(select(func.count()).select_from(Product).where(Product.tenant_id == tenant_id, Product.deleted_at.is_(None))) or 0)


def price_is_visible(show_prices: bool, show_price: str) -> bool:
    if show_price == "show":
        return True
    if show_price == "hide":
        return False
    return show_prices
