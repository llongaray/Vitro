from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product
from app.modules.promotions.models import Promotion, PromotionProduct
from app.services.invalidate import invalidate_tenant


def _money(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _check_window(start_at: datetime | None, end_at: datetime | None) -> None:
    if start_at and end_at and end_at < start_at:
        raise HTTPException(status_code=422, detail="A data final é anterior à inicial")


async def _refresh_flags(session: AsyncSession, tenant_id: uuid.UUID, product_ids: set[uuid.UUID]) -> None:
    if not product_ids:
        return
    linked = set(
        await session.scalars(
            select(PromotionProduct.product_id).where(
                PromotionProduct.tenant_id == tenant_id,
                PromotionProduct.product_id.in_(product_ids),
            )
        )
    )
    products = list(
        await session.scalars(select(Product).where(Product.tenant_id == tenant_id, Product.id.in_(product_ids), Product.deleted_at.is_(None)))
    )
    for product in products:
        product.is_promotion = product.id in linked


async def _sync_products(session: AsyncSession, promotion: Promotion, items: list) -> None:
    previous = set(
        await session.scalars(select(PromotionProduct.product_id).where(PromotionProduct.promotion_id == promotion.id))
    )
    incoming = {item.product_id: item for item in items}
    found = []
    if incoming:
        found = list(
            await session.scalars(
                select(Product).where(
                    Product.tenant_id == promotion.tenant_id,
                    Product.id.in_(list(incoming)),
                    Product.deleted_at.is_(None),
                )
            )
        )
    if len(found) != len(incoming):
        raise HTTPException(status_code=422, detail="Produto inválido")
    await session.execute(delete(PromotionProduct).where(PromotionProduct.promotion_id == promotion.id))
    by_id = {product.id: product for product in found}
    for item in items:
        session.add(PromotionProduct(promotion_id=promotion.id, product_id=item.product_id, tenant_id=promotion.tenant_id))
        if item.promotional_price is not None:
            by_id[item.product_id].promotional_price = Decimal(str(item.promotional_price))
    await session.flush()
    await _refresh_flags(session, promotion.tenant_id, previous | set(incoming))


async def serialize_promotion(session: AsyncSession, promotion: Promotion) -> dict:
    rows = list(
        await session.execute(
            select(PromotionProduct.product_id, Product.name, Product.promotional_price)
            .join(Product, Product.id == PromotionProduct.product_id)
            .where(PromotionProduct.promotion_id == promotion.id, Product.tenant_id == promotion.tenant_id)
            .order_by(Product.name)
        )
    )
    return {
        "id": promotion.id,
        "name": promotion.name,
        "description": promotion.description,
        "start_at": promotion.start_at,
        "end_at": promotion.end_at,
        "active": promotion.active,
        "products": [
            {"product_id": product_id, "name": name, "promotional_price": _money(price)}
            for product_id, name, price in rows
        ],
    }


async def list_promotions(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = list(
        await session.scalars(select(Promotion).where(Promotion.tenant_id == tenant_id).order_by(Promotion.created_at.desc()))
    )
    return [await serialize_promotion(session, row) for row in rows]


async def get_promotion(session: AsyncSession, tenant_id: uuid.UUID, promotion_id: uuid.UUID) -> Promotion:
    row = await session.scalar(select(Promotion).where(Promotion.id == promotion_id, Promotion.tenant_id == tenant_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    return row


async def create_promotion(session: AsyncSession, tenant_id: uuid.UUID, data) -> dict:
    _check_window(data.start_at, data.end_at)
    row = Promotion(
        tenant_id=tenant_id,
        name=data.name.strip(),
        description=data.description,
        start_at=data.start_at,
        end_at=data.end_at,
        active=data.active,
    )
    session.add(row)
    await session.flush()
    await _sync_products(session, row, data.products)
    await session.commit()
    await invalidate_tenant(session, tenant_id)
    return await serialize_promotion(session, row)


async def update_promotion(session: AsyncSession, tenant_id: uuid.UUID, promotion_id: uuid.UUID, data) -> dict:
    row = await get_promotion(session, tenant_id, promotion_id)
    payload = data.model_dump(exclude_unset=True)
    start_at = payload.get("start_at", row.start_at)
    end_at = payload.get("end_at", row.end_at)
    _check_window(start_at, end_at)
    for field in ("name", "description", "start_at", "end_at", "active"):
        if field in payload:
            value = payload[field].strip() if field == "name" and payload[field] else payload[field]
            setattr(row, field, value)
    if "products" in payload and data.products is not None:
        await _sync_products(session, row, data.products)
    await session.commit()
    await invalidate_tenant(session, tenant_id)
    return await serialize_promotion(session, row)


async def delete_promotion(session: AsyncSession, tenant_id: uuid.UUID, promotion_id: uuid.UUID) -> None:
    row = await get_promotion(session, tenant_id, promotion_id)
    product_ids = set(await session.scalars(select(PromotionProduct.product_id).where(PromotionProduct.promotion_id == row.id)))
    await session.delete(row)
    await session.flush()
    await _refresh_flags(session, tenant_id, product_ids)
    await session.commit()
    await invalidate_tenant(session, tenant_id)


def campaign_is_current(start_at: datetime | None, end_at: datetime | None, active: bool, now: datetime | None = None) -> bool:
    if not active:
        return False
    moment = now or datetime.now(UTC)
    if start_at and start_at > moment:
        return False
    if end_at and end_at < moment:
        return False
    return True


async def active_promotion_product_ids(session: AsyncSession, tenant_id: uuid.UUID) -> set[uuid.UUID]:
    now = datetime.now(UTC)
    rows = await session.scalars(
        select(PromotionProduct.product_id)
        .join(Promotion, Promotion.id == PromotionProduct.promotion_id)
        .where(
            Promotion.tenant_id == tenant_id,
            Promotion.active.is_(True),
            or_(Promotion.start_at.is_(None), Promotion.start_at <= now),
            or_(Promotion.end_at.is_(None), Promotion.end_at >= now),
        )
    )
    return set(rows)
