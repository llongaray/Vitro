from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenants.models import DEFAULT_SECTIONS, Tenant
from app.services.invalidate import invalidate_tenant

EDITORIAL_ORDER = ["hero", "about", "banners", "categories", "featured", "promotions", "clearance"]

THEMES = {
    "classic": {
        "id": "classic",
        "name": "Clássico",
        "font_pair": "classic",
        "fonts": "Fraunces e Outfit",
        "section_order": list(DEFAULT_SECTIONS),
    },
    "editorial": {
        "id": "editorial",
        "name": "Editorial",
        "font_pair": "editorial",
        "fonts": "Source Serif e Source Sans",
        "section_order": list(EDITORIAL_ORDER),
    },
}


def list_themes() -> list[dict]:
    return list(THEMES.values())


async def apply_theme(session: AsyncSession, tenant: Tenant, theme_id: str) -> dict:
    theme = THEMES.get(theme_id)
    if theme is None:
        raise HTTPException(status_code=404, detail="Tema não encontrado")
    tenant.font_pair = theme["font_pair"]
    tenant.section_order = list(theme["section_order"])
    await session.commit()
    await session.refresh(tenant)
    await invalidate_tenant(session, tenant.id)
    return {
        "id": theme["id"],
        "font_pair": tenant.font_pair,
        "hero_text": tenant.hero_text,
        "section_order": list(tenant.section_order),
        "primary_color": tenant.primary_color,
    }
