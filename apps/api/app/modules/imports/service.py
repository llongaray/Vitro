from __future__ import annotations

import csv
import io
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.models import AnalyticsEvent
from app.modules.categories.models import Category
from app.modules.coupons.models import Coupon
from app.modules.customers.models import Customer, CustomerConsent
from app.modules.customers.service import CONSENT_VERSION
from app.modules.products.models import Product
from app.modules.products.schemas import ProductIn, ProductUpdate
from app.modules.products.service import create_product, update_product

_TRUTHY = {"1", "true", "sim", "yes", "y"}
_SHOW = {"inherit", "show", "hide"}


def _text(value: str | None) -> str:
    return (value or "").strip()


def _flag(value: str | None) -> bool:
    return _text(value).lower() in _TRUTHY


def _price(value: str | None) -> float | None:
    raw = _text(value).replace(",", ".")
    if not raw:
        return None
    try:
        number = float(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Preço inválido") from exc
    if number < 0:
        raise HTTPException(status_code=422, detail="Preço inválido")
    return number


async def _read_csv(upload: UploadFile) -> list[dict[str, str]]:
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Arquivo vazio")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="O arquivo precisa estar em UTF-8") from exc
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows:
        raise HTTPException(status_code=422, detail="O CSV não tem linhas")
    return [{(key or "").strip().lower(): _text(value) for key, value in row.items()} for row in rows]


async def import_products(session: AsyncSession, tenant_id: uuid.UUID, upload: UploadFile) -> dict:
    rows = await _read_csv(upload)
    created = 0
    updated = 0
    errors: list[dict] = []
    for index, row in enumerate(rows, start=2):
        name = row.get("name", "")
        if not name:
            errors.append({"line": index, "detail": "Nome obrigatório"})
            continue
        slug = row.get("slug") or None
        show_price = row.get("show_price") or "inherit"
        if show_price not in _SHOW:
            errors.append({"line": index, "detail": "show_price inválido"})
            continue
        try:
            price = _price(row.get("price"))
        except HTTPException as exc:
            errors.append({"line": index, "detail": str(exc.detail)})
            continue
        category_id = None
        category_slug = row.get("category_slug")
        if category_slug:
            category = await session.scalar(
                select(Category).where(
                    Category.tenant_id == tenant_id,
                    Category.slug == category_slug,
                    Category.deleted_at.is_(None),
                )
            )
            if category is None:
                errors.append({"line": index, "detail": "Categoria não encontrada"})
                continue
            category_id = category.id
        existing = None
        if slug:
            existing = await session.scalar(
                select(Product).where(Product.tenant_id == tenant_id, Product.slug == slug, Product.deleted_at.is_(None))
            )
        fields: dict = {
            "name": name,
            "price": price,
            "description": row.get("description") or None,
            "short_description": row.get("short_description") or None,
            "show_price": show_price,
            "publish": _flag(row.get("published")),
        }
        if category_id is not None:
            fields["category_id"] = category_id
        try:
            if existing is None:
                await create_product(session, tenant_id, ProductIn(slug=slug, **fields))
                created += 1
            else:
                await update_product(session, tenant_id, existing.id, ProductUpdate(**fields))
                updated += 1
        except HTTPException as exc:
            errors.append({"line": index, "detail": str(exc.detail)})
    return {"created": created, "updated": updated, "errors": errors}


async def import_customers(session: AsyncSession, tenant_id: uuid.UUID, upload: UploadFile) -> dict:
    rows = await _read_csv(upload)
    created = 0
    updated = 0
    errors: list[dict] = []
    for index, row in enumerate(rows, start=2):
        if not _flag(row.get("accepted_terms")):
            errors.append({"line": index, "detail": "Cliente sem aceite dos termos"})
            continue
        email = row.get("email", "").lower()
        name = row.get("name", "")
        if not name or "@" not in email:
            errors.append({"line": index, "detail": "Nome e e-mail são obrigatórios"})
            continue
        marketing = _flag(row.get("accepted_marketing"))
        phone = row.get("phone") or None
        existing = await session.scalar(select(Customer).where(Customer.tenant_id == tenant_id, Customer.email == email))
        now = datetime.now(UTC)
        if existing is None:
            customer = Customer(
                tenant_id=tenant_id,
                name=name,
                email=email,
                phone=phone,
                accepted_marketing=marketing,
                accepted_terms=True,
            )
            session.add(customer)
            await session.flush()
            session.add(CustomerConsent(tenant_id=tenant_id, customer_id=customer.id, kind="terms", version=CONSENT_VERSION, accepted_at=now))
            if marketing:
                session.add(
                    CustomerConsent(
                        tenant_id=tenant_id,
                        customer_id=customer.id,
                        kind="marketing",
                        version=CONSENT_VERSION,
                        accepted_at=now,
                    )
                )
            created += 1
        else:
            existing.name = name
            existing.phone = phone
            existing.accepted_marketing = marketing
            existing.accepted_terms = True
            updated += 1
    await session.commit()
    return {"created": created, "updated": updated, "errors": errors}


def _csv(headers: list[str], rows: list[list[str]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


async def export_products(session: AsyncSession, tenant_id: uuid.UUID) -> str:
    rows = await session.scalars(select(Product).where(Product.tenant_id == tenant_id, Product.deleted_at.is_(None)).order_by(Product.name))
    lines = []
    for product in rows:
        category_slug = ""
        if product.category_id:
            category = await session.get(Category, product.category_id)
            if category is not None:
                category_slug = category.slug
        lines.append(
            [
                product.name,
                product.slug,
                "" if product.price is None else str(product.price),
                category_slug,
                product.description or "",
                product.short_description or "",
                "true" if product.published_at else "false",
                product.show_price,
            ]
        )
    return _csv(["name", "slug", "price", "category_slug", "description", "short_description", "published", "show_price"], lines)


async def export_customers(session: AsyncSession, tenant_id: uuid.UUID) -> str:
    rows = await session.scalars(select(Customer).where(Customer.tenant_id == tenant_id).order_by(Customer.email))
    lines = [[row.name, row.email, row.phone or "", "true" if row.accepted_terms else "false", "true" if row.accepted_marketing else "false"] for row in rows]
    return _csv(["name", "email", "phone", "accepted_terms", "accepted_marketing"], lines)


async def export_coupons(session: AsyncSession, tenant_id: uuid.UUID) -> str:
    rows = await session.scalars(select(Coupon).where(Coupon.tenant_id == tenant_id).order_by(Coupon.code))
    lines = [
        [
            row.code,
            row.name,
            row.discount_type,
            str(row.discount_value),
            "true" if row.active else "false",
            row.scope,
            "true" if row.grant_on_signup else "false",
        ]
        for row in rows
    ]
    return _csv(["code", "name", "discount_type", "discount_value", "active", "scope", "grant_on_signup"], lines)


async def export_analytics(session: AsyncSession, tenant_id: uuid.UUID) -> str:
    rows = await session.scalars(
        select(AnalyticsEvent).where(AnalyticsEvent.tenant_id == tenant_id).order_by(AnalyticsEvent.created_at)
    )
    lines = [
        [
            row.event_type,
            row.entity_type or "",
            "" if row.entity_id is None else str(row.entity_id),
            row.session_id,
            row.created_at.isoformat(),
        ]
        for row in rows
    ]
    return _csv(["event_type", "entity_type", "entity_id", "session_id", "created_at"], lines)
