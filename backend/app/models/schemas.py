from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ResearchCategory(str, Enum):
    PUBLIC_DOCUMENTATION = "public_documentation"
    SECURITY_ADVISORIES = "security_advisories"
    CODE_REPOSITORIES = "code_repositories"
    DATASETS_PAPERS = "datasets_papers"
    DOMAIN_EXPOSURE_AUDIT = "domain_exposure_audit"
    PDF_TECHNICAL_DOCS = "pdf_technical_docs"
    INDEXING_DIAGNOSTICS = "indexing_diagnostics"
    ACADEMIC_OSINT = "academic_osINT"

class ScopeConfig(BaseModel):
    domains: List[str] = []
    category: str
    authorized: bool = False
    keywords: List[str] = []
    file_types: List[str] = []

class GeneratedQuery(BaseModel):
    id: str
    label: str
    query: str
    purpose: str
    operators: List[str] = []
    risk_level: str = "low"  # low, medium, high, prohibited
    requires_scope_confirmation: bool = False
    is_valid: bool = True
    validation_notes: List[str] = []

class GenerateQueriesRequest(BaseModel):
    objective: str = Field(..., min_length=3, max_length=2000)
    category: ResearchCategory = ResearchCategory.PUBLIC_DOCUMENTATION
    target_domains: List[str] = []
    keywords: List[str] = []
    file_types: List[str] = []
    date_range: Optional[str] = None
    authorized_domain_confirmed: bool = False

class GenerateQueriesResponse(BaseModel):
    research_title: str
    objective_summary: str
    scope: Dict[str, Any]
    queries: List[GeneratedQuery]
    limitations: List[str] = []
    model_used: str
    is_local: bool = True

class ValidateQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    target_domains: List[str] = []
    category: Optional[str] = None
    authorized_domain_confirmed: bool = False

class ValidateQueryResponse(BaseModel):
    is_valid: bool
    normalized_query: str
    operators_found: List[str]
    risk_level: str
    domain_scope_ok: bool
    requires_scope_confirmation: bool
    notes: List[str]

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    num_results: int = Field(default=10, ge=1, le=50)
    engine: str = "google"
    target_domain: Optional[str] = None
    mock_mode: Optional[bool] = None


class SearchResultItem(BaseModel):
    title: str
    link: str
    snippet: str
    domain: str
    date: Optional[str] = None
    position: int = 0

class SearchResponse(BaseModel):
    query: str
    total_results: int
    provider: str
    is_mock: bool
    results: List[SearchResultItem]
    error: Optional[str] = None

class PreviewRequest(BaseModel):
    url: str

class PreviewResponse(BaseModel):
    url: str
    title: str
    description: Optional[str] = None
    domain: str
    content_excerpt: str
    sanitized_html: str
    status: str
    error: Optional[str] = None

class ResearchSessionCreate(BaseModel):
    title: str
    objective: str
    category: str
    queries: List[Dict[str, Any]]
    results: List[Dict[str, Any]] = []
    notes: Optional[str] = None

class ResearchSessionItem(BaseModel):
    id: str
    title: str
    objective: str
    category: str
    created_at: str
    queries: List[Dict[str, Any]] = []
    results: List[Dict[str, Any]] = []
    notes: Optional[str] = None

# Discord Integration Schemas
class DiscordSendRequest(BaseModel):
    session_id: str
    selected_result_indices: List[int] = Field(..., min_length=1)
    custom_title: Optional[str] = None
    query_executed: Optional[str] = None

class DiscordPreviewRequest(BaseModel):
    session_id: str
    selected_result_indices: List[int] = Field(..., min_length=1)
    custom_title: Optional[str] = None
    query_executed: Optional[str] = None

class DiscordMessagePreview(BaseModel):
    content: Optional[str] = None
    embeds: List[Dict[str, Any]] = []
    total_characters: int = 0
    message_count: int = 1

class DiscordSendResponse(BaseModel):
    success: bool
    messages_sent: int = 0
    delivery_timestamp: str
    error: Optional[str] = None

class DiscordConfigUpdate(BaseModel):
    webhook_url: str = Field(..., min_length=10)
    enabled: bool = True
    max_results_per_msg: int = Field(default=5, ge=1, le=10)

class DiscordStatusResponse(BaseModel):
    configured: bool
    enabled: bool
    masked_webhook: str
    max_results_per_msg: int
    last_delivery: Optional[str] = None
    last_error: Optional[str] = None

class DiscordSendDorksRequest(BaseModel):
    title: str
    objective: str
    queries: List[Dict[str, Any]]
    category: Optional[str] = "public_documentation"

class DiscordSendDirectResultsRequest(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    title: Optional[str] = None
    objective: Optional[str] = None

class MockModeToggleRequest(BaseModel):
    enabled: bool


