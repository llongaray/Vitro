from datetime import UTC, datetime, timedelta

from app.tests.helpers import auth_header, host_header, register_store


async def _login(client, slug: str, email: str, password: str = "senha-forte") -> str:
    response = await client.post("/api/v1/auth/login", headers=host_header(slug), json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


async def test_editor_creates_product_and_cannot_save_settings(client):
    owner = await register_store(client, "papeis")
    created = await client.post(
        "/api/v1/users",
        headers=auth_header(owner["access_token"]),
        json={"name": "Editora", "email": "editora@example.com", "password": "senha-forte", "role": "EDITOR"},
    )
    assert created.status_code == 201, created.text
    token = await _login(client, "papeis", "editora@example.com")
    product = await client.post("/api/v1/products", headers=auth_header(token), json={"name": "Copo", "publish": True})
    assert product.status_code == 201, product.text
    denied = await client.patch("/api/v1/settings", headers=auth_header(token), json={"trade_name": "Outra"})
    assert denied.status_code == 403


async def test_viewer_cannot_create_product(client):
    owner = await register_store(client, "leitura")
    await client.post(
        "/api/v1/users",
        headers=auth_header(owner["access_token"]),
        json={"name": "Leitor", "email": "leitor@example.com", "password": "senha-forte", "role": "VIEWER"},
    )
    token = await _login(client, "leitura", "leitor@example.com")
    denied = await client.post("/api/v1/products", headers=auth_header(token), json={"name": "Copo"})
    assert denied.status_code == 403


async def test_owner_team_rules_and_role_applies_on_next_request(client):
    owner = await register_store(client, "equipe")
    editor = await client.post(
        "/api/v1/users",
        headers=auth_header(owner["access_token"]),
        json={"name": "Editor", "email": "editor@example.com", "password": "senha-forte", "role": "EDITOR"},
    )
    assert editor.status_code == 201, editor.text
    editor_token = await _login(client, "equipe", "editor@example.com")
    blocked = await client.post(
        "/api/v1/users",
        headers=auth_header(editor_token),
        json={"name": "Outro", "email": "outro@example.com", "password": "senha-forte", "role": "VIEWER"},
    )
    assert blocked.status_code == 403
    users = await client.get("/api/v1/users", headers=auth_header(owner["access_token"]))
    owner_id = next(item["id"] for item in users.json() if item["role"] == "OWNER")
    last = await client.patch(f"/api/v1/users/{owner_id}", headers=auth_header(owner["access_token"]), json={"is_active": False})
    assert last.status_code == 422
    demoted = await client.patch(
        f"/api/v1/users/{editor.json()['id']}",
        headers=auth_header(owner["access_token"]),
        json={"role": "VIEWER"},
    )
    assert demoted.status_code == 200, demoted.text
    after = await client.post("/api/v1/products", headers=auth_header(editor_token), json={"name": "Mesa"})
    assert after.status_code == 403


async def test_product_audit_stays_in_the_store_and_omits_password(client):
    owner = await register_store(client, "trilha")
    other = await register_store(client, "trilha-b")
    invited = await client.post(
        "/api/v1/users",
        headers=auth_header(owner["access_token"]),
        json={"name": "Ana", "email": "ana@example.com", "password": "senha-secreta", "role": "EDITOR"},
    )
    assert invited.status_code == 201, invited.text
    product = await client.post("/api/v1/products", headers=auth_header(owner["access_token"]), json={"name": "Jarra"})
    assert product.status_code == 201, product.text
    audit = await client.get("/api/v1/audit", headers=auth_header(owner["access_token"]))
    assert audit.status_code == 200, audit.text
    dumped = audit.text
    assert "senha-secreta" not in dumped
    assert "password" not in dumped
    assert any(item["entity_type"] == "product" and item["action"] == "create" for item in audit.json()["items"])
    foreign = await client.get("/api/v1/audit", headers=auth_header(other["access_token"]))
    assert foreign.json()["total"] == 0
    editor = await _login(client, "trilha", "ana@example.com", "senha-secreta")
    hidden = await client.get("/api/v1/audit", headers=auth_header(editor))
    assert hidden.status_code == 403


async def test_ad_window_and_disabled_module(client):
    owner = await register_store(client, "anuncios")
    headers = auth_header(owner["access_token"])
    closed = await client.get("/api/v1/ads", headers=headers)
    assert closed.status_code == 404
    enabled = await client.put("/api/v1/modules/ads", headers=headers, json={"enabled": True})
    assert enabled.status_code == 200, enabled.text
    past = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    future = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    outside = await client.post(
        "/api/v1/ads",
        headers=headers,
        json={"title": "Encerrado", "position": "HOME_TOP", "start_at": past, "end_at": past, "active": True},
    )
    assert outside.status_code == 201, outside.text
    inside = await client.post(
        "/api/v1/ads",
        headers=headers,
        json={"title": "Vigente", "position": "HOME_TOP", "start_at": past, "end_at": future, "active": True},
    )
    assert inside.status_code == 201, inside.text
    unknown = await client.post("/api/v1/ads", headers=headers, json={"title": "Lugar", "position": "FOOTER"})
    assert unknown.status_code == 422
    site = await client.get("/api/v1/public/site", headers=host_header("anuncios"))
    titles = [item["title"] for item in site.json()["ads"]]
    assert "Vigente" in titles
    assert "Encerrado" not in titles
