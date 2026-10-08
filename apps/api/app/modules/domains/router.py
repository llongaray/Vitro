import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_tenant
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.domains.service import create_domain, list_domains, make_primary, verify_domain
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/domains", tags=["domains"], dependencies=[Depends(store_roles)])


class DomainIn(BaseModel):
    hostname: str = Field(min_length=1, max_length=255)


@router.get("")
async def get_domains(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await list_domains(session, tenant.id)


@router.post("", status_code=201)
async def post_domain(data: DomainIn, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await create_domain(session, tenant, data.hostname)


@router.post("/{domain_id}/verify")
async def post_verify(domain_id: uuid.UUID, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await verify_domain(session, tenant.id, domain_id)


@router.post("/{domain_id}/primary")
async def post_primary(domain_id: uuid.UUID, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await make_primary(session, tenant.id, domain_id)
