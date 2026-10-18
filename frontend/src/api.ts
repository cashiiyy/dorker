import {
  GenerateQueriesResponse,
  ValidateQueryResponse,
  SearchResponse,
  PreviewResponse,
  ResearchSession,
  SystemHealth,
  SettingsStatus,
  ResearchCategory
} from './types';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSettings(): Promise<SettingsStatus> {
  const res = await fetch(`${BASE_URL}/settings/status`);
  if (!res.ok) throw new Error(`Fetch settings failed: ${res.statusText}`);
  return res.json();
}

export async function testModelInference(): Promise<{ success: boolean; model: string; response?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/models/test`, { method: 'POST' });
  if (!res.ok) throw new Error(`Model test failed: ${res.statusText}`);
  return res.json();
}

export async function generateQueries(params: {
  objective: string;
  category: ResearchCategory;
  target_domains?: string[];
  keywords?: string[];
  file_types?: string[];
  date_range?: string;
  authorized_domain_confirmed?: boolean;
}): Promise<GenerateQueriesResponse> {
  const res = await fetch(`${BASE_URL}/queries/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Query generation failed');
  }
  return res.json();
}

export async function validateQuery(params: {
  query: string;
  target_domains?: string[];
  category?: string;
  authorized_domain_confirmed?: boolean;
}): Promise<ValidateQueryResponse> {
  const res = await fetch(`${BASE_URL}/queries/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Query validation failed');
  return res.json();
}

export async function executeSearch(params: {
  query: string;
  num_results?: number;
}): Promise<SearchResponse> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Search execution failed');
  return res.json();
}

export async function fetchPreview(url: string): Promise<PreviewResponse> {
  const res = await fetch(`${BASE_URL}/sources/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Preview fetch failed');
  return res.json();
}

export async function listSessions(): Promise<ResearchSession[]> {
  const res = await fetch(`${BASE_URL}/research`);
  if (!res.ok) throw new Error('Failed to list sessions');
  return res.json();
}

export async function saveSession(params: {
  title: string;
  objective: string;
  category: string;
  queries: any[];
  results?: any[];
  notes?: string;
}): Promise<ResearchSession> {
  const res = await fetch(`${BASE_URL}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to save session');
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/research/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete session');
}

export function getExportUrl(sessionId: string): string {
  return `${BASE_URL}/research/${sessionId}/export`;
}
