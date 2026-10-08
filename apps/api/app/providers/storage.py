from __future__ import annotations

import asyncio
from pathlib import Path

from app.core.config import get_settings


class LocalStorageProvider:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def destination(self, relative_path: str) -> Path:
        parts = Path(relative_path).parts
        if not relative_path or any(part in {"..", ""} for part in parts):
            raise ValueError("caminho inválido")
        target = (self.root / relative_path).resolve()
        if not target.is_relative_to(self.root):
            raise ValueError("caminho inválido")
        return target

    async def save(self, relative_path: str, data: bytes) -> None:
        target = self.destination(relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(target.write_bytes, data)

    async def delete(self, relative_path: str | None) -> None:
        if not relative_path:
            return
        target = self.destination(relative_path)
        if target.is_file():
            await asyncio.to_thread(target.unlink)


def get_storage() -> LocalStorageProvider:
    return LocalStorageProvider(Path(get_settings().storage_path))


def media_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://") or path.startswith("/media/"):
        return path
    return f"/media/{path.lstrip('/')}"
