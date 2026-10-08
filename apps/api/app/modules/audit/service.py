from __future__ import annotations

import uuid
from contextvars import ContextVar
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog

SECRET_KEYS = {"password", "password_hash", "key", "secret", "secret_encrypted", "token"}

_actor: ContextVar[dict | None] = ContextVar("audit_actor", default=None)
_request: ContextVar[dict] = ContextVar("audit_request", default=None)


def set_audit_request(ip: str, user_agent: str) -> None:
    _request.set({"ip": ip[:64], "user_agent": user_agent[:300]})


def set_audit_actor(user_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
    _actor.set({"user_id": user_id, "tenant_id": tenant_id})


def reset_audit_context() -> None:
    _actor.set(None)
    _request.set(None)


def _jsonable(value):
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items() if key not in SECRET_KEYS}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    return value


async def record_audit(
    session: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None,
    old_value,
    new_value,
) -> None:
    actor = _actor.get()
    if actor is None:
        return
    request = _request.get() or {}
    session.add(
        AuditLog(
            tenant_id=actor["tenant_id"],
            user_id=actor["user_id"],
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=_jsonable(old_value) if isinstance(old_value, dict) else None,
            new_value=_jsonable(new_value) if isinstance(new_value, dict) else None,
            ip=request.get("ip"),
            user_agent=request.get("user_agent"),
            created_at=datetime.now(UTC),
        )
    )
