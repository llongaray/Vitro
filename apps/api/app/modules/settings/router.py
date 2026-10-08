from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_tenant, get_current_user
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.audit.service import record_audit
from app.modules.contacts.service import CONTACT_TYPES, contact_label
from app.modules.settings.service import ContactUpdate, SettingsUpdate, overview, serialize_settings, update_settings
from app.modules.tenants.models import Tenant
from app.modules.users.models import User
from app.services.invalidate import invalidate_tenant

router = APIRouter(tags=["settings"])


@router.get("/settings")
async def get_settings_route(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await serialize_settings(session, tenant)


@router.patch("/settings")
async def patch_settings_route(
    data: SettingsUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(store_roles),
):
    return await update_settings(session, tenant, data)


@router.get("/settings/overview")
async def overview_route(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await overview(session, user.tenant_id)


@router.get("/contacts")
async def get_contact(tenant: Tenant = Depends(get_current_tenant)):
    return {
        "contact_type": tenant.contact_type,
        "contact_value": tenant.contact_value,
        "contact_message_template": tenant.contact_message_template,
        "label": contact_label(tenant.contact_type),
    }


@router.patch("/contacts")
async def patch_contact(
    data: ContactUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_session),
    _user: User = Depends(store_roles),
):
    payload = data.model_dump(exclude_unset=True)
    if "contact_type" in payload and payload["contact_type"] is not None:
        if payload["contact_type"] not in CONTACT_TYPES:
            raise HTTPException(status_code=422, detail="Canal de contato inválido")
        tenant.contact_type = payload["contact_type"]
    if "contact_value" in payload:
        tenant.contact_value = (payload["contact_value"] or "").strip() or None
    if "contact_message_template" in payload:
        tenant.contact_message_template = payload["contact_message_template"]
    await record_audit(session, "update", "settings", tenant.id, None, payload)
    await session.commit()
    await session.refresh(tenant)
    await invalidate_tenant(session, tenant.id)
    return {
        "contact_type": tenant.contact_type,
        "contact_value": tenant.contact_value,
        "contact_message_template": tenant.contact_message_template,
        "label": contact_label(tenant.contact_type),
    }
