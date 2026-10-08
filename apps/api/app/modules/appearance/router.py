from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_tenant
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.appearance.service import AppearanceUpdate, serialize_appearance, update_appearance
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/appearance", tags=["appearance"], dependencies=[Depends(store_roles)])


@router.get("")
async def get_appearance(tenant: Tenant = Depends(get_current_tenant)):
    return serialize_appearance(tenant)


@router.patch("")
async def patch_appearance(
    data: AppearanceUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_session),
):
    return await update_appearance(session, tenant, data)
