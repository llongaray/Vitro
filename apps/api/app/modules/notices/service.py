from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notices.models import Automation, Notification

TRIGGERS = ("customer_signup", "coupon_claim", "contact_click")

_COPY = {
    "customer_signup": ("Novo cliente", "Um cliente concluiu o cadastro."),
    "coupon_claim": ("Cupom resgatado", "Um cliente resgatou um cupom."),
    "contact_click": ("Contato", "Alguém clicou em contato."),
}


async def list_automations(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = {row.trigger: row.enabled for row in await session.scalars(select(Automation).where(Automation.tenant_id == tenant_id))}
    return [{"trigger": trigger, "enabled": rows.get(trigger, True)} for trigger in TRIGGERS]


async def set_automation(session: AsyncSession, tenant_id: uuid.UUID, trigger: str, enabled: bool) -> dict:
    if trigger not in TRIGGERS:
        raise HTTPException(status_code=422, detail="Gatilho desconhecido")
    row = await session.scalar(select(Automation).where(Automation.tenant_id == tenant_id, Automation.trigger == trigger))
    if row is None:
        row = Automation(tenant_id=tenant_id, trigger=trigger, enabled=enabled)
        session.add(row)
    else:
        row.enabled = enabled
    await session.commit()
    await session.refresh(row)
    return {"trigger": row.trigger, "enabled": row.enabled}


async def notify(session: AsyncSession, tenant_id: uuid.UUID, trigger: str) -> None:
    if trigger not in _COPY:
        return
    row = await session.scalar(select(Automation).where(Automation.tenant_id == tenant_id, Automation.trigger == trigger))
    if row is not None and not row.enabled:
        return
    title, body = _COPY[trigger]
    session.add(Notification(tenant_id=tenant_id, kind=trigger, title=title, body=body, created_at=datetime.now(UTC)))


def serialize_notification(row: Notification) -> dict:
    return {
        "id": row.id,
        "kind": row.kind,
        "title": row.title,
        "body": row.body,
        "read_at": row.read_at,
        "created_at": row.created_at,
    }


async def list_notifications(session: AsyncSession, tenant_id: uuid.UUID) -> dict:
    rows = list(
        await session.scalars(select(Notification).where(Notification.tenant_id == tenant_id).order_by(Notification.created_at.desc()).limit(50))
    )
    unread = sum(1 for row in rows if row.read_at is None)
    return {"unread": unread, "items": [serialize_notification(row) for row in rows]}


async def mark_read(session: AsyncSession, tenant_id: uuid.UUID, notification_id: uuid.UUID) -> dict:
    row = await session.get(Notification, notification_id)
    if row is None or row.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Aviso não encontrado")
    row.read_at = row.read_at or datetime.now(UTC)
    await session.commit()
    await session.refresh(row)
    return serialize_notification(row)


async def mark_all_read(session: AsyncSession, tenant_id: uuid.UUID) -> dict:
    await session.execute(
        update(Notification)
        .where(Notification.tenant_id == tenant_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC))
    )
    await session.commit()
    return await list_notifications(session, tenant_id)
