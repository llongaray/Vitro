from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import client_ip, enforce_rate_limit, get_current_user, get_tenant_by_host
from app.database.session import get_session
from app.modules.auth.schemas import LoginIn, RegisterStoreIn, TokenOut, UserOut
from app.modules.auth.service import login, register_store, revoke_refresh, rotate_refresh
from app.modules.tenants.models import Tenant
from app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "vitrio_refresh"


def _cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=COOKIE,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_days * 86400,
        path="/api",
    )


@router.post("/register-store", response_model=TokenOut, status_code=201)
async def register(data: RegisterStoreIn, response: Response, session: AsyncSession = Depends(get_session)) -> TokenOut:
    payload, refresh = await register_store(session, data)
    _cookie(response, refresh)
    return payload


@router.post("/login", response_model=TokenOut)
async def login_route(
    data: LoginIn,
    request: Request,
    response: Response,
    tenant: Tenant = Depends(get_tenant_by_host),
    session: AsyncSession = Depends(get_session),
) -> TokenOut:
    await enforce_rate_limit(f"rl:login:{client_ip(request)}", get_settings().login_per_minute, 60)
    payload, refresh = await login(session, tenant, data.email, data.password)
    _cookie(response, refresh)
    return payload


@router.post("/refresh", response_model=TokenOut)
async def refresh_route(
    response: Response,
    session: AsyncSession = Depends(get_session),
    vitrio_refresh: str | None = Cookie(default=None),
) -> TokenOut:
    payload, refresh = await rotate_refresh(session, vitrio_refresh)
    _cookie(response, refresh)
    return payload


@router.post("/logout", status_code=204)
async def logout_route(
    response: Response,
    session: AsyncSession = Depends(get_session),
    vitrio_refresh: str | None = Cookie(default=None),
) -> None:
    await revoke_refresh(session, vitrio_refresh)
    response.delete_cookie(COOKIE, path="/api")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
