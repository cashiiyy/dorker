from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from typing import Dict, Any, List, Optional

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
    ResearchSessionItem,
    DiscordSendRequest,
    DiscordPreviewRequest,
    DiscordMessagePreview,
    DiscordSendResponse,
    DiscordConfigUpdate,
    DiscordStatusResponse,
    DiscordSendDorksRequest,
    DiscordSendDirectResultsRequest,
    MockModeToggleRequest
)
from ..services.lm_studio import LMStudioClient

from ..services.query_validator import QueryValidator
from ..services.query_generator import QueryGeneratorService
from ..services.serp_adapter import SerpProviderAdapter
from ..services.preview_service import PreviewService
from ..services.research_session import ResearchSessionService
from ..services.discord_service import DiscordService

router = APIRouter()

lm_client = LMStudioClient()
query_generator = QueryGeneratorService(lm_client)
serp_adapter = SerpProviderAdapter()
preview_service = PreviewService()
session_service = ResearchSessionService()
discord_service = DiscordService()

@router.get("/health")
async def health_check():
    """System health check across local LM Studio, SERP adapter, SQLite DB, and Discord."""
    models_info = await lm_client.get_models()
    serp_info = await serp_adapter.health_check()
    discord_status = discord_service.get_status()
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
        "lm_studio": {
            "connected": models_info.get("connected", False),
            "configured_model": settings.LM_STUDIO_MODEL,
            "configured_model_loaded": models_info.get("configured_model_loaded", False),
            "base_url": settings.LM_STUDIO_BASE_URL
        },
        "serp_provider": serp_info,
        "discord_integration": {
            "configured": discord_status.configured,
            "enabled": discord_status.enabled
        },
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
    return await serp_adapter.search(req.query, req.num_results, mock_mode=req.mock_mode)


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

# --- Discord Integration Endpoints ---

@router.get("/integrations/discord/status", response_model=DiscordStatusResponse)
async def get_discord_status():
    """Get current Discord webhook configuration and delivery status without revealing secrets."""
    return discord_service.get_status()

@router.post("/integrations/discord/config", response_model=DiscordStatusResponse)
async def update_discord_config(config: DiscordConfigUpdate):
    """Update runtime Discord webhook configuration."""
    discord_service.update_config(
        webhook_url=config.webhook_url,
        enabled=config.enabled,
        max_results=config.max_results_per_msg
    )
    return discord_service.get_status()

@router.post("/integrations/discord/clear", response_model=DiscordStatusResponse)
async def clear_discord_config():
    """Clear Discord webhook configuration."""
    discord_service.clear_config()
    return discord_service.get_status()

@router.post("/integrations/discord/test")
async def test_discord_webhook():
    """Send test verification message to configured Discord webhook."""
    return await discord_service.test_webhook()

@router.post("/integrations/discord/preview", response_model=DiscordMessagePreview)
async def preview_discord_message(req: DiscordPreviewRequest):
    """Generate preview of Discord embed structure for reviewed results."""
    sess = session_service.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        return discord_service.preview_payload(
            session=sess,
            selected_indices=req.selected_result_indices,
            custom_title=req.custom_title,
            query_executed=req.query_executed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/integrations/discord/send", response_model=DiscordSendResponse)
async def send_discord_report(req: DiscordSendRequest):
    """Deliver reviewed research results to configured Discord webhook."""
    sess = session_service.get_session(req.session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        return await discord_service.send_report(
            session=sess,
            selected_indices=req.selected_result_indices,
            custom_title=req.custom_title,
            query_executed=req.query_executed
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/integrations/discord/send-dorks", response_model=DiscordSendResponse)
async def send_dorks_to_discord(req: DiscordSendDorksRequest):
    """Deliver generated Google dork queries directly to Discord without persistent session."""
    try:
        return await discord_service.send_dork_report(
            title=req.title,
            objective=req.objective,
            queries=req.queries,
            category=req.category
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/integrations/discord/send-results", response_model=DiscordSendResponse)
async def send_results_to_discord(req: DiscordSendDirectResultsRequest):
    """Deliver search results directly to Discord webhook."""
    try:
        return await discord_service.send_direct_results(
            query=req.query,
            results=req.results,
            title=req.title,
            objective=req.objective
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/settings/mock-mode")
async def toggle_mock_mode(req: MockModeToggleRequest):
    """Dynamically toggle between live SerpApi search and realistic mock results."""
    serp_adapter.set_mock_mode(req.enabled)
    serp_info = await serp_adapter.health_check()
    return {
        "success": True,
        "mock_mode": serp_info.get("mock_mode", False),
        "configured": serp_info.get("configured", False)
    }

@router.get("/settings/status")
async def get_settings_status():
    """Return runtime configuration status with secrets masked."""
    serp_info = await serp_adapter.health_check()
    models_info = await lm_client.get_models()
    discord_status = discord_service.get_status()
    return {
        "app_name": settings.APP_NAME,
        "app_tagline": settings.APP_TAGLINE,
        "app_version": settings.APP_VERSION,
        "app_env": settings.APP_ENV,
        "lm_studio_base_url": settings.LM_STUDIO_BASE_URL,
        "lm_studio_model": settings.LM_STUDIO_MODEL,
        "lm_studio_connected": models_info.get("connected", False),
        "lm_studio_model_loaded": models_info.get("configured_model_loaded", False),
        "serp_provider": settings.SERP_PROVIDER,
        "serp_configured": serp_info.get("configured", False),
        "mock_mode": serp_info.get("mock_mode", False),
        "serp_result_limit": settings.SERP_RESULT_LIMIT,
        "discord_configured": discord_status.configured,
        "discord_enabled": discord_status.enabled,
        "preview_timeout": settings.PREVIEW_TIMEOUT_SECONDS,
        "database_url": settings.DATABASE_URL
    }

