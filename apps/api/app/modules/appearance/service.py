from __future__ import annotations

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenants.models import DEFAULT_SECTIONS, Tenant
from app.services.invalidate import invalidate_tenant

FONT_PAIRS = ("classic", "editorial")


def serialize_appearance(tenant: Tenant) -> dict:
    order = tenant.section_order or list(DEFAULT_SECTIONS)
    return {"font_pair": tenant.font_pair or "classic", "hero_text": tenant.hero_text, "section_order": order}


class AppearanceUpdate(BaseModel):
    font_pair: str | None = None
    hero_text: str | None = Field(default=None, max_length=600)
    section_order: list[str] | None = None


def _validate_order(order: list[str]) -> None:
    if len(order) != len(DEFAULT_SECTIONS) or sorted(order) != sorted(DEFAULT_SECTIONS):
        raise HTTPException(status_code=422, detail="Ordem de seções inválida")


async def update_appearance(session: AsyncSession, tenant: Tenant, data: AppearanceUpdate) -> dict:
    payload = data.model_dump(exclude_unset=True)
    if "font_pair" in payload and payload["font_pair"] is not None:
        if payload["font_pair"] not in FONT_PAIRS:
            raise HTTPException(status_code=422, detail="Par de fontes inválido")
        tenant.font_pair = payload["font_pair"]
    if "hero_text" in payload:
        tenant.hero_text = (payload["hero_text"] or "").strip() or None
    if "section_order" in payload and payload["section_order"] is not None:
        _validate_order(payload["section_order"])
        tenant.section_order = payload["section_order"]
    await session.commit()
    await session.refresh(tenant)
    await invalidate_tenant(session, tenant.id)
    return serialize_appearance(tenant)
