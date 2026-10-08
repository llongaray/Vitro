from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database.session import get_session
from app.modules.customers.schemas import CustomerOut
from app.modules.customers.service import list_customers
from app.modules.users.models import User

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
async def list_route(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await list_customers(session, user.tenant_id)
