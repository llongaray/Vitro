from httpx import AsyncClient


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def host_header(slug: str) -> dict[str, str]:
    return {"x-forwarded-host": f"{slug}.localhost"}


async def register_store(client: AsyncClient, slug: str, email: str | None = None) -> dict:
    response = await client.post(
        "/api/v1/auth/register-store",
        json={
            "store_name": f"Loja {slug}",
            "slug": slug,
            "owner_name": "Dona da Loja",
            "email": email or f"{slug}@example.com",
            "password": "senha-forte",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()
