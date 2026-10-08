from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_tenant
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.tenants.models import Tenant
from app.modules.themes.service import apply_theme, list_themes

router = APIRouter(prefix="/themes", tags=["themes"])


@router.get("")
async def get_themes():
    return list_themes()


@router.post("/{theme_id}/apply")
async def post_apply(theme_id: str, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session), _user=Depends(store_roles)):
    return await apply_theme(session, tenant, theme_id)
