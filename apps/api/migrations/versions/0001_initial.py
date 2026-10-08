"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("trade_name", sa.String(160), nullable=False),
        sa.Column("slug", sa.String(63), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("logo_media_id", sa.Uuid()),
        sa.Column("favicon_media_id", sa.Uuid()),
        sa.Column("primary_color", sa.String(16), nullable=False, server_default="#9a3412"),
        sa.Column("secondary_color", sa.String(16), nullable=False, server_default="#1c1917"),
        sa.Column("phone", sa.String(40)),
        sa.Column("whatsapp", sa.String(40)),
        sa.Column("instagram", sa.String(120)),
        sa.Column("facebook", sa.String(200)),
        sa.Column("address", sa.Text()),
        sa.Column("business_hours", sa.Text()),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="America/Sao_Paulo"),
        sa.Column("currency", sa.String(8), nullable=False, server_default="BRL"),
        sa.Column("locale", sa.String(16), nullable=False, server_default="pt-BR"),
        sa.Column("show_prices", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("contact_type", sa.String(24), nullable=False, server_default="whatsapp"),
        sa.Column("contact_value", sa.String(200)),
        sa.Column("contact_message_template", sa.Text()),
        sa.Column("seo_title", sa.String(180)),
        sa.Column("seo_description", sa.String(320)),
        sa.Column("seo_og_image", sa.String(400)),
        sa.Column("site_name", sa.String(160)),
        sa.Column("language", sa.String(16), nullable=False, server_default="pt-BR"),
        sa.Column("city", sa.String(120)),
        sa.Column("state", sa.String(80)),
        sa.Column("country", sa.String(80), server_default="Brasil"),
        sa.Column("indexing_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("slug", name="uq_tenants_slug"),
    )
    op.create_table(
        "media",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False, server_default="local"),
        sa.Column("path", sa.String(500), nullable=False),
        sa.Column("thumb_path", sa.String(500)),
        sa.Column("mime_type", sa.String(80), nullable=False),
        sa.Column("size", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer()),
        sa.Column("height", sa.Integer()),
        sa.Column("hash", sa.String(64), nullable=False),
        sa.Column("alt_text", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_media_tenant", "media", ["tenant_id"])
    op.create_foreign_key("fk_tenants_logo_media", "tenants", "media", ["logo_media_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_tenants_favicon_media", "tenants", "media", ["favicon_media_id"], ["id"], ondelete="SET NULL")
    op.create_table(
        "domains",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hostname", sa.String(255), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verification_token", sa.String(120)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("hostname", name="uq_domains_hostname"),
    )
    op.create_index("idx_domains_tenant", "domains", ["tenant_id"])
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("role", sa.String(32), nullable=False, server_default="OWNER"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )
    op.create_index("idx_users_tenant", "users", ["tenant_id"])
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_hash"),
    )
    op.create_index("idx_refresh_tokens_user", "refresh_tokens", ["user_id"])
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("seo_title", sa.String(180)),
        sa.Column("seo_description", sa.String(320)),
        sa.Column("seo_canonical", sa.String(400)),
        sa.Column("seo_index", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("seo_follow", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("seo_og_image", sa.String(400)),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_categories_tenant", "categories", ["tenant_id"])
    op.create_index("idx_categories_tenant_active", "categories", ["tenant_id", "is_active"])
    op.create_index(
        "uq_categories_tenant_slug",
        "categories",
        ["tenant_id", "slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", sa.Uuid(), sa.ForeignKey("categories.id", ondelete="SET NULL")),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("sku", sa.String(80)),
        sa.Column("brand", sa.String(120)),
        sa.Column("description", sa.Text()),
        sa.Column("short_description", sa.String(320)),
        sa.Column("price", sa.Numeric(12, 2)),
        sa.Column("promotional_price", sa.Numeric(12, 2)),
        sa.Column("show_price", sa.String(16), nullable=False, server_default="inherit"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_promotion", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_clearance", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("stock_display", sa.String(80)),
        sa.Column("keywords", sa.Text()),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("seo_title", sa.String(180)),
        sa.Column("seo_description", sa.String(320)),
        sa.Column("seo_canonical", sa.String(400)),
        sa.Column("seo_index", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("seo_follow", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("seo_og_image", sa.String(400)),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed(
                "to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(keywords, '') || ' ' || coalesce(brand, ''))",
                persisted=True,
            ),
        ),
    )
    op.create_index("idx_products_tenant", "products", ["tenant_id"])
    op.create_index("idx_products_tenant_active", "products", ["tenant_id", "is_active"])
    op.create_index("idx_products_tenant_category", "products", ["tenant_id", "category_id"])
    op.create_index("idx_products_tenant_promotion", "products", ["tenant_id", "is_promotion"])
    op.create_index("idx_products_tenant_clearance", "products", ["tenant_id", "is_clearance"])
    op.create_index("idx_products_search", "products", ["search_vector"], postgresql_using="gin")
    op.create_index(
        "uq_products_tenant_slug",
        "products",
        ["tenant_id", "slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_table(
        "product_categories",
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category_id", sa.Uuid(), sa.ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_index("idx_product_categories_tenant", "product_categories", ["tenant_id"])
    op.create_table(
        "product_images",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("product_id", sa.Uuid(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_id", sa.Uuid(), sa.ForeignKey("media.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("alt", sa.String(200)),
    )
    op.create_index("idx_product_images_product", "product_images", ["product_id"])
    op.create_table(
        "banners",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("desktop_media_id", sa.Uuid(), sa.ForeignKey("media.id", ondelete="SET NULL")),
        sa.Column("mobile_media_id", sa.Uuid(), sa.ForeignKey("media.id", ondelete="SET NULL")),
        sa.Column("url", sa.String(400)),
        sa.Column("position", sa.String(40), nullable=False, server_default="home"),
        sa.Column("start_at", sa.DateTime(timezone=True)),
        sa.Column("end_at", sa.DateTime(timezone=True)),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_banners_tenant", "banners", ["tenant_id"])
    op.create_table(
        "pages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("tenant_id", sa.Uuid(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("content", sa.Text()),
        sa.Column("kind", sa.String(32), nullable=False, server_default="custom"),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("seo_title", sa.String(180)),
        sa.Column("seo_description", sa.String(320)),
        sa.Column("seo_canonical", sa.String(400)),
        sa.Column("seo_index", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("seo_follow", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("seo_og_image", sa.String(400)),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_pages_tenant", "pages", ["tenant_id"])
    op.create_index(
        "uq_pages_tenant_slug",
        "pages",
        ["tenant_id", "slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_table("pages")
    op.drop_table("banners")
    op.drop_table("product_images")
    op.drop_table("product_categories")
    op.drop_index("idx_products_search", table_name="products")
    op.drop_table("products")
    op.drop_table("categories")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    op.drop_table("domains")
    op.drop_constraint("fk_tenants_favicon_media", "tenants", type_="foreignkey")
    op.drop_constraint("fk_tenants_logo_media", "tenants", type_="foreignkey")
    op.drop_table("media")
    op.drop_table("tenants")
