from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class SeoRedirect(Base):
    __tablename__ = "seo_redirects"
    __table_args__ = (UniqueConstraint("tenant_id", "source_path", name="uq_seo_redirects_source"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    source_path: Mapped[str] = mapped_column(String(400), nullable=False)
    destination_path: Mapped[str] = mapped_column(String(400), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, default=301, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
