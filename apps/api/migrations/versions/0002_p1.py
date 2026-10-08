"""promotions, coupons, customers, redirects, analytics

Revision ID: 0002_p1
Revises: 0001_initial
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_p1"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("clearance_label", sa.String(80)))
    op.add_column("products", sa.Column("clearance_start", sa.DateTime(timezone=True)))
    op.add_column("products", sa.Column("clearance_end", sa.DateTime(timezone=True)))
    op.create_table(
        "promotions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("start_at", sa.DateTime(timezone=True)),
        sa.Column("end_at", sa.DateTime(timezone=True)),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_promotions_tenant", "promotions", ["tenant_id"])
    op.create_table(
        "promotion_products",
        sa.Column("promotion_id", sa.Uuid(), sa.ForeignKey("promotions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_index("idx_promotion_products_tenant", "promotion_products", ["tenant_id"])
    op.create_table(
        "customers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(40)),
        sa.Column("document", sa.String(40)),
        sa.Column("birth_date", sa.Date()),
        sa.Column("accepted_marketing", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("accepted_terms", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "email", name="uq_customers_tenant_email"),
    )
    op.create_index("idx_customers_tenant", "customers", ["tenant_id"])
    op.create_table(
        "customer_consents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", sa.Uuid(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("version", sa.String(16), nullable=False, server_default="1"),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_customer_consents_customer", "customer_consents", ["customer_id"])
    op.create_table(
        "coupons",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("discount_type", sa.String(16), nullable=False),
        sa.Column("discount_value", sa.Numeric(12, 2), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True)),
        sa.Column("end_at", sa.DateTime(timezone=True)),
        sa.Column("max_uses", sa.Integer()),
        sa.Column("max_uses_per_customer", sa.Integer()),
        sa.Column("minimum_value", sa.Numeric(12, 2)),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("scope", sa.String(20), nullable=False, server_default="ALL_PRODUCTS"),
        sa.Column("category_id", sa.Uuid(), sa.ForeignKey("categories.id", ondelete="SET NULL")),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id", ondelete="SET NULL")),
        sa.Column("grant_on_signup", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "code", name="uq_coupons_tenant_code"),
    )
    op.create_index("idx_coupons_tenant", "coupons", ["tenant_id"])
    op.create_index("uq_coupons_signup", "coupons", ["tenant_id"], unique=True, postgresql_where=sa.text("grant_on_signup AND active"))
    op.create_table(
        "coupon_redemptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("coupon_id", sa.Uuid(), sa.ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer_id", sa.Uuid(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_coupon_redemptions_coupon_customer", "coupon_redemptions", ["coupon_id", "customer_id"])
    op.create_table(
        "seo_redirects",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_path", sa.String(400), nullable=False),
        sa.Column("destination_path", sa.String(400), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False, server_default="301"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "source_path", name="uq_seo_redirects_source"),
    )
    op.create_index("idx_seo_redirects_tenant", "seo_redirects", ["tenant_id"])
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("entity_type", sa.String(40)),
        sa.Column("entity_id", sa.Uuid()),
        sa.Column("session_id", sa.String(64), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_analytics_events_tenant_type", "analytics_events", ["tenant_id", "event_type", "created_at"])


def downgrade() -> None:
    op.drop_table("analytics_events")
    op.drop_table("seo_redirects")
    op.drop_table("coupon_redemptions")
    op.drop_index("uq_coupons_signup", table_name="coupons")
    op.drop_table("coupons")
    op.drop_table("customer_consents")
    op.drop_table("customers")
    op.drop_table("promotion_products")
    op.drop_table("promotions")
    op.drop_column("products", "clearance_end")
    op.drop_column("products", "clearance_start")
    op.drop_column("products", "clearance_label")
