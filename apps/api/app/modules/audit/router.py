from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import allow
from app.database.session import get_session
from app.modules.audit.models import AuditLog
from app.modules.users.models import User

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(allow("OWNER", "ADMIN")),
    session: AsyncSession = Depends(get_session),
):
    filters = (AuditLog.tenant_id == user.tenant_id,)
    total = int(await session.scalar(select(func.count()).select_from(AuditLog).where(*filters)) or 0)
    rows = await session.scalars(
        select(AuditLog).where(*filters).order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "items": [
            {
                "id": row.id,
                "action": row.action,
                "entity_type": row.entity_type,
                "entity_id": row.entity_id,
                "old_value": row.old_value,
                "new_value": row.new_value,
                "created_at": row.created_at,
            }
            for row in rows
        ],
    }
