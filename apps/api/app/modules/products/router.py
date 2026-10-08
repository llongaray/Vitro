from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import enforce_rate_limit, get_current_user
from app.core.permissions import catalog_roles
from app.database.session import get_session
from app.modules.products.schemas import ProductIn, ProductOut, ProductPage, ProductUpdate
from app.modules.products.service import add_image, create_product, delete_image, delete_product, list_products, serialize_product, update_product, _get
from app.modules.users.models import User

router = APIRouter(prefix="/products", tags=["products"])


def _bounded(page: int, limit: int) -> tuple[int, int]:
    return max(page, 1), min(max(limit, 1), 100)


@router.get("", response_model=ProductPage)
async def list_route(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    page, limit = _bounded(page, limit)
    rows, total = await list_products(session, user.tenant_id, page, limit)
    return {"items": [serialize_product(row) for row in rows], "page": page, "limit": limit, "total": total}


@router.post("", response_model=ProductOut, status_code=201)
async def create_route(data: ProductIn, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return serialize_product(await create_product(session, user.tenant_id, data))


@router.get("/{product_id}", response_model=ProductOut)
async def get_route(product_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return serialize_product(await _get(session, user.tenant_id, product_id))


@router.patch("/{product_id}", response_model=ProductOut)
async def update_route(product_id: UUID, data: ProductUpdate, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    return serialize_product(await update_product(session, user.tenant_id, product_id, data))


@router.delete("/{product_id}", status_code=204)
async def delete_route(product_id: UUID, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    await delete_product(session, user.tenant_id, product_id)


@router.post("/{product_id}/images", response_model=ProductOut, status_code=201)
async def add_image_route(
    product_id: UUID,
    file: UploadFile = File(...),
    alt: str | None = Form(None),
    user: User = Depends(catalog_roles),
    session: AsyncSession = Depends(get_session),
):
    await enforce_rate_limit(f"rl:upload:{user.id}", get_settings().upload_per_minute, 60)
    return serialize_product(await add_image(session, user.tenant_id, product_id, file, alt))


@router.delete("/{product_id}/images/{image_id}", status_code=204)
async def delete_image_route(product_id: UUID, image_id: UUID, user: User = Depends(catalog_roles), session: AsyncSession = Depends(get_session)):
    await delete_image(session, user.tenant_id, product_id, image_id)
