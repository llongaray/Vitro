from datetime import UTC, datetime, timedelta

from app.database.session import SessionLocal
from app.modules.analytics.models import AnalyticsEvent
from app.tests.helpers import auth_header, host_header, register_store


async def test_disabled_coupon_module_hides_claim_and_panel(client):
    owner = await register_store(client, "modloja")
    headers = auth_header(owner["access_token"])
    turned = await client.put("/api/v1/modules/coupons", headers=headers, json={"enabled": False})
    assert turned.status_code == 200, turned.text
    panel = await client.get("/api/v1/coupons", headers=headers)
    assert panel.status_code == 404
    claim = await client.post(
        "/api/v1/public/coupons/claim",
        headers=host_header("modloja"),
        json={"code": "BEMVINDO", "email": "ana@example.com"},
    )
    assert claim.status_code == 404


async def test_summary_range_keeps_today_search_and_drops_old_visit(client):
    owner = await register_store(client, "periodo")
    headers = auth_header(owner["access_token"])
    host = host_header("periodo")
    searched = await client.post("/api/v1/public/events", headers=host, json={"event_type": "search", "metadata": {"q": "linho"}})
    assert searched.status_code == 204, searched.text
    async with SessionLocal() as session:
        session.add(
            AnalyticsEvent(
                tenant_id=owner["tenant"]["id"],
                event_type="page_view",
                session_id="visita-antiga",
                metadata_json={},
                created_at=datetime.now(UTC) - timedelta(days=30),
            )
        )
        await session.commit()
    today = datetime.now(UTC).date().isoformat()
    summary = await client.get(f"/api/v1/analytics/summary?from={today}&to={today}", headers=headers)
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["visits"] == 0
    assert body["users"] == 0
    assert body["top_searches"][0]["q"] == "linho"
    invalid = await client.get("/api/v1/analytics/summary?from=2026-12-02&to=2026-01-01", headers=headers)
    assert invalid.status_code == 422


async def test_signup_notice_stays_in_tenant_and_skips_when_automation_is_off(client):
    owner = await register_store(client, "avisaloja")
    other = await register_store(client, "outralista")
    headers = auth_header(owner["access_token"])
    host = host_header("avisaloja")
    signup = await client.post(
        "/api/v1/public/customers",
        headers=host,
        json={"name": "Ana", "email": "ana@example.com", "phone": "11988887777", "accepted_terms": True},
    )
    assert signup.status_code == 201, signup.text
    notes = await client.get("/api/v1/notifications", headers=headers)
    assert notes.status_code == 200
    text = " ".join(f"{item['title']} {item['body']}" for item in notes.json()["items"])
    assert "Novo cliente" in text
    assert "ana@example.com" not in text
    assert "11988887777" not in text
    foreign = await client.get("/api/v1/notifications", headers=auth_header(other["access_token"]))
    assert foreign.json()["items"] == []

    disabled = await client.put("/api/v1/automations/customer_signup", headers=headers, json={"enabled": False})
    assert disabled.status_code == 200
    second = await client.post(
        "/api/v1/public/customers",
        headers=host,
        json={"name": "Bia", "email": "bia@example.com", "phone": "11988887776", "accepted_terms": True},
    )
    assert second.status_code == 201, second.text
    again = await client.get("/api/v1/notifications", headers=headers)
    signups = [item for item in again.json()["items"] if item["kind"] == "customer_signup"]
    assert len(signups) == 1


async def test_editorial_theme_changes_order_and_keeps_color(client):
    owner = await register_store(client, "temaloja")
    headers = auth_header(owner["access_token"])
    painted = await client.patch("/api/v1/settings", headers=headers, json={"primary_color": "#112233"})
    assert painted.status_code == 200, painted.text
    applied = await client.post("/api/v1/themes/editorial/apply", headers=headers)
    assert applied.status_code == 200, applied.text
    body = applied.json()
    assert body["font_pair"] == "editorial"
    assert body["section_order"][1] == "about"
    assert body["primary_color"] == "#112233"
    missing = await client.post("/api/v1/themes/inexistente/apply", headers=headers)
    assert missing.status_code == 404
