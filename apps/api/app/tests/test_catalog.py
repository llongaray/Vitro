from io import BytesIO

from PIL import Image

from app.tests.helpers import auth_header, host_header, register_store


def _png() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (12, 8), (20, 40, 60)).save(buffer, format="PNG")
    return buffer.getvalue()


async def _product(client, token: str, **extra):
    payload = {"name": "Camisa de linho", "publish": True, "is_active": True, "price": 10}
    payload.update(extra)
    response = await client.post("/api/v1/products", headers=auth_header(token), json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def test_draft_and_inactive_are_hidden(client):
    store = await register_store(client, "loja-pub")
    token = store["access_token"]
    draft = await _product(client, token, name="Rascunho", slug="rascunho", publish=False)
    assert draft["published"] is False
    hidden = await client.get("/api/v1/public/products", headers=host_header("loja-pub"))
    assert hidden.json()["total"] == 0

    await client.patch(f"/api/v1/products/{draft['id']}", headers=auth_header(token), json={"publish": True})
    visible = await client.get("/api/v1/public/products", headers=host_header("loja-pub"))
    assert visible.json()["total"] == 1

    await client.patch(f"/api/v1/products/{draft['id']}", headers=auth_header(token), json={"is_active": False})
    inactive = await client.get("/api/v1/public/products", headers=host_header("loja-pub"))
    assert inactive.json()["total"] == 0


async def test_slug_is_unique_per_tenant(client):
    first = await register_store(client, "loja-slug-a", "slug-a@example.com")
    second = await register_store(client, "loja-slug-b", "slug-b@example.com")
    await _product(client, first["access_token"], slug="camisa")
    duplicate = await client.post(
        "/api/v1/products",
        headers=auth_header(first["access_token"]),
        json={"name": "Outra", "slug": "camisa", "publish": True},
    )
    assert duplicate.status_code == 409
    other = await _product(client, second["access_token"], slug="camisa")
    assert other["slug"] == "camisa"


async def test_hidden_price_and_search(client):
    store = await register_store(client, "loja-preco")
    token = store["access_token"]
    created = await _product(client, token, keywords="linho verao")
    public = await client.get("/api/v1/public/products/camisa-de-linho", headers=host_header("loja-preco"))
    assert public.status_code == 200, public.text
    assert public.json()["price_visible"] is False
    assert public.json()["price"] is None

    await client.patch("/api/v1/settings", headers=auth_header(token), json={"show_prices": True})
    shown = await client.get("/api/v1/public/products/camisa-de-linho", headers=host_header("loja-preco"))
    assert shown.json()["price_visible"] is True
    assert shown.json()["price"] == 10

    await client.patch(f"/api/v1/products/{created['id']}", headers=auth_header(token), json={"show_price": "hide"})
    hidden = await client.get("/api/v1/public/products/camisa-de-linho", headers=host_header("loja-preco"))
    assert hidden.json()["price_visible"] is False

    found = await client.get("/api/v1/public/products", headers=host_header("loja-preco"), params={"q": "linho"})
    assert found.status_code == 200
    assert found.json()["total"] == 1


async def test_invalid_upload_is_rejected_and_valid_image_is_stored(client):
    store = await register_store(client, "loja-midia")
    token = store["access_token"]
    product = await _product(client, token, slug="peca")
    rejected = await client.post(
        f"/api/v1/products/{product['id']}/images",
        headers=auth_header(token),
        files={"file": ("notas.txt", b"nao sou imagem", "text/plain")},
    )
    assert rejected.status_code == 422

    accepted = await client.post(
        f"/api/v1/products/{product['id']}/images",
        headers=auth_header(token),
        files={"file": ("peca.png", _png(), "image/png")},
    )
    assert accepted.status_code == 201, accepted.text
    image = accepted.json()["images"][0]
    assert image["url"].endswith(".webp")
    detail = await client.get(f"/api/v1/public/products/{product['slug']}", headers=host_header("loja-midia"))
    assert detail.json()["image"]["url"].endswith(".webp")
