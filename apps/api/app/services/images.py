from __future__ import annotations

import hashlib
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


class ImageRejected(Exception):
    pass


def process_image(data: bytes, filename: str, content_type: str | None, max_bytes: int, max_edge: int, thumb_edge: int) -> tuple[bytes, bytes, int, int, str]:
    if len(data) > max_bytes:
        raise ImageRejected("Arquivo maior que o limite")
    extension = Path(filename or "").suffix.lower()
    mime = (content_type or "").split(";")[0].strip().lower()
    if extension not in ALLOWED_EXT or mime not in ALLOWED_MIME:
        raise ImageRejected("Formato de imagem não permitido")
    try:
        with Image.open(BytesIO(data)) as probe:
            probe.verify()
        with Image.open(BytesIO(data)) as image:
            converted = image.convert("RGB")
            converted.thumbnail((max_edge, max_edge))
            width, height = converted.size
            main = BytesIO()
            converted.save(main, format="WEBP", quality=82)
            thumb_image = converted.copy()
            thumb_image.thumbnail((thumb_edge, thumb_edge))
            thumb = BytesIO()
            thumb_image.save(thumb, format="WEBP", quality=78)
    except ImageRejected:
        raise
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageRejected("Arquivo de imagem inválido") from exc
    digest = hashlib.sha256(data).hexdigest()
    return main.getvalue(), thumb.getvalue(), width, height, digest
