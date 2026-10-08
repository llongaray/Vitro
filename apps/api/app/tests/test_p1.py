from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.database.session import SessionLocal
from app.modules.analytics.models import AnalyticsEvent
from app.tests.helpers import auth_header, host_header, register_store


async def _product(client, token: str, **extra):
    payload = {"name": "Vela", "slug": "vela", "publish": True, "is_active": True, "price": 40, "show_price": "show"}
    payload.update(extra)
    response = await client.post("/api/v1/products", headers=auth_header(token), json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def test_expired_promotion_and_clearance_stay_out_of_public_lists(client):
    store = await register_store(client, "loja-promo")
    token = store["access_token"]
    host = host_header("loja-promo")
    current = await _product(client, token, name="Vela atual", slug="vela-atual")
    expired_product = await _product(client, token, name="Vela antiga", slug="vela-antiga")
    past = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    older = (datetime.now(UTC) - timedelta(days=5)).isoformat()
    future = (datetime.now(UTC) + timedelta(days=5)).isoformat()
    created = await client.post(
        "/api/v1/promotions",
        headers=auth_header(token),
        json={"name": "Semana", "start_at": past, "end_at": future, "products": [{"product_id": current["id"], "promotional_price": 19.9}]},
    )
    assert created.status_code == 201, created.text
    expired = await client.post(
        "/api/v1/promotions",
        headers=auth_header(token),
        json={"name": "Encerrada", "start_at": older, "end_at": past, "products": [{"product_id": expired_product["id"], "promotional_price": 9}]},
    )
    assert expired.status_code == 201, expired.text
    public = await client.get("/api/v1/public/promotions", headers=host)
    slugs = [item["slug"] for item in public.json()["items"]]
    assert slugs == ["vela-atual"]
    assert public.json()["items"][0]["promotional_price"] == 19.9

    await client.patch(
        f"/api/v1/products/{expired_product['id']}",
        headers=auth_header(token),
        json={"is_clearance": True, "clearance_label": "Últimas", "clearance_start": older, "clearance_end": past},
    )
    await client.patch(
        f"/api/v1/products/{current['id']}",
        headers=auth_header(token),
        json={"is_clearance": True, "clearance_label": "Queima", "clearance_end": future},
    )
    clearance = await client.get("/api/v1/public/clearance", headers=host)
    assert [item["slug"] for item in clearance.json()["items"]] == ["vela-atual"]
    catalog = await client.get("/api/v1/public/products", headers=host)
    assert catalog.json()["total"] == 2


async def test_coupon_limits_and_customer_isolation(client):
    first = await register_store(client, "loja-cupom-a", "cupom-a@example.com")
    second = await register_store(client, "loja-cupom-b", "cupom-b@example.com")
    past = (datetime.now(UTC) - timedelta(days=3)).isoformat()
    yesterday = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    expired = await client.post(
        "/api/v1/coupons",
        headers=auth_header(first["access_token"]),
        json={"code": "VELHO", "name": "Velho", "discount_type": "FIXED", "discount_value": 5, "start_at": past, "end_at": yesterday},
    )
    assert expired.status_code == 201, expired.text
    signup = await client.post(
        "/api/v1/public/customers",
        headers=host_header("loja-cupom-a"),
        json={"name": "Ana", "email": "ana@example.com", "phone": "11988887777", "accepted_terms": True},
    )
    assert signup.status_code == 201, signup.text
    claim = await client.post(
        "/api/v1/public/coupons/claim",
        headers=host_header("loja-cupom-a"),
        json={"code": "VELHO", "email": "ana@example.com"},
    )
    assert claim.status_code == 422

    limited = await client.post(
        "/api/v1/coupons",
        headers=auth_header(first["access_token"]),
        json={"code": "UNICO", "name": "Único", "discount_type": "PERCENTAGE", "discount_value": 10, "max_uses_per_customer": 1, "grant_on_signup": True},
    )
    assert limited.status_code == 201, limited.text
    again = await client.post(
        "/api/v1/public/customers",
        headers=host_header("loja-cupom-a"),
        json={"name": "Bia", "email": "bia@example.com", "phone": "11988887776", "accepted_terms": True},
    )
    assert again.status_code == 201, again.text
    assert again.json()["coupon"]["code"] == "UNICO"
    repeat = await client.post(
        "/api/v1/public/coupons/claim",
        headers=host_header("loja-cupom-a"),
        json={"code": "UNICO", "email": "bia@example.com"},
    )
    assert repeat.status_code == 422

    foreign = await client.get("/api/v1/customers", headers=auth_header(second["access_token"]))
    assert foreign.status_code == 200
    assert foreign.json() == []
    own = await client.get("/api/v1/customers", headers=auth_header(first["access_token"]))
    assert {item["email"] for item in own.json()} == {"ana@example.com", "bia@example.com"}


async def test_slug_change_creates_redirect_outside_sitemap(client):
    store = await register_store(client, "loja-redirect")
    token = store["access_token"]
    host = host_header("loja-redirect")
    product = await _product(client, token, name="Copo", slug="copo")
    moved = await client.patch(f"/api/v1/products/{product['id']}", headers=auth_header(token), json={"slug": "copo-novo"})
    assert moved.status_code == 200
    redirect = await client.get("/api/v1/public/redirect", headers=host, params={"path": "/produtos/copo"})
    assert redirect.status_code == 200
    assert redirect.json()["destination"] == "/produtos/copo-novo"
    assert redirect.json()["status_code"] == 301
    sitemap = await client.get("/api/v1/public/sitemap", headers=host)
    assert "/produtos/copo-novo" in sitemap.json()["paths"]
    assert "/produtos/copo" not in sitemap.json()["paths"]


async def test_hidden_price_omits_offer(client):
    store = await register_store(client, "loja-offer")
    token = store["access_token"]
    host = host_header("loja-offer")
    await _product(client, token, name="Sem preço", slug="sem-preco", show_price="hide", price=80)
    hidden = await client.get("/api/v1/public/products/sem-preco", headers=host)
    graph = hidden.json()["json_ld"]["@graph"]
    assert all(node.get("@type") != "Offer" and "offers" not in node for node in graph)
    await _product(client, token, name="Com preço", slug="com-preco", show_price="show", price=80)
    visible = await client.get("/api/v1/public/products/com-preco", headers=host)
    product = next(node for node in visible.json()["json_ld"]["@graph"] if node["@type"] == "Product")
    assert product["offers"]["price"] == 80


async def test_analytics_event_drops_email(client):
    store = await register_store(client, "loja-evento")
    response = await client.post(
        "/api/v1/public/events",
        headers=host_header("loja-evento"),
        json={"event_type": "search", "metadata": {"email": "segredo@example.com", "q": "vela"}},
    )
    assert response.status_code == 204, response.text
    async with SessionLocal() as session:
        row = await session.scalar(select(AnalyticsEvent).where(AnalyticsEvent.event_type == "search"))
        assert row is not None
        assert "email" not in row.metadata_json
        assert row.metadata_json["q"] == "vela"
