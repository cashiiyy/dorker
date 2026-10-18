export type ResearchCategory =
  | 'public_documentation'
  | 'security_advisories'
  | 'code_repositories'
  | 'datasets_papers'
  | 'domain_exposure_audit'
  | 'pdf_technical_docs'
  | 'indexing_diagnostics'
  | 'academic_osint';

export interface GeneratedQuery {
  id: string;
  label: string;
  query: string;
  purpose: string;
  operators: string[];
  risk_level: 'low' | 'medium' | 'high' | 'prohibited';
  requires_scope_confirmation: boolean;
  is_valid: boolean;
  validation_notes: string[];
}

export interface ScopeInfo {
  domains: string[];
  category: string;
  authorized: boolean;
}

export interface GenerateQueriesResponse {
  research_title: string;
  objective_summary: string;
  scope: ScopeInfo;
  queries: GeneratedQuery[];
  limitations: string[];
  model_used: string;
  is_local: boolean;
}

export interface ValidateQueryResponse {
  is_valid: boolean;
  normalized_query: string;
  operators_found: string[];
  risk_level: string;
  domain_scope_ok: boolean;
  requires_scope_confirmation: boolean;
  notes: string[];
}

export interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
  domain: string;
  date?: string;
  position: number;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  provider: string;
  is_mock: boolean;
  results: SearchResultItem[];
  error?: string;
}

export interface PreviewResponse {
  url: string;
  title: string;
  description?: string;
  domain: string;
  content_excerpt: string;
  sanitized_html: string;
  status: 'success' | 'blocked' | 'error';
  error?: string;
}

export interface ResearchSession {
  id: string;
  title: string;
  objective: string;
  category: string;
  created_at: string;
  queries: GeneratedQuery[];
  results: SearchResultItem[];
  notes?: string;
}

export interface SystemHealth {
  status: string;
  app: string;
  env: string;
  lm_studio: {
    connected: boolean;
    configured_model: string;
    configured_model_loaded: boolean;
    base_url: string;
  };
  serp_provider: {
    provider: string;
    configured: boolean;
    mock_mode: boolean;
    masked_key: string;
  };
  database: string;
}

export interface SettingsStatus {
  app_name: string;
  app_env: string;
  lm_studio_base_url: string;
  lm_studio_model: string;
  lm_studio_connected: boolean;
  lm_studio_model_loaded: boolean;
  serp_provider: string;
  serp_configured: boolean;
  serp_result_limit: number;
  preview_timeout: number;
  database_url: string;
  discord_configured: boolean;
  discord_enabled: boolean;
}

// ---- Discord Integration ----

export interface DiscordStatus {
  configured: boolean;
  enabled: boolean;
  masked_webhook: string;
  max_results_per_msg: number;
  last_delivery: string | null;
  last_error: string | null;
}

export interface DiscordConfigUpdate {
  webhook_url: string;
  enabled: boolean;
  max_results_per_msg: number;
}

export interface DiscordSendRequest {
  session_id: string;
  selected_result_indices: number[];
  custom_title?: string;
  query_executed?: string;
}

export interface DiscordMessagePreview {
  content: string | null;
  embeds: any[];
  total_characters: number;
  message_count: number;
}

export interface DiscordSendResponse {
  success: boolean;
  messages_sent: number;
  delivery_timestamp: string;
  error?: string;
}
