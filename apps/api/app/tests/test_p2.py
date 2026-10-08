from app.services.dns import set_txt_lookup
from app.tests.helpers import auth_header, host_header, register_store


async def test_unverified_domain_stays_closed_until_txt_matches(client):
    owner = await register_store(client, "domloja")
    headers = auth_header(owner["access_token"])
    created = await client.post("/api/v1/domains", headers=headers, json={"hostname": "loja.example.com"})
    assert created.status_code == 201, created.text
    domain = created.json()
    assert domain["verified"] is False

    closed = await client.get("/api/v1/public/site", headers={"x-forwarded-host": "loja.example.com"})
    assert closed.status_code == 404

    other = await register_store(client, "outraloja")
    taken = await client.post("/api/v1/domains", headers=headers, json={"hostname": "outraloja.localhost"})
    assert taken.status_code == 409

    early = await client.post(f"/api/v1/domains/{domain['id']}/primary", headers=headers)
    assert early.status_code == 422

    set_txt_lookup(lambda name: ["errado"])
    wrong = await client.post(f"/api/v1/domains/{domain['id']}/verify", headers=headers)
    assert wrong.status_code == 422

    set_txt_lookup(lambda name: [domain["verification_token"]] if name == domain["dns_name"] else [])
    verified = await client.post(f"/api/v1/domains/{domain['id']}/verify", headers=headers)
    assert verified.status_code == 200
    assert verified.json()["verified"] is True

    opened = await client.get("/api/v1/public/site", headers={"x-forwarded-host": "loja.example.com"})
    assert opened.status_code == 200
    primary = await client.post(f"/api/v1/domains/{domain['id']}/primary", headers=headers)
    assert primary.status_code == 200
    assert primary.json()["is_primary"] is True
    assert other["access_token"]


async def test_product_csv_upserts_by_slug_and_customer_needs_terms(client):
    owner = await register_store(client, "csvloja")
    headers = auth_header(owner["access_token"])
    first = (
        "name,slug,price,description,published,show_price\n"
        "Jarra,jarra-csv,10,vidro,true,show\n"
    ).encode()
    created = await client.post("/api/v1/imports/products", headers=headers, files={"file": ("produtos.csv", first, "text/csv")})
    assert created.status_code == 200, created.text
    assert created.json()["created"] == 1
    assert created.json()["updated"] == 0

    second = (
        "name,slug,price,description,published,show_price\n"
        "Jarra alta,jarra-csv,25,cristal,true,show\n"
    ).encode()
    updated = await client.post("/api/v1/imports/products", headers=headers, files={"file": ("produtos.csv", second, "text/csv")})
    assert updated.json()["created"] == 0
    assert updated.json()["updated"] == 1

    catalog = await client.get("/api/v1/public/products", headers=host_header("csvloja"))
    item = next(row for row in catalog.json()["items"] if row["slug"] == "jarra-csv")
    assert item["name"] == "Jarra alta"
    assert item["price"] == 25

    customers = (
        "name,email,phone,accepted_terms,accepted_marketing\n"
        "Ana,ana@example.com,11999999999,false,true\n"
    ).encode()
    rejected = await client.post("/api/v1/imports/customers", headers=headers, files={"file": ("clientes.csv", customers, "text/csv")})
    assert rejected.status_code == 200
    assert rejected.json()["created"] == 0
    assert rejected.json()["errors"][0]["detail"] == "Cliente sem aceite dos termos"
    listed = await client.get("/api/v1/customers", headers=headers)
    assert listed.json() == []

    exported = await client.get("/api/v1/exports/analytics", headers=headers)
    assert exported.headers["content-type"].startswith("text/csv")
    assert "email" not in exported.text
    assert "phone" not in exported.text


async def test_api_key_reads_only_its_tenant_and_disabled_integration_stays_hidden(client):
    first = await register_store(client, "chavea")
    second = await register_store(client, "chaveb")
    product = await client.post(
        "/api/v1/products",
        headers=auth_header(first["access_token"]),
        json={"name": "Copo da A", "slug": "copo-a", "publish": True, "price": 12},
    )
    assert product.status_code == 201, product.text

    key_a = await client.post("/api/v1/api-keys", headers=auth_header(first["access_token"]), json={"name": "leitura"})
    key_b = await client.post("/api/v1/api-keys", headers=auth_header(second["access_token"]), json={"name": "leitura"})
    assert key_a.status_code == 201
    raw_a = key_a.json()["key"]
    raw_b = key_b.json()["key"]
    assert raw_a.startswith("vtr_")
    assert "key" not in (await client.get("/api/v1/api-keys", headers=auth_header(first["access_token"]))).json()[0]

    own = await client.get("/api/v1/external/products", headers={"X-Api-Key": raw_a})
    foreign = await client.get("/api/v1/external/products", headers={"X-Api-Key": raw_b})
    assert own.status_code == 200
    assert any(item["slug"] == "copo-a" for item in own.json()["items"])
    assert all(item["slug"] != "copo-a" for item in foreign.json()["items"])

    saved = await client.put(
        "/api/v1/integrations/ga4",
        headers=auth_header(first["access_token"]),
        json={"public_id": "G-TESTE", "enabled": False, "secret": "nao-voltar"},
    )
    assert saved.status_code == 200
    assert "secret" not in saved.json()
    await client.put(
        "/api/v1/integrations/meta_pixel",
        headers=auth_header(first["access_token"]),
        json={"public_id": "123456", "enabled": True},
    )
    site = await client.get("/api/v1/public/site", headers=host_header("chavea"))
    providers = [item["provider"] for item in site.json()["integrations"]]
    assert "ga4" not in providers
    assert "meta_pixel" in providers

    invalid = await client.patch(
        "/api/v1/appearance",
        headers=auth_header(first["access_token"]),
        json={"section_order": ["hero", "about"]},
    )
    assert invalid.status_code == 422
