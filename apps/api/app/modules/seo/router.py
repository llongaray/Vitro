from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.notices.modules_service import module_enabled
from app.modules.seo.service import audit_tenant, compose_seo
from app.modules.tenants.models import Tenant
from app.modules.users.models import User

router = APIRouter(prefix="/seo", tags=["seo"])


class PreviewIn(BaseModel):
    auto_title: str = Field(min_length=1, max_length=180)
    auto_description: str | None = None
    manual_title: str | None = Field(default=None, max_length=180)
    manual_description: str | None = Field(default=None, max_length=320)
    manual_og: str | None = None


@router.post("/preview")
async def preview(data: PreviewIn, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    tenant = await session.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    return compose_seo(
        tenant,
        auto_title=data.auto_title,
        auto_description=data.auto_description,
        manual_title=data.manual_title,
        manual_description=data.manual_description,
        manual_index=True,
        manual_follow=True,
        manual_og=data.manual_og,
    )


@router.get("/audit")
async def audit(user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    if not await module_enabled(session, user.tenant_id, "seo_audit"):
        raise HTTPException(status_code=404, detail="Recurso indisponível")
    tenant = await session.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    return await audit_tenant(session, tenant)
