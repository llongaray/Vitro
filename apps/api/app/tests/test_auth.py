from app.tests.helpers import auth_header, host_header, register_store


async def test_login_refresh_and_logout(client):
    created = await register_store(client, "loja-auth")
    wrong = await client.post(
        "/api/v1/auth/login",
        headers=host_header("loja-auth"),
        json={"email": "loja-auth@example.com", "password": "errada-demais"},
    )
    assert wrong.status_code == 401

    logged = await client.post(
        "/api/v1/auth/login",
        headers=host_header("loja-auth"),
        json={"email": "loja-auth@example.com", "password": "senha-forte"},
    )
    assert logged.status_code == 200, logged.text
    token = logged.json()["access_token"]
    me = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert me.status_code == 200
    assert me.json()["email"] == "loja-auth@example.com"

    refreshed = await client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200, refreshed.text
    assert refreshed.json()["user"]["role"] == "OWNER"

    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    again = await client.post("/api/v1/auth/refresh")
    assert again.status_code == 401
    assert created["tenant"]["hostname"] == "loja-auth.localhost"
