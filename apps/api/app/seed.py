from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from PIL import Image
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.modules.banners.models import Banner
from app.modules.categories.models import Category
from app.modules.media.models import Media
from app.modules.pages.models import Page
from app.modules.products.models import Product, ProductCategory, ProductImage
from app.modules.tenants.models import Domain, Tenant
from app.modules.users.models import User
from app.providers.storage import get_storage


_COLORS = {
    "camisa-linho": (196, 149, 106),
    "luminaria": (232, 214, 186),
    "tenis": (68, 64, 60),
    "novidades": (154, 52, 18),
}
_ASSET_DIR = Path(__file__).resolve().parent / "seed_assets"
# Fotos livres (Pexels): camisa 13094146, luminária 8263858, tênis 1464625.


def _encode(image: Image.Image) -> tuple[bytes, bytes, int, int]:
    picture = image.convert("RGB")
    picture.thumbnail((1200, 1200))
    main = BytesIO()
    picture.save(main, format="WEBP", quality=82)
    thumb = picture.copy()
    thumb.thumbnail((480, 480))
    thumb_buffer = BytesIO()
    thumb.save(thumb_buffer, format="WEBP", quality=76)
    return main.getvalue(), thumb_buffer.getvalue(), picture.width, picture.height


def _picture(color: tuple[int, int, int]) -> tuple[bytes, bytes, int, int]:
    return _encode(Image.new("RGB", (960, 720), color))


def _picture_named(name: str) -> tuple[bytes, bytes, int, int]:
    asset = _ASSET_DIR / f"{name}.jpg"
    if asset.is_file():
        with Image.open(asset) as image:
            return _encode(image)
    return _picture(_COLORS.get(name, (120, 113, 108)))


async def _media(session, tenant_id, folder: str, name: str, alt: str) -> Media:
    main, thumb, width, height = _picture_named(name)
    relative = f"tenants/{tenant_id}/{folder}/{name}.webp"
    thumb_relative = f"tenants/{tenant_id}/{folder}/{name}_thumb.webp"
    storage = get_storage()
    await storage.save(relative, main)
    await storage.save(thumb_relative, thumb)
    row = Media(
        tenant_id=tenant_id,
        provider="local",
        path=relative,
        thumb_path=thumb_relative,
        mime_type="image/webp",
        size=len(main),
        width=width,
        height=height,
        hash=name,
        alt_text=alt,
        created_at=datetime.now(UTC),
    )
    session.add(row)
    await session.flush()
    return row


async def _ensure_files(session, tenant_id) -> None:
    rows = (await session.scalars(select(Media).where(Media.tenant_id == tenant_id))).all()
    storage = get_storage()
    for row in rows:
        if storage.destination(row.path).is_file():
            continue
        main, thumb, _width, _height = _picture_named(row.hash or "")
        await storage.save(row.path, main)
        if row.thumb_path:
            await storage.save(row.thumb_path, thumb)


async def seed() -> None:
    settings = get_settings()
    async with SessionLocal() as session:
        existing = await session.scalar(select(Tenant).where(Tenant.slug == "demo"))
        if existing:
            await _ensure_files(session, existing.id)
            from app.modules.notices.modules_service import ensure_store_defaults

            await ensure_store_defaults(session, existing.id)
            await session.commit()
            from app.refresh_demo_catalog import refresh

            await refresh()
            return
        tenant = Tenant(
            name="Loja Demo",
            trade_name="Loja Demo",
            slug="demo",
            description="Vitrine de demonstração do Vitrio. Peças selecionadas, atendimento direto com a loja.",
            primary_color="#9a3412",
            secondary_color="#1c1917",
            phone="(11) 3000-0000",
            whatsapp="5511999990000",
            instagram="lojadeno",
            address="Rua das Vitrines, 120 — São Paulo",
            business_hours="Seg a sáb, 10h às 19h",
            show_prices=True,
            contact_type="whatsapp",
            contact_value="5511999990000",
            contact_message_template="Olá! Vi o produto {product_name} no site e gostaria de mais informações.\n\n{product_url}",
            seo_title="Loja Demo",
            seo_description="Vitrine digital da Loja Demo em São Paulo.",
            site_name="Loja Demo",
            hero_text="Peças selecionadas para o dia a dia, com atendimento direto da loja.",
            city="São Paulo",
            state="SP",
            country="Brasil",
            indexing_enabled=True,
        )
        session.add(tenant)
        await session.flush()
        session.add(
            Domain(
                tenant_id=tenant.id,
                hostname=f"demo.{settings.base_domain}",
                is_primary=True,
                verified=True,
                created_at=datetime.now(UTC),
            )
        )
        session.add(
            User(
                tenant_id=tenant.id,
                email=settings.demo_owner_email.lower(),
                password_hash=hash_password(settings.demo_owner_password),
                name=settings.demo_owner_name,
                role="OWNER",
            )
        )
        clothes = Category(tenant_id=tenant.id, name="Roupas", slug="roupas", description="Peças para o dia a dia.", is_active=True, sort_order=1)
        home = Category(tenant_id=tenant.id, name="Casa", slug="casa", description="Objetos para a casa.", is_active=True, sort_order=2)
        session.add_all([clothes, home])
        await session.flush()
        shirt_media = await _media(session, tenant.id, "products", "camisa-linho", "Camisa de lã cinza")
        lamp_media = await _media(session, tenant.id, "products", "luminaria", "Luminária de mesa articulada")
        shoe_media = await _media(session, tenant.id, "products", "tenis", "Tênis urbano branco")
        banner_media = await _media(session, tenant.id, "banners", "novidades", "Novidades da semana")
        shirt = Product(
            tenant_id=tenant.id,
            category_id=clothes.id,
            name="Camisa de lã cinza",
            slug="camisa-de-la-cinza",
            sku="CAM-LA-CINZA",
            brand="Loja Demo",
            short_description="Lã cinza, gola, dois bolsos e botões escuros.",
            description="Camisa de lã na cor cinza, com gola, dois bolsos no peito e botões escuros. Corte reto para o dia a dia.",
            price=189.90,
            show_price="inherit",
            is_featured=True,
            is_active=True,
            stock_display="Pronta entrega",
            keywords="camisa la cinza roupa",
            published_at=datetime.now(UTC),
        )
        lamp = Product(
            tenant_id=tenant.id,
            category_id=home.id,
            name="Luminária de mesa articulada",
            slug="luminaria-de-mesa-articulada",
            sku="LUM-MESA-PRETA",
            brand="Loja Demo",
            short_description="Cúpula preta, braço articulado e juntas douradas.",
            description="Luminária de mesa preta com base redonda, cúpula e braço articulado. As juntas são douradas. O preço fica sob consulta.",
            price=240,
            show_price="hide",
            is_featured=True,
            is_active=True,
            stock_display="Sob encomenda",
            keywords="luminaria mesa preta articulada",
            published_at=datetime.now(UTC),
        )
        shoe = Product(
            tenant_id=tenant.id,
            category_id=clothes.id,
            name="Tênis urbano branco",
            slug="tenis-urbano-branco",
            sku="TEN-URB-BRANCO",
            brand="Loja Demo",
            short_description="Malha clara, cadarço branco e solado macio.",
            description="Tênis branco para caminhar na cidade. Cabedal em malha, cadarço branco e solado macio.",
            price=329,
            show_price="inherit",
            is_featured=True,
            is_active=True,
            stock_display="Pronta entrega",
            keywords="tenis branco urbano calcado",
            published_at=datetime.now(UTC),
        )
        session.add_all([shirt, lamp, shoe])
        await session.flush()
        session.add_all(
            [
                ProductCategory(product_id=shirt.id, category_id=clothes.id, tenant_id=tenant.id),
                ProductCategory(product_id=lamp.id, category_id=home.id, tenant_id=tenant.id),
                ProductCategory(product_id=shoe.id, category_id=clothes.id, tenant_id=tenant.id),
                ProductImage(product_id=shirt.id, media_id=shirt_media.id, tenant_id=tenant.id, sort_order=1, alt="Camisa de lã cinza"),
                ProductImage(product_id=lamp.id, media_id=lamp_media.id, tenant_id=tenant.id, sort_order=1, alt="Luminária de mesa articulada"),
                ProductImage(product_id=shoe.id, media_id=shoe_media.id, tenant_id=tenant.id, sort_order=1, alt="Tênis urbano branco"),
            ]
        )
        session.add(
            Banner(
                tenant_id=tenant.id,
                title="Novidades da semana",
                desktop_media_id=banner_media.id,
                mobile_media_id=banner_media.id,
                url="/produtos",
                position="home",
                sort_order=1,
                active=True,
            )
        )
        session.add(
            Page(
                tenant_id=tenant.id,
                title="Sobre",
                slug="sobre",
                kind="about",
                published=True,
                content="A Loja Demo é uma vitrine de exemplo do Vitrio. O atendimento e a venda acontecem direto com a loja.",
                seo_title="Sobre a Loja Demo",
                seo_description="Conheça a Loja Demo.",
            )
        )
        from app.modules.notices.modules_service import ensure_store_defaults

        await ensure_store_defaults(session, tenant.id)
        await session.commit()


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
