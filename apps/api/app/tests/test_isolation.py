from app.tests.helpers import auth_header, host_header, register_store


async def test_tenant_cannot_read_another_store(client):
    store_a = await register_store(client, "loja-a", "a@example.com")
    store_b = await register_store(client, "loja-b", "b@example.com")
    created = await client.post(
        "/api/v1/categories",
        headers={**auth_header(store_a["access_token"]), **host_header("loja-a")},
        json={"name": "Segredo"},
    )
    assert created.status_code == 201, created.text

    listed = await client.get("/api/v1/categories", headers=auth_header(store_b["access_token"]))
    assert listed.status_code == 200
    assert listed.json() == []

    public_b = await client.get("/api/v1/public/categories", headers=host_header("loja-b"))
    assert public_b.status_code == 200
    assert public_b.json() == []

    public_a = await client.get("/api/v1/public/categories", headers=host_header("loja-a"))
    assert [item["name"] for item in public_a.json()] == ["Segredo"]
    assert store_a["tenant"]["id"] != store_b["tenant"]["id"]
