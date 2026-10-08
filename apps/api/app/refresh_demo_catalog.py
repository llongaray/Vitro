"""Atualiza o catálogo da loja demo já existente: textos, fotos e limpeza dos itens de teste."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from sqlalchemy import select

from app.database.session import SessionLocal
from app.modules.audit.models import Ad
from app.modules.banners.models import Banner
from app.modules.categories.models import Category
from app.modules.media.models import Media
from app.modules.products.models import Product, ProductImage
from app.modules.seo.service import record_redirect
from app.modules.tenants.models import DEFAULT_SECTIONS, Tenant
from app.providers.storage import get_storage
from app.seed import _picture_named
from app.services.invalidate import invalidate_tenant

_UPDATES = {
    "camisa-de-linho": {
        "name": "Camisa de lã cinza",
        "slug": "camisa-de-la-cinza",
        "sku": "CAM-LA-CINZA",
        "brand": "Loja Demo",
        "short_description": "Lã cinza, gola, dois bolsos e botões escuros.",
        "description": "Camisa de lã na cor cinza, com gola, dois bolsos no peito e botões escuros. Corte reto para o dia a dia.",
        "price": 189.90,
        "show_price": "inherit",
        "stock_display": "Pronta entrega",
        "keywords": "camisa la cinza roupa",
        "is_featured": True,
        "asset": "camisa-linho",
        "alt": "Camisa de lã cinza",
        "redirect": "/produtos/camisa-de-linho",
    },
    "luminaria-de-mesa": {
        "name": "Luminária de mesa articulada",
        "slug": "luminaria-de-mesa-articulada",
        "sku": "LUM-MESA-PRETA",
        "brand": "Loja Demo",
        "short_description": "Cúpula preta, braço articulado e juntas douradas.",
        "description": "Luminária de mesa preta com base redonda, cúpula e braço articulado. As juntas são douradas. O preço fica sob consulta.",
        "price": 240,
        "show_price": "hide",
        "stock_display": "Sob encomenda",
        "keywords": "luminaria mesa preta articulada",
        "is_featured": True,
        "asset": "luminaria",
        "alt": "Luminária de mesa articulada",
        "redirect": "/produtos/luminaria-de-mesa",
    },
    "tenis-urbano": {
        "name": "Tênis urbano branco",
        "slug": "tenis-urbano-branco",
        "sku": "TEN-URB-BRANCO",
        "brand": "Loja Demo",
        "short_description": "Malha clara, cadarço branco e solado macio.",
        "description": "Tênis branco para caminhar na cidade. Cabedal em malha, cadarço branco e solado macio.",
        "price": 329,
        "show_price": "inherit",
        "stock_display": "Pronta entrega",
        "keywords": "tenis branco urbano calcado",
        "is_featured": True,
        "asset": "tenis",
        "alt": "Tênis urbano branco",
        "redirect": "/produtos/tenis-urbano",
    },
}

_TEST_PREFIXES = ("Luminaria Aurora ", "Luminaria CSV ", "Vela P1 ")
_TEST_CATEGORIES = ("Cestos ",)


async def refresh() -> None:
    async with SessionLocal() as session:
        tenant = await session.scalar(select(Tenant).where(Tenant.slug == "demo"))
        if tenant is None:
            return
        storage = get_storage()
        for old_slug, data in _UPDATES.items():
            product = await session.scalar(
                select(Product).where(Product.tenant_id == tenant.id, Product.slug.in_([old_slug, data["slug"]]), Product.deleted_at.is_(None))
            )
            if product is None:
                continue
            previous = product.slug
            for field in ("name", "slug", "sku", "brand", "short_description", "description", "show_price", "stock_display", "keywords", "is_featured"):
                setattr(product, field, data[field])
            product.price = data["price"]
            if previous != data["slug"]:
                await record_redirect(session, tenant.id, data["redirect"], f"/produtos/{data['slug']}")
            image = await session.scalar(select(ProductImage).where(ProductImage.product_id == product.id).order_by(ProductImage.sort_order))
            if image is None:
                continue
            media = await session.get(Media, image.media_id)
            if media is None:
                continue
            main, thumb, width, height = _picture_named(data["asset"])
            relative = f"tenants/{tenant.id}/products/{data['asset']}-foto.webp"
            thumb_relative = f"tenants/{tenant.id}/products/{data['asset']}-foto_thumb.webp"
            await storage.save(relative, main)
            await storage.save(thumb_relative, thumb)
            media.path = relative
            media.thumb_path = thumb_relative
            media.size = len(main)
            media.width = width
            media.height = height
            media.alt_text = data["alt"]
            image.alt = data["alt"]
        now = datetime.now(UTC)
        leftovers = (
            await session.scalars(select(Product).where(Product.tenant_id == tenant.id, Product.deleted_at.is_(None)))
        ).all()
        removed = 0
        for product in leftovers:
            if product.name.startswith(_TEST_PREFIXES):
                product.deleted_at = now
                product.is_active = False
                removed += 1
        categories = (await session.scalars(select(Category).where(Category.tenant_id == tenant.id, Category.deleted_at.is_(None)))).all()
        hidden_categories = 0
        for category in categories:
            if category.name.startswith(_TEST_CATEGORIES):
                category.deleted_at = now
                category.is_active = False
                hidden_categories += 1
        banner = await session.scalar(select(Banner).where(Banner.tenant_id == tenant.id, Banner.deleted_at.is_(None)).order_by(Banner.sort_order))
        if banner and banner.desktop_media_id:
            banner_media = await session.get(Media, banner.desktop_media_id)
            if banner_media is not None:
                main, thumb, width, height = _picture_named("novidades")
                relative = f"tenants/{tenant.id}/banners/novidades-foto.webp"
                thumb_relative = f"tenants/{tenant.id}/banners/novidades-foto_thumb.webp"
                await storage.save(relative, main)
                await storage.save(thumb_relative, thumb)
                banner_media.path = relative
                banner_media.thumb_path = thumb_relative
                banner_media.size = len(main)
                banner_media.width = width
                banner_media.height = height
                banner_media.alt_text = "Novidades da semana"
                banner.title = "Novidades da semana"
        tenant.hero_text = "Peças selecionadas para o dia a dia, com atendimento direto da loja."
        tenant.section_order = list(DEFAULT_SECTIONS)
        tenant.font_pair = "classic"
        ads = (await session.scalars(select(Ad).where(Ad.tenant_id == tenant.id, Ad.active.is_(True)))).all()
        for ad in ads:
            if ad.title.startswith("Oferta ") and ad.title.removeprefix("Oferta ").isdigit():
                ad.active = False
        await session.commit()
        await invalidate_tenant(session, tenant.id)
        print(f"catalogo atualizado, {removed} itens de teste ocultados, {hidden_categories} categorias ocultadas")


def main() -> None:
    asyncio.run(refresh())


if __name__ == "__main__":
    main()
