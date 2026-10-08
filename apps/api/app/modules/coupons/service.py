from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.service import stage_event
from app.modules.categories.models import Category
from app.modules.coupons.models import Coupon, CouponRedemption
from app.modules.audit.service import record_audit
from app.modules.customers.models import Customer
from app.modules.notices.service import notify
from app.modules.products.models import Product
from app.services.invalidate import invalidate_tenant


def _money(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _normalize_code(value: str) -> str:
    code = "".join(character for character in value.strip().upper() if character.isalnum() or character == "-")
    if len(code) < 2:
        raise HTTPException(status_code=422, detail="Código inválido")
    return code


def coupon_is_current(coupon: Coupon, now: datetime | None = None) -> bool:
    if not coupon.active:
        return False
    moment = now or datetime.now(UTC)
    if coupon.start_at and coupon.start_at > moment:
        return False
    if coupon.end_at and coupon.end_at < moment:
        return False
    return True


def serialize_coupon(coupon: Coupon) -> dict:
    return {
        "id": coupon.id,
        "code": coupon.code,
        "name": coupon.name,
        "description": coupon.description,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value),
        "start_at": coupon.start_at,
        "end_at": coupon.end_at,
        "max_uses": coupon.max_uses,
        "max_uses_per_customer": coupon.max_uses_per_customer,
        "minimum_value": _money(coupon.minimum_value),
        "active": coupon.active,
        "scope": coupon.scope,
        "category_id": coupon.category_id,
        "product_id": coupon.product_id,
        "grant_on_signup": coupon.grant_on_signup,
    }


async def _validate_scope(session: AsyncSession, tenant_id: uuid.UUID, scope: str, category_id, product_id) -> None:
    if scope == "CATEGORY":
        if category_id is None:
            raise HTTPException(status_code=422, detail="Informe a categoria do cupom")
        found = await session.scalar(select(Category.id).where(Category.id == category_id, Category.tenant_id == tenant_id, Category.deleted_at.is_(None)))
        if found is None:
            raise HTTPException(status_code=422, detail="Categoria inválida")
    if scope == "PRODUCT":
        if product_id is None:
            raise HTTPException(status_code=422, detail="Informe o produto do cupom")
        found = await session.scalar(select(Product.id).where(Product.id == product_id, Product.tenant_id == tenant_id, Product.deleted_at.is_(None)))
        if found is None:
            raise HTTPException(status_code=422, detail="Produto inválido")
    if scope == "PERCENTAGE":
        return


def _check_discount(discount_type: str, discount_value: float) -> None:
    if discount_type == "PERCENTAGE" and discount_value > 100:
        raise HTTPException(status_code=422, detail="Percentual acima de 100")


async def _clear_other_signup(session: AsyncSession, tenant_id: uuid.UUID, keep_id: uuid.UUID | None) -> None:
    stmt = update(Coupon).where(Coupon.tenant_id == tenant_id, Coupon.grant_on_signup.is_(True)).values(grant_on_signup=False)
    if keep_id is not None:
        stmt = stmt.where(Coupon.id != keep_id)
    await session.execute(stmt)


async def scope_label(session: AsyncSession, coupon: Coupon) -> str:
    if coupon.scope == "CATEGORY" and coupon.category_id:
        name = await session.scalar(select(Category.name).where(Category.id == coupon.category_id, Category.tenant_id == coupon.tenant_id))
        return f"categoria {name}" if name else "uma categoria"
    if coupon.scope == "PRODUCT" and coupon.product_id:
        name = await session.scalar(select(Product.name).where(Product.id == coupon.product_id, Product.tenant_id == coupon.tenant_id))
        return f"produto {name}" if name else "um produto"
    return "todos os produtos"


def claim_payload(coupon: Coupon, label: str) -> dict:
    return {
        "code": coupon.code,
        "name": coupon.name,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value),
        "scope": coupon.scope,
        "scope_label": label,
    }


async def _uses(session: AsyncSession, coupon_id: uuid.UUID, customer_id: uuid.UUID | None = None) -> int:
    stmt = select(func.count()).select_from(CouponRedemption).where(CouponRedemption.coupon_id == coupon_id)
    if customer_id is not None:
        stmt = stmt.where(CouponRedemption.customer_id == customer_id)
    return int(await session.scalar(stmt) or 0)


async def _ensure_limits(session: AsyncSession, coupon: Coupon, customer_id: uuid.UUID) -> None:
    if not coupon_is_current(coupon):
        raise HTTPException(status_code=422, detail="Cupom fora da validade")
    if coupon.max_uses is not None and await _uses(session, coupon.id) >= coupon.max_uses:
        raise HTTPException(status_code=422, detail="Cupom esgotado")
    if coupon.max_uses_per_customer is not None and await _uses(session, coupon.id, customer_id) >= coupon.max_uses_per_customer:
        raise HTTPException(status_code=422, detail="Limite deste cupom para o cliente")


async def list_coupons(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = await session.scalars(select(Coupon).where(Coupon.tenant_id == tenant_id).order_by(Coupon.created_at.desc()))
    return [serialize_coupon(row) for row in rows]


async def create_coupon(session: AsyncSession, tenant_id: uuid.UUID, data) -> dict:
    _check_discount(data.discount_type, data.discount_value)
    if data.start_at and data.end_at and data.end_at < data.start_at:
        raise HTTPException(status_code=422, detail="A data final é anterior à inicial")
    await _validate_scope(session, tenant_id, data.scope, data.category_id, data.product_id)
    if data.grant_on_signup and data.active:
        await _clear_other_signup(session, tenant_id, None)
    row = Coupon(
        tenant_id=tenant_id,
        code=_normalize_code(data.code),
        name=data.name.strip(),
        description=data.description,
        discount_type=data.discount_type,
        discount_value=Decimal(str(data.discount_value)),
        start_at=data.start_at,
        end_at=data.end_at,
        max_uses=data.max_uses,
        max_uses_per_customer=data.max_uses_per_customer,
        minimum_value=Decimal(str(data.minimum_value)) if data.minimum_value is not None else None,
        active=data.active,
        scope=data.scope,
        category_id=data.category_id if data.scope == "CATEGORY" else None,
        product_id=data.product_id if data.scope == "PRODUCT" else None,
        grant_on_signup=data.grant_on_signup,
    )
    session.add(row)
    try:
        await session.flush()
        await record_audit(session, "create", "coupon", row.id, None, {"code": row.code, "name": row.name})
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Já existe um cupom com este código") from exc
    await invalidate_tenant(session, tenant_id)
    return serialize_coupon(row)


async def update_coupon(session: AsyncSession, tenant_id: uuid.UUID, coupon_id: uuid.UUID, data) -> dict:
    row = await session.scalar(select(Coupon).where(Coupon.id == coupon_id, Coupon.tenant_id == tenant_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")
    payload = data.model_dump(exclude_unset=True)
    if "discount_type" in payload or "discount_value" in payload:
        _check_discount(payload.get("discount_type", row.discount_type), payload.get("discount_value", float(row.discount_value)))
    if "code" in payload and payload["code"]:
        row.code = _normalize_code(payload["code"])
    if "name" in payload and payload["name"]:
        row.name = payload["name"].strip()
    for field in ("description", "discount_type", "start_at", "end_at", "max_uses", "max_uses_per_customer", "active", "scope", "category_id", "product_id", "grant_on_signup"):
        if field in payload:
            setattr(row, field, payload[field])
    if "discount_value" in payload:
        row.discount_value = Decimal(str(payload["discount_value"]))
    if "minimum_value" in payload:
        row.minimum_value = Decimal(str(payload["minimum_value"])) if payload["minimum_value"] is not None else None
    await _validate_scope(session, tenant_id, row.scope, row.category_id, row.product_id)
    if row.grant_on_signup and row.active:
        await _clear_other_signup(session, tenant_id, row.id)
    await record_audit(session, "update", "coupon", row.id, None, payload)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Já existe um cupom com este código") from exc
    await invalidate_tenant(session, tenant_id)
    return serialize_coupon(row)


async def delete_coupon(session: AsyncSession, tenant_id: uuid.UUID, coupon_id: uuid.UUID) -> None:
    row = await session.scalar(select(Coupon).where(Coupon.id == coupon_id, Coupon.tenant_id == tenant_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")
    await record_audit(session, "delete", "coupon", row.id, {"code": row.code}, None)
    await session.delete(row)
    await session.commit()
    await invalidate_tenant(session, tenant_id)


async def _redeem(session: AsyncSession, tenant_id: uuid.UUID, coupon: Coupon, customer: Customer, session_id: str) -> dict:
    await _ensure_limits(session, coupon, customer.id)
    session.add(
        CouponRedemption(
            tenant_id=tenant_id,
            coupon_id=coupon.id,
            customer_id=customer.id,
            created_at=datetime.now(UTC),
        )
    )
    stage_event(
        session,
        tenant_id,
        "coupon_claim",
        session_id,
        entity_type="coupon",
        entity_id=coupon.id,
        metadata={"code": coupon.code},
    )
    await notify(session, tenant_id, "coupon_claim")
    label = await scope_label(session, coupon)
    return claim_payload(coupon, label)


async def claim_coupon(session: AsyncSession, tenant_id: uuid.UUID, code: str, email: str, session_id: str) -> dict:
    customer = await session.scalar(select(Customer).where(Customer.tenant_id == tenant_id, Customer.email == email.strip().lower()))
    if customer is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    coupon = await session.scalar(select(Coupon).where(Coupon.tenant_id == tenant_id, Coupon.code == _normalize_code(code)))
    if coupon is None:
        raise HTTPException(status_code=422, detail="Cupom fora da validade")
    payload = await _redeem(session, tenant_id, coupon, customer, session_id)
    await session.commit()
    return payload


async def deliver_signup_coupon(session: AsyncSession, tenant_id: uuid.UUID, customer: Customer, session_id: str) -> dict | None:
    coupon = await session.scalar(
        select(Coupon).where(Coupon.tenant_id == tenant_id, Coupon.grant_on_signup.is_(True), Coupon.active.is_(True))
    )
    if coupon is None or not coupon_is_current(coupon):
        return None
    if coupon.max_uses is not None and await _uses(session, coupon.id) >= coupon.max_uses:
        return None
    if coupon.max_uses_per_customer is not None and await _uses(session, coupon.id, customer.id) >= coupon.max_uses_per_customer:
        return None
    return await _redeem(session, tenant_id, coupon, customer, session_id)
