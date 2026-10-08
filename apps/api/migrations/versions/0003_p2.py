"""appearance, integrations and api keys

Revision ID: 0003_p2
Revises: 0002_p1
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_p2"
down_revision: Union[str, None] = "0002_p1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SECTIONS = '["hero","banners","categories","featured","promotions","clearance","about"]'


def upgrade() -> None:
    op.add_column("tenants", sa.Column("font_pair", sa.String(24), nullable=False, server_default="classic"))
    op.add_column("tenants", sa.Column("hero_text", sa.Text()))
    op.add_column(
        "tenants",
        sa.Column("section_order", postgresql.JSONB(), nullable=False, server_default=sa.text(f"'{_SECTIONS}'::jsonb")),
    )
    op.create_table(
        "integrations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("public_id", sa.String(160), nullable=False),
        sa.Column("secret_encrypted", sa.Text()),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "provider", name="uq_integrations_tenant_provider"),
    )
    op.create_index("idx_integrations_tenant", "integrations", ["tenant_id"])
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("prefix", sa.String(16), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("key_hash", name="uq_api_keys_hash"),
    )
    op.create_index("idx_api_keys_tenant", "api_keys", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("api_keys")
    op.drop_table("integrations")
    op.drop_column("tenants", "section_order")
    op.drop_column("tenants", "hero_text")
    op.drop_column("tenants", "font_pair")
