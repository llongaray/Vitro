import os
import tempfile
from pathlib import Path

_storage = Path(tempfile.mkdtemp(prefix="vitrio-storage-"))
os.environ["STORAGE_PATH"] = str(_storage)
os.environ["JWT_SECRET"] = "test-secret-vitrio-please-change"
os.environ["STORAGE_SECRET"] = "test-storage"
os.environ["REVALIDATE_SECRET"] = "test-revalidate"
os.environ["BASE_DOMAIN"] = "localhost"
os.environ["SITE_INTERNAL_URL"] = "http://127.0.0.1:9"
os.environ["COOKIE_SECURE"] = "false"
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

_database_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://vitrio:vitrio@127.0.0.1:5433/vitrio")
_base, _, _name = _database_url.rpartition("/")
if _name != "vitrio_test":
    _database_url = f"{_base}/vitrio_test"
os.environ["DATABASE_URL"] = _database_url

import asyncpg
import pytest_asyncio
from fakeredis.aioredis import FakeRedis
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine.url import make_url

from app.core.config import get_settings
from app.services.dns import set_txt_lookup

get_settings.cache_clear()

import app.database.registry  # noqa: F401
from app.core.redis import set_redis
from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.main import app


async def _ensure_database() -> None:
    parsed = make_url(os.environ["DATABASE_URL"])
    connection = await asyncpg.connect(
        user=parsed.username,
        password=parsed.password,
        host=parsed.host or "localhost",
        port=parsed.port or 5432,
        database="postgres",
    )
    try:
        exists = await connection.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", parsed.database)
        if not exists:
            await connection.execute(f'CREATE DATABASE "{parsed.database}"')
    finally:
        await connection.close()


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def database():
    await _ensure_database()
    async with engine.begin() as connection:
        await connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await connection.execute(text("CREATE SCHEMA public"))
        await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_db(database):
    set_txt_lookup(None)
    set_redis(FakeRedis(decode_responses=True))
    async with SessionLocal() as session:
        await session.execute(
            text(
                """
                TRUNCATE TABLE
                  audit_logs, ads,
                  notifications, automations, tenant_modules,
                  api_keys, integrations,
                  analytics_events, seo_redirects, coupon_redemptions, coupons,
                  customer_consents, customers, promotion_products, promotions,
                  product_images, product_categories, products, banners, pages,
                  categories, refresh_tokens, users, domains, media, tenants
                RESTART IDENTITY CASCADE
                """
            )
        )
        await session.commit()
    yield


@pytest_asyncio.fixture
async def client(clean_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as async_client:
        yield async_client

