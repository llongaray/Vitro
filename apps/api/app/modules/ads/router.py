import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import allow
from app.database.session import get_session
from app.modules.ads.service import AdIn, AdUpdate, create_ad, delete_ad, list_ads, update_ad
from app.modules.users.models import User

router = APIRouter(prefix="/ads", tags=["ads"])


@router.get("")
async def get_ads(user: User = Depends(allow("OWNER", "ADMIN")), session: AsyncSession = Depends(get_session)):
    return await list_ads(session, user.tenant_id)


@router.post("", status_code=201)
async def post_ad(data: AdIn, user: User = Depends(allow("OWNER", "ADMIN")), session: AsyncSession = Depends(get_session)):
    return await create_ad(session, user.tenant_id, data)


@router.patch("/{ad_id}")
async def patch_ad(
    ad_id: uuid.UUID,
    data: AdUpdate,
    user: User = Depends(allow("OWNER", "ADMIN")),
    session: AsyncSession = Depends(get_session),
):
    return await update_ad(session, user.tenant_id, ad_id, data)


@router.delete("/{ad_id}", status_code=204)
async def remove_ad(ad_id: uuid.UUID, user: User = Depends(allow("OWNER", "ADMIN")), session: AsyncSession = Depends(get_session)):
    await delete_ad(session, user.tenant_id, ad_id)
