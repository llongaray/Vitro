from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import catalog_roles
from app.database.session import get_session
from app.modules.pages.schemas import PageIn, PageOut, PageUpdate
from app.modules.pages.service import create_page, delete_page, get_page, list_pages, update_page
from app.modules.users.models import User

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("", response_model=list[PageOut])
async def list_route(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await list_pages(session, user.tenant_id)


@router.post("", response_model=PageOut, status_code=201)
async def create_route(data: PageIn, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await create_page(session, user.tenant_id, data)


@router.get("/{page_id}", response_model=PageOut)
async def get_route(page_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await get_page(session, user.tenant_id, page_id)


@router.patch("/{page_id}", response_model=PageOut)
async def update_route(page_id: UUID, data: PageUpdate, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return await update_page(session, user.tenant_id, page_id, data)


@router.delete("/{page_id}", status_code=204)
async def delete_route(page_id: UUID, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    await delete_page(session, user.tenant_id, page_id)
