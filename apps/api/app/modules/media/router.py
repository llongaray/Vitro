from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import enforce_rate_limit, get_current_user
from app.core.permissions import catalog_roles
from app.database.session import get_session
from app.modules.media.schemas import MediaOut
from app.modules.media.service import media_out, save_upload
from app.modules.users.models import User

router = APIRouter(prefix="/media", tags=["media"])


@router.post("", response_model=MediaOut, status_code=201)
async def upload_media(
    file: UploadFile = File(...),
    folder: str = Form("uploads"),
    alt_text: str | None = Form(None),
    user: User = Depends(catalog_roles),
    session: AsyncSession = Depends(get_session),
) -> MediaOut:
    await enforce_rate_limit(f"rl:upload:{user.id}", get_settings().upload_per_minute, 60)
    row = await save_upload(session, user.tenant_id, file, folder, alt_text)
    return MediaOut(**media_out(row))
