from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from typing import Dict, Any, List

from ..config import settings
from ..models.schemas import (
    GenerateQueriesRequest,
    GenerateQueriesResponse,
    ValidateQueryRequest,
    ValidateQueryResponse,
    SearchRequest,
    SearchResponse,
    PreviewRequest,
    PreviewResponse,
    ResearchSessionCreate,
    ResearchSessionItem
)
from ..services.lm_studio import LMStudioClient
from ..services.query_validator import QueryValidator
from ..services.query_generator import QueryGeneratorService
from ..services.serp_adapter import SerpProviderAdapter
from ..services.preview_service import PreviewService
from ..services.research_session import ResearchSessionService

router = APIRouter()

lm_client = LMStudioClient()
query_generator = QueryGeneratorService(lm_client)
serp_adapter = SerpProviderAdapter()
preview_service = PreviewService()
session_service = ResearchSessionService()

@router.get("/health")
async def health_check():
    """System health check across local LM Studio, SERP adapter, and SQLite DB."""
    models_info = await lm_client.get_models()
    serp_info = await serp_adapter.health_check()
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "lm_studio": {
            "connected": models_info.get("connected", False),
            "configured_model": settings.LM_STUDIO_MODEL,
            "configured_model_loaded": models_info.get("configured_model_loaded", False),
            "base_url": settings.LM_STUDIO_BASE_URL
        },
        "serp_provider": serp_info,
        "database": "sqlite_ready"
    }

@router.get("/models")
async def list_models():
    """List available local models in LM Studio and inspect loaded status."""
    return await lm_client.get_models()

@router.post("/models/test")
async def test_model():
    """Test inference connectivity with the configured Qwen model."""
    return await lm_client.test_connection()

@router.post("/queries/generate", response_model=GenerateQueriesResponse)
async def generate_queries(req: GenerateQueriesRequest):
    """Generate structured Google search operator queries from objective."""
    return await query_generator.generate_queries(req)

@router.post("/queries/validate", response_model=ValidateQueryResponse)
async def validate_query(req: ValidateQueryRequest):
    """Validate query operators, quotation balance, and scope."""
    res = QueryValidator.validate_query(
        req.query,
        target_domains=req.target_domains,
        category=req.category,
        authorized_domain_confirmed=req.authorized_domain_confirmed
    )
    return ValidateQueryResponse(**res)

@router.post("/search", response_model=SearchResponse)
async def search_query(req: SearchRequest):
    """Execute search query via configured SERP provider or Mock."""
    return await serp_adapter.search(req.query, req.num_results)

@router.post("/sources/preview", response_model=PreviewResponse)
async def preview_source(req: PreviewRequest):
    """SSRF-protected safe preview of public research document."""
    return await preview_service.fetch_preview(req.url)

@router.get("/research", response_model=List[ResearchSessionItem])
async def list_research_sessions():
    """List saved research sessions."""
    return session_service.list_sessions()

@router.post("/research", response_model=ResearchSessionItem)
async def save_research_session(req: ResearchSessionCreate):
    """Save a research session."""
    return session_service.create_session(req)

@router.get("/research/{session_id}", response_model=ResearchSessionItem)
async def get_research_session(session_id: str):
    """Get a saved research session."""
    sess = session_service.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess

@router.delete("/research/{session_id}")
async def delete_research_session(session_id: str):
    """Delete a research session."""
    success = session_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True, "id": session_id}

@router.get("/research/{session_id}/export")
async def export_research_markdown(session_id: str):
    """Export research session as a formatted Markdown report."""
    md = session_service.export_markdown(session_id)
    if not md:
        raise HTTPException(status_code=404, detail="Session not found")
    return PlainTextResponse(content=md, media_type="text/markdown")

@router.get("/settings/status")
async def get_settings_status():
    """Return runtime configuration status with secrets masked."""
    serp_info = await serp_adapter.health_check()
    models_info = await lm_client.get_models()
    return {
        "app_name": settings.APP_NAME,
        "app_env": settings.APP_ENV,
        "lm_studio_base_url": settings.LM_STUDIO_BASE_URL,
        "lm_studio_model": settings.LM_STUDIO_MODEL,
        "lm_studio_connected": models_info.get("connected", False),
        "lm_studio_model_loaded": models_info.get("configured_model_loaded", False),
        "serp_provider": settings.SERP_PROVIDER,
        "serp_configured": serp_info.get("configured", False),
        "serp_result_limit": settings.SERP_RESULT_LIMIT,
        "preview_timeout": settings.PREVIEW_TIMEOUT_SECONDS,
        "database_url": settings.DATABASE_URL
    }
