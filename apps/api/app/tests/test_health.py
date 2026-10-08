from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.health import service as health_service


async def test_live_and_ready(client):
    live = await client.get("/health/live")
    assert live.status_code == 200
    assert live.json()["status"] == "live"
    ready = await client.get("/health/ready")
    assert ready.status_code == 200, ready.text
    assert ready.json()["checks"] == {"database": True, "redis": True, "storage": True}


async def test_ready_fails_when_database_check_fails(client, monkeypatch):
    async def down() -> bool:
        return False

    monkeypatch.setattr(health_service, "check_database", down)
    response = await client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["checks"]["database"] is False


async def test_check_database_returns_false_when_unreachable(monkeypatch):
    bad = create_async_engine("postgresql+asyncpg://vitrio:vitrio@127.0.0.1:1/vitrio", connect_args={"timeout": 1})
    monkeypatch.setattr(health_service, "engine", bad)
    try:
        assert await health_service.check_database() is False
    finally:
        await bad.dispose()
