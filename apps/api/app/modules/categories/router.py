from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import catalog_roles
from app.database.session import get_session
from app.modules.categories.schemas import CategoryIn, CategoryOut, CategoryUpdate
from app.modules.categories.service import create_category, delete_category, get_category, list_categories, update_category
from app.modules.users.models import User

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_route(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await list_categories(session, user.tenant_id)


@router.post("", response_model=CategoryOut, status_code=201)
async def create_route(data: CategoryIn, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await create_category(session, user.tenant_id, data)


@router.get("/{category_id}", response_model=CategoryOut)
async def get_route(category_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await get_category(session, user.tenant_id, category_id)


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_route(category_id: UUID, data: CategoryUpdate, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await update_category(session, user.tenant_id, category_id, data)


@router.delete("/{category_id}", status_code=204)
async def delete_route(category_id: UUID, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    await delete_category(session, user.tenant_id, category_id)
