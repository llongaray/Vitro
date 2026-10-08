from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_session
from app.modules.analytics.schemas import SummaryOut
from app.modules.analytics.service import summary
from app.modules.notices.modules_service import module_enabled
from app.modules.users.models import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def _enabled(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> None:
    if not await module_enabled(session, user.tenant_id, "analytics"):
        raise HTTPException(status_code=404, detail="Recurso indisponível")


@router.get("/summary", response_model=SummaryOut, dependencies=[Depends(_enabled)])
async def summary_route(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
):
    return await summary(session, user.tenant_id, from_date, to_date)
