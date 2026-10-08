import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.notices.modules_service import list_modules, set_module
from app.modules.notices.service import list_automations, list_notifications, mark_all_read, mark_read, set_automation
from app.modules.users.models import User

router = APIRouter(tags=["notices"])


class ToggleIn(BaseModel):
    enabled: bool


@router.get("/modules")
async def get_modules(user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    return await list_modules(session, user.tenant_id)


@router.put("/modules/{module}")
async def put_module(module: str, data: ToggleIn, user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    return await set_module(session, user.tenant_id, module, data.enabled)


@router.get("/automations")
async def get_automations(user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    return await list_automations(session, user.tenant_id)


@router.put("/automations/{trigger}")
async def put_automation(trigger: str, data: ToggleIn, user: User = Depends(store_roles), session: AsyncSession = Depends(get_session)):
    return await set_automation(session, user.tenant_id, trigger, data.enabled)


@router.get("/notifications")
async def get_notifications(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await list_notifications(session, user.tenant_id)


@router.post("/notifications/read-all")
async def post_read_all(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await mark_all_read(session, user.tenant_id)


@router.post("/notifications/{notification_id}/read")
async def post_read(notification_id: uuid.UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await mark_read(session, user.tenant_id, notification_id)
