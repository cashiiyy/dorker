import pytest
import asyncio
import httpx
from backend.app.models.schemas import ResearchSessionItem
from backend.app.services.discord_service import DiscordService

def create_sample_session():
    return ResearchSessionItem(
        id="sess-test-1234",
        title="Kubernetes Hardening Audit",
        objective="Find public security guides and token secrets",
        category="security_advisories",
        created_at="2026-03-20T10:00:00Z",
        queries=[
            {"id": "q1", "query": "site:kubernetes.io filetype:pdf security", "label": "K8s PDF"}
        ],
        results=[
            {
                "title": "K8s Hardening Guide with password: supersecret123",
                "link": "https://kubernetes.io/docs/hardening.pdf",
                "snippet": "Contains API_KEY=abcdef1234567890 and best practices for CIS compliance.",
                "domain": "kubernetes.io",
                "date": "2026-01-15"
            },
            {
                "title": "RBAC Security Advisory",
                "link": "https://kubernetes.io/security/advisory-01",
                "snippet": "RBAC privilege escalation vulnerability details.",
                "domain": "kubernetes.io",
                "date": "2026-02-10"
            },
            {
                "title": "Audit Benchmark Document",
                "link": "https://cisecurity.org/benchmark/k8s",
                "snippet": "CIS benchmark controls.",
                "domain": "cisecurity.org"
            }
        ],
        notes="Security test notes"
    )

def test_discord_sensitive_data_redaction():
    svc = DiscordService()
    raw = "Found password: mypassword123 and secret API_KEY=abcdef1234567890 in log"
    redacted = svc.redact_text(raw)
    assert "mypassword123" not in redacted
    assert "abcdef1234567890" not in redacted
    assert "[REDACTED_PASSWORD]" in redacted or "[REDACTED_TOKEN]" in redacted

def test_discord_secret_masking():
    svc = DiscordService()
    svc.update_config("https://discord.com/api/webhooks/123456789/abcdefghijkSecretToken")
    status = svc.get_status()
    assert status.configured is True
    assert "abcdefghijkSecretToken" not in status.masked_webhook
    assert "123456789" in status.masked_webhook
    assert "****" in status.masked_webhook or "..." in status.masked_webhook

def test_discord_payload_building_and_branding():
    svc = DiscordService()
    svc.update_config("https://discord.com/api/webhooks/123/token", max_results=2)
    sess = create_sample_session()
    
    # Select all 3 results, with max_results=2, should produce 2 message payloads
    payloads = svc.build_payloads(sess, [0, 1, 2])
    assert len(payloads) == 2
    
    # Check Dorker branding in embeds
    first_embed = payloads[0]["embeds"][0]
    assert "Dorker Research Report" in first_embed["title"]
    assert "Dorker v" in first_embed["footer"]["text"]
    assert first_embed["color"] == 0x0EA5E9
    
    # Verify sensitive data was redacted from fields
    assert "supersecret123" not in str(first_embed)
    assert "abcdef1234567890" not in str(first_embed)

def test_discord_empty_selection_raises():
    svc = DiscordService()
    svc.update_config("https://discord.com/api/webhooks/123/token")
    sess = create_sample_session()
    with pytest.raises(ValueError, match="No valid results selected"):
        svc.build_payloads(sess, [])

def test_discord_unconfigured_raises():
    svc = DiscordService()
    svc.clear_config()
    sess = create_sample_session()
    with pytest.raises(ValueError, match="No valid Discord webhook URL configured"):
        asyncio.run(svc.send_report(sess, [0]))

def test_discord_mocked_delivery_success(monkeypatch):
    svc = DiscordService()
    svc.update_config("https://discord.com/api/webhooks/123456/token", enabled=True)
    sess = create_sample_session()

    # Mock httpx post
    async def mock_post(self, url, json=None, **kwargs):
        assert "discord.com" in str(url)
        assert json is not None
        req = httpx.Request("POST", url)
        return httpx.Response(204, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    res = asyncio.run(svc.send_report(sess, [0, 1]))
    assert res.success is True
    assert res.messages_sent == 1
    assert svc.last_error is None

def test_discord_rate_limiting_and_retry(monkeypatch):
    svc = DiscordService()
    svc.update_config("https://discord.com/api/webhooks/123456/token", enabled=True)
    sess = create_sample_session()

    calls = 0
    async def mock_post_rate_limited(self, url, json=None, **kwargs):
        nonlocal calls
        calls += 1
        req = httpx.Request("POST", url)
        if calls == 1:
            # First attempt returns 429 rate limit with retry_after: 0.05
            return httpx.Response(429, json={"retry_after": 0.05}, request=req)
        # Second attempt succeeds with 204
        return httpx.Response(204, request=req)

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post_rate_limited)

    res = asyncio.run(svc.send_report(sess, [0]))
    assert res.success is True
    assert calls == 2
