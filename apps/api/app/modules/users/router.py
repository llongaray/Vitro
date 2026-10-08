import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import allow
from app.database.session import get_session
from app.modules.users.models import User
from app.modules.users.service import UserIn, UserUpdate, create_user, list_users, update_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def get_users(user: User = Depends(allow("OWNER")), session: AsyncSession = Depends(get_session)):
    return await list_users(session, user.tenant_id)


@router.post("", status_code=201)
async def post_user(data: UserIn, user: User = Depends(allow("OWNER")), session: AsyncSession = Depends(get_session)):
    return await create_user(session, user.tenant_id, data)


@router.patch("/{user_id}")
async def patch_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    user: User = Depends(allow("OWNER")),
    session: AsyncSession = Depends(get_session),
):
    return await update_user(session, user.tenant_id, user_id, data)
