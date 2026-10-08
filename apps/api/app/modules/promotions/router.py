from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import catalog_roles
from app.database.session import get_session
from app.modules.promotions.schemas import PromotionIn, PromotionOut, PromotionUpdate
from app.modules.promotions.service import create_promotion, delete_promotion, get_promotion, list_promotions, serialize_promotion, update_promotion
from app.modules.users.models import User

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("", response_model=list[PromotionOut])
async def list_route(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await list_promotions(session, user.tenant_id)


@router.post("", response_model=PromotionOut, status_code=201)
async def create_route(data: PromotionIn, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await create_promotion(session, user.tenant_id, data)


@router.get("/{promotion_id}", response_model=PromotionOut)
async def get_route(promotion_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await serialize_promotion(session, await get_promotion(session, user.tenant_id, promotion_id))


@router.patch("/{promotion_id}", response_model=PromotionOut)
async def update_route(promotion_id: UUID, data: PromotionUpdate, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await update_promotion(session, user.tenant_id, promotion_id, data)


@router.delete("/{promotion_id}", status_code=204)
async def delete_route(promotion_id: UUID, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    await delete_promotion(session, user.tenant_id, promotion_id)
