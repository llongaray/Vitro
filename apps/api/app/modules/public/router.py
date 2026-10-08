import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import client_ip, enforce_rate_limit, get_tenant_by_host, request_hostname
from app.database.session import get_session
from app.modules.analytics.schemas import EventIn
from app.modules.analytics.service import record_event
from app.modules.coupons.schemas import ClaimIn, ClaimOut
from app.modules.coupons.service import claim_coupon
from app.modules.customers.schemas import CustomerIn, SignupOut
from app.modules.customers.service import register_customer
from app.modules.notices.modules_service import module_enabled
from app.modules.public.service import (
    build_site,
    build_sitemap,
    get_public_category,
    get_public_page,
    get_public_product,
    list_public_categories,
    list_public_clearance,
    list_public_products,
    list_public_promotions,
    public_redirect,
)
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/public", tags=["public"])


def _session_cookie(request: Request, response: Response) -> str:
    current = request.cookies.get("vitrio_sid")
    session_id = current or uuid.uuid4().hex
    if current != session_id:
        response.set_cookie(
            "vitrio_sid",
            session_id,
            httponly=True,
            samesite="lax",
            secure=get_settings().cookie_secure,
            max_age=60 * 60 * 24 * 365,
            path="/",
        )
    return session_id


@router.get("/site")
async def site(tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    return await build_site(session, tenant)


@router.get("/products")
async def products(
    request: Request,
    q: str | None = Query(default=None, max_length=80),
    category: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    sort: str = Query("featured"),
    tenant: Tenant = Depends(get_tenant_by_host),
    session: AsyncSession = Depends(get_session),
):
    query = q.strip() if q else ""
    if query:
        await enforce_rate_limit(f"rl:search:{client_ip(request)}", get_settings().search_per_minute, 60)
    if sort not in {"featured", "recent", "name"}:
        sort = "featured"
    return await list_public_products(session, tenant, q=query or None, category=category, page=page, limit=limit, sort=sort)


@router.get("/products/{slug}")
async def product(slug: str, request: Request, tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    proto = request.headers.get("x-forwarded-proto") or "http"
    origin = f"{proto}://{request_hostname(request)}"
    return await get_public_product(session, tenant, slug, origin)


@router.get("/promotions")
async def promotions(tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    return await list_public_promotions(session, tenant)


@router.get("/clearance")
async def clearance(tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    return await list_public_clearance(session, tenant)


@router.get("/redirect")
async def redirect(path: str = Query(min_length=1), tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    found = await public_redirect(session, tenant, path)
    if found is None:
        raise HTTPException(status_code=404, detail="Sem redirect")
    return found


@router.post("/customers", response_model=SignupOut, status_code=201)
async def signup(
    data: CustomerIn,
    request: Request,
    response: Response,
    tenant: Tenant = Depends(get_tenant_by_host),
    session: AsyncSession = Depends(get_session),
):
    session_id = _session_cookie(request, response)
    return await register_customer(session, tenant.id, data, session_id)


@router.post("/coupons/claim", response_model=ClaimOut)
async def claim(
    data: ClaimIn,
    request: Request,
    response: Response,
    tenant: Tenant = Depends(get_tenant_by_host),
    session: AsyncSession = Depends(get_session),
):
    if not await module_enabled(session, tenant.id, "coupons"):
        raise HTTPException(status_code=404, detail="Recurso indisponível")
    session_id = _session_cookie(request, response)
    return await claim_coupon(session, tenant.id, data.code, data.email, session_id)


@router.post("/events", status_code=204)
async def events(
    data: EventIn,
    request: Request,
    response: Response,
    tenant: Tenant = Depends(get_tenant_by_host),
    session: AsyncSession = Depends(get_session),
):
    if not await module_enabled(session, tenant.id, "analytics"):
        raise HTTPException(status_code=404, detail="Recurso indisponível")
    await enforce_rate_limit(f"rl:events:{client_ip(request)}", 120, 60)
    session_id = _session_cookie(request, response)
    await record_event(
        session,
        tenant.id,
        data.event_type,
        session_id,
        entity_type=data.entity_type,
        entity_slug=data.entity_slug,
        metadata=data.metadata,
    )


@router.get("/categories")
async def categories(tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    return await list_public_categories(session, tenant)


@router.get("/categories/{slug}")
async def category(
    slug: str,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    tenant: Tenant = Depends(get_tenant_by_host),
    session: AsyncSession = Depends(get_session),
):
    return await get_public_category(session, tenant, slug, page, limit)


@router.get("/pages/{slug}")
async def page(slug: str, tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    return await get_public_page(session, tenant, slug)


@router.get("/sitemap")
async def sitemap(tenant: Tenant = Depends(get_tenant_by_host), session: AsyncSession = Depends(get_session)):
    return await build_sitemap(session, tenant)
