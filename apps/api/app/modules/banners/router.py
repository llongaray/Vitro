from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import catalog_roles
from app.database.session import get_session
from app.modules.banners.schemas import BannerIn, BannerOut, BannerUpdate
from app.modules.banners.service import create_banner, delete_banner, list_banners, update_banner
from app.modules.users.models import User

router = APIRouter(prefix="/banners", tags=["banners"])


@router.get("", response_model=list[BannerOut])
async def list_route(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await list_banners(session, user.tenant_id)


@router.post("", response_model=BannerOut, status_code=201)
async def create_route(data: BannerIn, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await create_banner(session, user.tenant_id, data)


@router.patch("/{banner_id}", response_model=BannerOut)
async def update_route(banner_id: UUID, data: BannerUpdate, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await update_banner(session, user.tenant_id, banner_id, data)


@router.delete("/{banner_id}", status_code=204)
async def delete_route(banner_id: UUID, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    await delete_banner(session, user.tenant_id, banner_id)
