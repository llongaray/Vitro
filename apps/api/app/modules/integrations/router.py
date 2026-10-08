import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_tenant
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.integrations.service import (
    ApiKeyIn,
    IntegrationIn,
    create_api_key,
    delete_integration,
    list_api_keys,
    list_integrations,
    revoke_api_key,
    upsert_integration,
)
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["integrations"], dependencies=[Depends(store_roles)])


@router.get("/integrations")
async def get_integrations(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await list_integrations(session, tenant.id)


@router.put("/integrations/{provider}")
async def put_integration(
    provider: str,
    data: IntegrationIn,
    tenant: Tenant = Depends(get_current_tenant),
    session: AsyncSession = Depends(get_session),
):
    return await upsert_integration(session, tenant, provider, data)


@router.delete("/integrations/{provider}", status_code=204)
async def remove_integration(provider: str, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    await delete_integration(session, tenant, provider)


@router.get("/api-keys")
async def get_keys(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await list_api_keys(session, tenant.id)


@router.post("/api-keys", status_code=201)
async def post_key(data: ApiKeyIn, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await create_api_key(session, tenant.id, data.name)


@router.delete("/api-keys/{key_id}")
async def delete_key(key_id: uuid.UUID, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await revoke_api_key(session, tenant.id, key_id)
