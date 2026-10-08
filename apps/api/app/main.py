from __future__ import annotations

import re
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.deps import client_ip
from app.core.logging import access_logger, app_logger, log_json, request_id_var, tenant_id_var, user_id_var
from app.modules.audit.service import reset_audit_context, set_audit_request
from app.modules.ads.router import router as ads_router
from app.modules.analytics.router import router as analytics_router
from app.modules.audit.router import router as audit_router
from app.modules.appearance.router import router as appearance_router
from app.modules.domains.router import router as domains_router
from app.modules.external.router import router as external_router
from app.modules.imports.router import router as imports_router
from app.modules.integrations.router import router as integrations_router
from app.modules.auth.router import router as auth_router
from app.modules.banners.router import router as banners_router
from app.modules.categories.router import router as categories_router
from app.modules.coupons.router import router as coupons_router
from app.modules.customers.router import router as customers_router
from app.modules.health.router import router as health_router
from app.modules.media.router import router as media_router
from app.modules.notices.router import router as notices_router
from app.modules.pages.router import router as pages_router
from app.modules.products.router import router as products_router
from app.modules.promotions.router import router as promotions_router
from app.modules.public.router import router as public_router
from app.modules.settings.router import router as settings_router
from app.modules.seo.router import router as seo_router
from app.modules.themes.router import router as themes_router
from app.modules.users.router import router as users_router

settings = get_settings()
app = FastAPI(title="Vitrio API", version="0.1.0", docs_url="/docs", redoc_url="/redoc")

origin_regex = rf"^https?://([a-z0-9-]+\.)*{re.escape(settings.base_domain)}(:\d+)?$"
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def access_log(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    set_audit_request(client_ip(request), request.headers.get("user-agent") or "")
    req_token = request_id_var.set(request_id)
    tenant_token = tenant_id_var.set("-")
    user_token = user_id_var.set("-")
    started = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["X-Request-Id"] = request_id
        return response
    finally:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        log_json(
            access_logger,
            "info" if status < 500 else "error",
            "request",
            route=request.url.path,
            method=request.method,
            status=status,
            duration_ms=duration_ms,
        )
        user_id_var.reset(user_token)
        tenant_id_var.reset(tenant_token)
        request_id_var.reset(req_token)
        reset_audit_context()


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return await http_exception_handler(request, exc)
    log_json(app_logger, "error", "unhandled", error=str(exc), route=request.url.path, method=request.method, status=500)
    return JSONResponse(status_code=500, content={"detail": "Erro interno"})


api = "/api/v1"
app.include_router(health_router)
app.include_router(auth_router, prefix=api)
app.include_router(settings_router, prefix=api)
app.include_router(categories_router, prefix=api)
app.include_router(products_router, prefix=api)
app.include_router(banners_router, prefix=api)
app.include_router(pages_router, prefix=api)
app.include_router(media_router, prefix=api)
app.include_router(promotions_router, prefix=api)
app.include_router(coupons_router, prefix=api)
app.include_router(customers_router, prefix=api)
app.include_router(seo_router, prefix=api)
app.include_router(analytics_router, prefix=api)
app.include_router(audit_router, prefix=api)
app.include_router(ads_router, prefix=api)
app.include_router(users_router, prefix=api)
app.include_router(notices_router, prefix=api)
app.include_router(themes_router, prefix=api)
app.include_router(domains_router, prefix=api)
app.include_router(appearance_router, prefix=api)
app.include_router(imports_router, prefix=api)
app.include_router(integrations_router, prefix=api)
app.include_router(external_router, prefix=api)
app.include_router(public_router, prefix=api)
