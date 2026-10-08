from fastapi import Depends, HTTPException

from app.core.deps import get_current_user
from app.modules.users.models import User


def allow(*roles: str):
    permitted = set(roles)

    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in permitted:
            raise HTTPException(status_code=403, detail="Sem permissão")
        return user

    return checker


catalog_roles = allow("OWNER", "ADMIN", "EDITOR")
store_roles = allow("OWNER", "ADMIN")
