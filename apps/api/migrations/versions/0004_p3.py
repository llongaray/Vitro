"""tenant modules, automations and notifications

Revision ID: 0004_p3
Revises: 0003_p2
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_p3"
down_revision: Union[str, None] = "0003_p2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenant_modules",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module", sa.String(40), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("tenant_id", "module", name="uq_tenant_modules"),
    )
    op.create_index("idx_tenant_modules_tenant", "tenant_modules", ["tenant_id"])
    op.create_table(
        "automations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trigger", sa.String(40), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("tenant_id", "trigger", name="uq_automations_tenant_trigger"),
    )
    op.create_index("idx_automations_tenant", "automations", ["tenant_id"])
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_notifications_tenant", "notifications", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("automations")
    op.drop_table("tenant_modules")
