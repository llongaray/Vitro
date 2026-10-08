from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.notices.models import Automation, TenantModule

MODULES = ("coupons", "analytics", "seo_audit", "ads")
TRIGGERS = ("customer_signup", "coupon_claim", "contact_click")

_PLATFORM = {
    "coupons": "feature_coupons",
    "analytics": "feature_analytics",
    "seo_audit": "feature_seo_audit",
    "ads": "feature_ads",
}
_DEFAULT_ENABLED = {"coupons": True, "analytics": True, "seo_audit": True, "ads": False}


def platform_enabled(module: str) -> bool:
    attr = _PLATFORM.get(module)
    if attr is None:
        return False
    return bool(getattr(get_settings(), attr))


async def ensure_store_defaults(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    for module in MODULES:
        found = await session.scalar(select(TenantModule.id).where(TenantModule.tenant_id == tenant_id, TenantModule.module == module))
        if found is None:
            session.add(TenantModule(tenant_id=tenant_id, module=module, enabled=_DEFAULT_ENABLED[module]))
    for trigger in TRIGGERS:
        found = await session.scalar(select(Automation.id).where(Automation.tenant_id == tenant_id, Automation.trigger == trigger))
        if found is None:
            session.add(Automation(tenant_id=tenant_id, trigger=trigger, enabled=True))


async def module_enabled(session: AsyncSession, tenant_id: uuid.UUID, module: str) -> bool:
    if module not in MODULES or not platform_enabled(module):
        return False
    row = await session.scalar(select(TenantModule).where(TenantModule.tenant_id == tenant_id, TenantModule.module == module))
    if row is None:
        return _DEFAULT_ENABLED.get(module, False)
    return row.enabled


async def list_modules(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    rows = {
        row.module: row.enabled
        for row in await session.scalars(select(TenantModule).where(TenantModule.tenant_id == tenant_id))
    }
    return [
        {"module": module, "enabled": rows.get(module, _DEFAULT_ENABLED[module]), "platform_enabled": platform_enabled(module)}
        for module in MODULES
    ]


async def set_module(session: AsyncSession, tenant_id: uuid.UUID, module: str, enabled: bool) -> dict:
    if module not in MODULES:
        raise HTTPException(status_code=422, detail="Módulo desconhecido")
    if enabled and not platform_enabled(module):
        raise HTTPException(status_code=422, detail="Módulo indisponível na plataforma")
    row = await session.scalar(select(TenantModule).where(TenantModule.tenant_id == tenant_id, TenantModule.module == module))
    if row is None:
        row = TenantModule(tenant_id=tenant_id, module=module, enabled=enabled)
        session.add(row)
    else:
        row.enabled = enabled
    await session.commit()
    await session.refresh(row)
    return {"module": row.module, "enabled": row.enabled, "platform_enabled": platform_enabled(module)}
