import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "lm_studio" in data
    assert "serp_provider" in data

def test_api_models():
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data

def test_api_query_validation():
    payload = {
        "query": 'site:example.org filetype:pdf intitle:"API Specification"',
        "target_domains": ["example.org"],
        "category": "public_documentation"
    }
    res = client.post("/api/queries/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert "site:" in data["operators_found"]
    assert "filetype:" in data["operators_found"]

def test_api_search_mock():
    payload = {
        "query": "site:example.org documentation",
        "num_results": 4
    }
    res = client.post("/api/search", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_results"] > 0
    assert len(data["results"]) <= 4

def test_api_research_lifecycle():
    # 1. Create session
    payload = {
        "title": "Automated Test Session",
        "objective": "Verify search queries",
        "category": "public_documentation",
        "queries": [
            {"id": "q1", "query": "site:example.org docs", "label": "Docs"}
        ],
        "results": [
            {"title": "Example Docs", "link": "https://example.org", "snippet": "Docs", "domain": "example.org"}
        ],
        "notes": "Test notes"
    }
    res = client.post("/api/research", json=payload)
    assert res.status_code == 200
    session_id = res.json()["id"]

    # 2. Get session
    res_get = client.get(f"/api/research/{session_id}")
    assert res_get.status_code == 200
    assert res_get.json()["title"] == "Automated Test Session"

    # 3. Export markdown
    res_exp = client.get(f"/api/research/{session_id}/export")
    assert res_exp.status_code == 200
    assert "Dorker Research Report" in res_exp.text

    # 4. Delete session
    res_del = client.delete(f"/api/research/{session_id}")
    assert res_del.status_code == 200
