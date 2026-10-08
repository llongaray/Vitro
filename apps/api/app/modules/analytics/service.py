from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.models import AnalyticsEvent
from app.modules.categories.models import Category
from app.modules.coupons.models import CouponRedemption
from app.modules.customers.models import Customer
from app.modules.notices.service import notify
from app.modules.products.models import Product

PRIVATE_KEYS = {"email", "phone", "name", "document", "password"}
EVENT_TYPES = {"page_view", "product_view", "category_view", "search", "contact_click", "coupon_claim", "banner_click"}


def clean_metadata(metadata: dict | None) -> dict:
    if not metadata:
        return {}
    cleaned: dict = {}
    for key, value in metadata.items():
        if str(key).lower() in PRIVATE_KEYS:
            continue
        if isinstance(value, str) and "@" in value and "email" in str(key).lower():
            continue
        cleaned[str(key)[:40]] = value if not isinstance(value, str) else value[:180]
    return cleaned


def stage_event(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    event_type: str,
    session_id: str,
    *,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> None:
    if event_type not in EVENT_TYPES:
        return
    session.add(
        AnalyticsEvent(
            tenant_id=tenant_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            session_id=session_id[:64] or "anon",
            metadata_json=clean_metadata(metadata),
            created_at=datetime.now(UTC),
        )
    )


async def record_event(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    event_type: str,
    session_id: str,
    *,
    entity_type: str | None = None,
    entity_slug: str | None = None,
    metadata: dict | None = None,
) -> None:
    entity_id = None
    extra = clean_metadata(metadata)
    if entity_slug:
        extra.setdefault("slug", entity_slug[:180])
        if entity_type == "product":
            entity_id = await session.scalar(
                select(Product.id).where(Product.tenant_id == tenant_id, Product.slug == entity_slug, Product.deleted_at.is_(None))
            )
        elif entity_type == "category":
            entity_id = await session.scalar(
                select(Category.id).where(Category.tenant_id == tenant_id, Category.slug == entity_slug, Category.deleted_at.is_(None))
            )
    stage_event(session, tenant_id, event_type, session_id, entity_type=entity_type, entity_id=entity_id, metadata=extra)
    if event_type == "contact_click":
        await notify(session, tenant_id, "contact_click")
    await session.commit()


def _window(start: date | None, end: date | None) -> tuple[datetime | None, datetime | None]:
    if start is not None and end is not None and start > end:
        raise HTTPException(status_code=422, detail="Intervalo inválido")
    start_at = datetime.combine(start, time.min, tzinfo=UTC) if start else None
    end_at = datetime.combine(end + timedelta(days=1), time.min, tzinfo=UTC) if end else None
    return start_at, end_at


def _period(*clauses, start_at: datetime | None, end_at: datetime | None):
    filters = list(clauses)
    if start_at is not None:
        filters.append(AnalyticsEvent.created_at >= start_at)
    if end_at is not None:
        filters.append(AnalyticsEvent.created_at < end_at)
    return filters


async def _distinct_sessions(session: AsyncSession, tenant_id: uuid.UUID, event_type: str, start_at: datetime | None, end_at: datetime | None) -> int:
    return int(
        await session.scalar(
            select(func.count(func.distinct(AnalyticsEvent.session_id))).where(
                *_period(
                    AnalyticsEvent.tenant_id == tenant_id,
                    AnalyticsEvent.event_type == event_type,
                    start_at=start_at,
                    end_at=end_at,
                )
            )
        )
        or 0
    )


def _search_term(value: str | None) -> str | None:
    term = (value or "").strip()
    if not term or "@" in term or term.isdigit() and len(term) >= 8:
        return None
    return term[:180]


async def summary(session: AsyncSession, tenant_id: uuid.UUID, start: date | None = None, end: date | None = None) -> dict:
    start_at, end_at = _window(start, end)
    visits = await _distinct_sessions(session, tenant_id, "page_view", start_at, end_at)
    contact_sessions = await _distinct_sessions(session, tenant_id, "contact_click", start_at, end_at)
    views = int(
        await session.scalar(
            select(func.count()).select_from(AnalyticsEvent).where(
                *_period(AnalyticsEvent.tenant_id == tenant_id, AnalyticsEvent.event_type == "product_view", start_at=start_at, end_at=end_at)
            )
        )
        or 0
    )
    clicks = int(
        await session.scalar(
            select(func.count()).select_from(AnalyticsEvent).where(
                *_period(AnalyticsEvent.tenant_id == tenant_id, AnalyticsEvent.event_type == "contact_click", start_at=start_at, end_at=end_at)
            )
        )
        or 0
    )
    customer_filters = [Customer.tenant_id == tenant_id]
    coupon_filters = [CouponRedemption.tenant_id == tenant_id]
    if start_at is not None:
        customer_filters.append(Customer.created_at >= start_at)
        coupon_filters.append(CouponRedemption.created_at >= start_at)
    if end_at is not None:
        customer_filters.append(Customer.created_at < end_at)
        coupon_filters.append(CouponRedemption.created_at < end_at)
    customers = int(await session.scalar(select(func.count()).select_from(Customer).where(*customer_filters)) or 0)
    coupons = int(await session.scalar(select(func.count()).select_from(CouponRedemption).where(*coupon_filters)) or 0)
    product_rows = (
        await session.execute(
            select(Product.name, func.count())
            .join(AnalyticsEvent, AnalyticsEvent.entity_id == Product.id)
            .where(
                *_period(
                    AnalyticsEvent.tenant_id == tenant_id,
                    AnalyticsEvent.event_type == "product_view",
                    Product.tenant_id == tenant_id,
                    start_at=start_at,
                    end_at=end_at,
                )
            )
            .group_by(Product.name)
            .order_by(func.count().desc())
            .limit(5)
        )
    ).all()
    category_rows = (
        await session.execute(
            select(Category.name, func.count())
            .join(AnalyticsEvent, AnalyticsEvent.entity_id == Category.id)
            .where(
                *_period(
                    AnalyticsEvent.tenant_id == tenant_id,
                    AnalyticsEvent.event_type == "category_view",
                    Category.tenant_id == tenant_id,
                    start_at=start_at,
                    end_at=end_at,
                )
            )
            .group_by(Category.name)
            .order_by(func.count().desc())
            .limit(5)
        )
    ).all()
    query_column = AnalyticsEvent.metadata_json["q"].astext
    search_rows = (
        await session.execute(
            select(query_column, func.count())
            .where(*_period(AnalyticsEvent.tenant_id == tenant_id, AnalyticsEvent.event_type == "search", start_at=start_at, end_at=end_at))
            .group_by(query_column)
            .order_by(func.count().desc())
            .limit(8)
        )
    ).all()
    top_searches = []
    for term, count in search_rows:
        clean = _search_term(term)
        if clean is None:
            continue
        top_searches.append({"q": clean, "count": count})
        if len(top_searches) == 5:
            break
    return {
        "visits": visits,
        "users": visits,
        "views": views,
        "clicks": clicks,
        "customers": customers,
        "coupons": coupons,
        "top_products": [{"name": name, "views": count} for name, count in product_rows],
        "top_categories": [{"name": name, "views": count} for name, count in category_rows],
        "top_searches": top_searches,
        "contact_conversion": round(contact_sessions / visits, 4) if visits else 0,
    }
