from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.coupons.schemas import CouponIn, CouponOut, CouponUpdate
from app.modules.coupons.service import create_coupon, delete_coupon, list_coupons, update_coupon
from app.modules.notices.modules_service import module_enabled
from app.modules.users.models import User
from fastapi import HTTPException

router = APIRouter(prefix="/coupons", tags=["coupons"])


async def _enabled(user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)) -> None:
    if not await module_enabled(session, user.tenant_id, "coupons"):
        raise HTTPException(status_code=404, detail="Recurso indisponível")


@router.get("", response_model=list[CouponOut], dependencies=[Depends(_enabled)])
async def list_route(user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    return await list_coupons(session, user.tenant_id)


@router.post("", response_model=CouponOut, status_code=201, dependencies=[Depends(_enabled)])
async def create_route(data: CouponIn, user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    return await create_coupon(session, user.tenant_id, data)


@router.patch("/{coupon_id}", response_model=CouponOut, dependencies=[Depends(_enabled)])
async def update_route(coupon_id: UUID, data: CouponUpdate, user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    return await update_coupon(session, user.tenant_id, coupon_id, data)


@router.delete("/{coupon_id}", status_code=204, dependencies=[Depends(_enabled)])
async def delete_route(coupon_id: UUID, user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    await delete_coupon(session, user.tenant_id, coupon_id)
