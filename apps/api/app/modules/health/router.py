from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.modules.health import service as health_service

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/health/live")
async def live() -> dict:
    return {"status": "live"}


@router.get("/health/ready")
async def ready():
    checks = {
        "database": await health_service.check_database(),
        "redis": await health_service.check_redis(),
        "storage": await health_service.check_storage(),
    }
    body = {"status": "ready" if all(checks.values()) else "not_ready", "checks": checks}
    if not all(checks.values()):
        return JSONResponse(status_code=503, content=body)
    return body
