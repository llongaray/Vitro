from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_tenant
from app.core.permissions import store_roles
from app.database.session import get_session
from app.modules.imports.service import (
    export_analytics,
    export_coupons,
    export_customers,
    export_products,
    import_customers,
    import_products,
)
from app.modules.tenants.models import Tenant

router = APIRouter(tags=["imports"], dependencies=[Depends(store_roles)])


def _csv_response(filename: str, body: str) -> Response:
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/imports/products")
async def post_products(file: UploadFile, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await import_products(session, tenant.id, file)


@router.post("/imports/customers")
async def post_customers(file: UploadFile, tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return await import_customers(session, tenant.id, file)


@router.get("/exports/products")
async def get_products(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return _csv_response("produtos.csv", await export_products(session, tenant.id))


@router.get("/exports/customers")
async def get_customers(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return _csv_response("clientes.csv", await export_customers(session, tenant.id))


@router.get("/exports/coupons")
async def get_coupons(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return _csv_response("cupons.csv", await export_coupons(session, tenant.id))


@router.get("/exports/analytics")
async def get_analytics(tenant: Tenant = Depends(get_current_tenant), session: AsyncSession = Depends(get_session)):
    return _csv_response("analytics.csv", await export_analytics(session, tenant.id))
