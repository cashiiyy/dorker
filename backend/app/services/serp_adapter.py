import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
import httpx
from ..config import settings
from ..models.schemas import SearchResponse, SearchResultItem

logger = logging.getLogger(__name__)

class SerpProviderAdapter:
    """Configurable SERP API provider adapter supporting SerpApi and realistic Mocks."""
    
    def __init__(self, provider: Optional[str] = None, api_key: Optional[str] = None):
        self.provider = provider or settings.SERP_PROVIDER
        self.api_key = api_key
        self.result_limit = settings.SERP_RESULT_LIMIT
        self.force_mock = False

    def get_effective_key(self) -> str:
        return self.api_key if self.api_key is not None else settings.SERPAPI_API_KEY

    def has_credentials(self) -> bool:
        key = self.get_effective_key()
        return bool(key and len(key.strip()) > 5)

    def set_mock_mode(self, enabled: bool):
        self.force_mock = enabled

    async def health_check(self) -> Dict[str, Any]:
        """Check provider status without disclosing secret keys."""
        configured = self.has_credentials()
        key = self.get_effective_key()
        effective_mock = self.force_mock or not configured
        return {
            "provider": self.provider,
            "configured": configured,
            "mock_mode": effective_mock,
            "masked_key": f"{key[:4]}...{key[-4:]}" if configured and len(key) > 8 else ("configured" if configured else "none")
        }

    async def search(self, query: str, limit: Optional[int] = None, mock_mode: Optional[bool] = None) -> SearchResponse:
        """Perform search against SERP API or return structured mock results."""
        max_results = min(limit or self.result_limit, 50)
        use_mock = mock_mode if mock_mode is not None else (self.force_mock or not self.has_credentials())

        if use_mock:
            logger.info("Serving realistic mock results (mock mode active).")
            return self._generate_mock_results(query, max_results)

        if self.provider == "serpapi":
            return await self._search_serpapi(query, max_results)
        else:
            return self._generate_mock_results(query, max_results)


    async def _search_serpapi(self, query: str, limit: int) -> SearchResponse:
        url = "https://serpapi.com/search.json"
        params = {
            "q": query,
            "engine": "google",
            "api_key": self.get_effective_key(),
            "num": limit
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                
                if resp.status_code == 401 or resp.status_code == 403:
                    return SearchResponse(
                        query=query,
                        total_results=0,
                        provider="serpapi",
                        is_mock=False,
                        results=[],
                        error="Authentication failed: Invalid SerpApi key or quota exhausted."
                    )
                if resp.status_code == 429:
                    return SearchResponse(
                        query=query,
                        total_results=0,
                        provider="serpapi",
                        is_mock=False,
                        results=[],
                        error="Rate limit exceeded on SerpApi. Please wait before retrying."
                    )
                if resp.status_code != 200:
                    return SearchResponse(
                        query=query,
                        total_results=0,
                        provider="serpapi",
                        is_mock=False,
                        results=[],
                        error=f"SerpApi returned HTTP {resp.status_code}: {resp.text[:120]}"
                    )

                data = resp.json()
                raw_results = data.get("organic_results", [])
                normalized_items: List[SearchResultItem] = []

                for idx, item in enumerate(raw_results[:limit]):
                    link = item.get("link", "")
                    domain = urlparse(link).netloc if link else "unknown"
                    normalized_items.append(SearchResultItem(
                        title=item.get("title", "Untitled Document"),
                        link=link,
                        snippet=item.get("snippet", ""),
                        domain=domain,
                        date=item.get("date"),
                        position=item.get("position", idx + 1)
                    ))

                return SearchResponse(
                    query=query,
                    total_results=len(normalized_items),
                    provider="serpapi",
                    is_mock=False,
                    results=normalized_items
                )
        except httpx.TimeoutException:
            return SearchResponse(
                query=query,
                total_results=0,
                provider="serpapi",
                is_mock=False,
                results=[],
                error="SerpApi request timed out after 15 seconds."
            )
        except Exception as e:
            logger.error(f"Error querying SerpApi: {e}")
            return SearchResponse(
                query=query,
                total_results=0,
                provider="serpapi",
                is_mock=False,
                results=[],
                error=f"SERP provider communication error: {str(e)}"
            )

    def _generate_mock_results(self, query: str, limit: int) -> SearchResponse:
        """Realistic mock search results indicating Mock Mode."""
        # Extract domain from query if present
        domain = "example.org"
        if "site:" in query.lower():
            try:
                domain = query.lower().split("site:")[1].split()[0]
            except Exception:
                pass

        mock_items = [
            SearchResultItem(
                title=f"Technical Documentation & Architecture Guide - {domain}",
                link=f"https://{domain}/docs/architecture.pdf",
                snippet=f"Official guide and architecture specifications for {query[:30]}. Outlines system protocols, permissions, and developer API references.",
                domain=domain,
                date="2026-03-15",
                position=1
            ),
            SearchResultItem(
                title=f"Security Advisories and Release Notes - {domain}",
                link=f"https://{domain}/security/advisories/2026",
                snippet=f"Security advisory and bulletin index for {query[:25]}. Contains fixed vulnerabilities, patch information, and mitigation standards.",
                domain=domain,
                date="2026-02-28",
                position=2
            ),
            SearchResultItem(
                title=f"Public API Reference & Developer Portal",
                link=f"https://{domain}/developers/api/v2",
                snippet=f"Developer endpoints, request validation rules, and schema definitions corresponding to search query parameters: {query[:35]}.",
                domain=domain,
                date="2026-01-10",
                position=3
            ),
            SearchResultItem(
                title=f"Engineering Whitepaper: Search Operator Analysis",
                link=f"https://arxiv.org/abs/2602.04912",
                snippet="Research paper detailing automated query expansion and precision retrieval using structured Google search operators and local LLMs.",
                domain="arxiv.org",
                date="2026-02-12",
                position=4
            )
        ]

        return SearchResponse(
            query=query,
            total_results=len(mock_items[:limit]),
            provider="mock (no SERPAPI_API_KEY configured)",
            is_mock=True,
            results=mock_items[:limit]
        )
