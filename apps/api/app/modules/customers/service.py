from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.coupons.service import deliver_signup_coupon
from app.modules.customers.models import Customer, CustomerConsent
from app.modules.notices.service import notify
from app.services.invalidate import invalidate_tenant

CONSENT_VERSION = "1"


def serialize_customer(customer: Customer) -> dict:
    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "birth_date": customer.birth_date,
        "accepted_marketing": customer.accepted_marketing,
        "accepted_terms": customer.accepted_terms,
        "created_at": customer.created_at,
    }


async def list_customers(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = await session.scalars(select(Customer).where(Customer.tenant_id == tenant_id).order_by(Customer.created_at.desc()))
    return [serialize_customer(row) for row in rows]


async def register_customer(session: AsyncSession, tenant_id: uuid.UUID, data, session_id: str) -> dict:
    if not data.accepted_terms:
        raise HTTPException(status_code=422, detail="É preciso aceitar os termos")
    email = data.email.strip().lower()
    customer = Customer(
        tenant_id=tenant_id,
        name=data.name.strip(),
        email=email,
        phone=data.phone.strip(),
        birth_date=data.birth_date,
        accepted_marketing=data.accepted_marketing,
        accepted_terms=True,
    )
    session.add(customer)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="E-mail já cadastrado nesta loja") from exc
    now = datetime.now(UTC)
    session.add(CustomerConsent(tenant_id=tenant_id, customer_id=customer.id, kind="terms", version=CONSENT_VERSION, accepted_at=now))
    if data.accepted_marketing:
        session.add(
            CustomerConsent(tenant_id=tenant_id, customer_id=customer.id, kind="marketing", version=CONSENT_VERSION, accepted_at=now)
        )
    coupon = await deliver_signup_coupon(session, tenant_id, customer, session_id)
    await notify(session, tenant_id, "customer_signup")
    await session.commit()
    await invalidate_tenant(session, tenant_id)
    payload = serialize_customer(customer)
    payload["coupon"] = coupon
    return payload
