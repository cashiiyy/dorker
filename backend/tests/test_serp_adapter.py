import asyncio
from backend.app.services.serp_adapter import SerpProviderAdapter

def test_serp_mock_mode_when_unconfigured():
    adapter = SerpProviderAdapter(provider="serpapi", api_key="")
    assert adapter.has_credentials() is False
    
    health = asyncio.run(adapter.health_check())
    assert health["mock_mode"] is True
    assert health["configured"] is False

    res = asyncio.run(adapter.search("site:example.org filetype:pdf documentation", limit=5))
    assert res.is_mock is True
    assert "mock" in res.provider.lower()
    assert len(res.results) > 0
    assert res.results[0].domain != ""
    assert res.results[0].link.startswith("http")

def test_serp_respects_result_limits():
    adapter = SerpProviderAdapter(api_key="")
    res = asyncio.run(adapter.search("security advisories", limit=2))
    assert len(res.results) <= 2
