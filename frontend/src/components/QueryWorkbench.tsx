import React, { useState, useEffect, useRef } from 'react';
import {
  Crosshair, Search, Globe, FileCode, ShieldAlert, Database,
  FileText, Copy, Check, Bookmark, Layers, AlertCircle, X, Plus,
  ChevronRight, Zap, Terminal, Send, CheckCircle, RefreshCw,
  Target, Code2, BookOpen, Brain, Binary, Cpu, Compass, FileCheck,
  Radar, Sparkles, Server, Shield
} from 'lucide-react';
import {
  ResearchCategory, GeneratedQuery, GenerateQueriesResponse,
  SearchResultItem, SearchResponse, ResearchSession
} from '../types';
import {
  generateQueries,
  executeSearch,
  saveSession,
  getDiscordStatus,
  sendDiscordReport,
  sendDorksToDiscord
} from '../api';
import { QueryCard } from './QueryCard';
import { ResultsWorkspace } from './ResultsWorkspace';

interface QueryWorkbenchProps {
  onPreviewUrl: (url: string) => void;
  onSessionSaved?: () => void;
  initialSession?: ResearchSession | null;
  onCheckpointUpdate?: (updates: {
    objectiveDefined?: boolean;
    queriesGenerated?: boolean;
    queriesValidated?: boolean;
    searchExecuted?: boolean;
    sentToDiscord?: boolean;
  }) => void;
}

const CATEGORIES: { id: ResearchCategory; label: string; icon: any; desc: string; accent: string }[] = [
  { id: 'public_documentation',  label: 'Public Docs',       icon: BookOpen,    desc: 'API specs, whitepapers',         accent: '#38bdf8' },
  { id: 'security_advisories',   label: 'CVE / Advisories',  icon: ShieldAlert, desc: 'Vuln bulletins, patches',        accent: '#f59e0b' },
  { id: 'code_repositories',     label: 'Code / Repos',      icon: Binary,      desc: 'GitHub, GitLab blobs',            accent: '#10b981' },
  { id: 'datasets_papers',       label: 'Datasets / Papers', icon: Database,    desc: 'arXiv, HuggingFace, Kaggle',      accent: '#a78bfa' },
  { id: 'domain_exposure_audit', label: 'Domain Audit',      icon: Radar,       desc: 'Exposed paths, staging',          accent: '#f87171' },
  { id: 'pdf_technical_docs',    label: 'PDF Extraction',    icon: FileCheck,   desc: 'Manuals, standards',              accent: '#fb923c' },
  { id: 'indexing_diagnostics',  label: 'Index Diagnostics', icon: Server,      desc: 'Subdomain hygiene',               accent: '#34d399' },
  { id: 'academic_osint',        label: 'Academic OSINT',    icon: Compass,     desc: 'Gov, edu, open research',         accent: '#818cf8' },
];

const FILE_TYPES = ['pdf', 'doc', 'docx', 'xls', 'csv', 'json', 'xml', 'txt', 'pptx', 'sql'];
const DATE_RANGES = ['Any time', 'Past 24h', 'Past week', 'Past month', 'Past year'];

export const QueryWorkbench: React.FC<QueryWorkbenchProps> = ({
  onPreviewUrl,
  onSessionSaved,
  initialSession,
  onCheckpointUpdate,
}) => {
  const [objective, setObjective] = useState(initialSession?.objective || '');
  const [category, setCategory] = useState<ResearchCategory>(
    (initialSession?.category as ResearchCategory) || 'public_documentation'
  );

  useEffect(() => {
    if (onCheckpointUpdate) {
      onCheckpointUpdate({ objectiveDefined: objective.trim().length > 3 });
    }
  }, [objective, onCheckpointUpdate]);
  const [targetDomains, setTargetDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('Any time');
  const [authorizedConfirmed, setAuthorizedConfirmed] = useState(false);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genResponse, setGenResponse] = useState<GenerateQueriesResponse | null>(
    initialSession ? {
      research_title: initialSession.title,
      objective_summary: initialSession.objective,
      scope: { domains: [], category: initialSession.category, authorized: true },
      queries: initialSession.queries,
      limitations: [],
      model_used: 'Local Qwen 3.5 9B',
      is_local: true,
    } : null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);

  // Session
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSavedMsg, setSessionSavedMsg] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(initialSession?.id || null);

  // Discord
  const [discordConfigured, setDiscordConfigured] = useState(false);
  const [dorkDiscordSending, setDorkDiscordSending] = useState(false);
  const [dorkDiscordSuccess, setDorkDiscordSuccess] = useState<string | null>(null);
  const [dorkDiscordError, setDorkDiscordError] = useState<string | null>(null);

  useEffect(() => {
    getDiscordStatus().then((s) => setDiscordConfigured(s.configured && s.enabled)).catch(() => {});
  }, []);

  const handleAddDomain = () => {
    if (!domainInput.trim()) return;
    const clean = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (clean && !targetDomains.includes(clean)) setTargetDomains([...targetDomains, clean]);
    setDomainInput('');
  };

  const handleAddKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw]);
    setKeywordInput('');
  };

  const toggleFileType = (ft: string) => {
    setSelectedFileTypes(prev =>
      prev.includes(ft) ? prev.filter(f => f !== ft) : [...prev, ft]
    );
  };

  const handleGenerate = async () => {
    if (!objective.trim()) { setErrorMsg('Enter a research objective.'); return; }
    if (category === 'domain_exposure_audit' && targetDomains.length === 0) {
      setErrorMsg('Domain Audit requires at least one target domain.'); return;
    }
    try {
      setGenerating(true); setErrorMsg(null); setSearchResponse(null); setGenResponse(null);
      const res = await generateQueries({
        objective: objective.trim(), category,
        target_domains: targetDomains.length > 0 ? targetDomains : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        file_types: selectedFileTypes.length > 0 ? selectedFileTypes : undefined,
        date_range: dateRange !== 'Any time' ? dateRange : undefined,
        authorized_domain_confirmed: authorizedConfirmed,
      });
      setGenResponse(res);
      if (onCheckpointUpdate) {
        onCheckpointUpdate({
          queriesGenerated: true,
          queriesValidated: res.queries.length > 0,
        });
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Generation failed. Is LM Studio running?');
    } finally { setGenerating(false); }
  };

  const handleSearch = async (query: string, queryId: string) => {
    try {
      setActiveQueryId(queryId); setSearching(true); setSearchResponse(null);
      const res = await executeSearch({ query, num_results: 10 });
      setSearchResponse(res);
      if (onCheckpointUpdate) {
        onCheckpointUpdate({ searchExecuted: true });
      }
    } catch (e: any) {
      setSearchResponse({ query, total_results: 0, provider: 'error', is_mock: false, results: [], error: e.message });
    } finally { setSearching(false); }
  };

  const handleSaveSession = async () => {
    if (!genResponse) return;
    try {
      setSavingSession(true);
      const saved = await saveSession({
        title: genResponse.research_title || `DORKER: ${objective.slice(0, 40)}`,
        objective: objective.trim(), category,
        queries: genResponse.queries,
        results: searchResponse?.results || [],
        notes: `Generated via DORKER AI (${genResponse.model_used})`,
      });
      setSavedSessionId(saved.id); setSessionSavedMsg(true);
      setTimeout(() => setSessionSavedMsg(false), 3000);
      if (onSessionSaved) onSessionSaved();
      getDiscordStatus().then((s) => setDiscordConfigured(s.configured && s.enabled)).catch(() => {});
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally { setSavingSession(false); }
  };

  const handleSendDorksToDiscord = async () => {
    if (!genResponse) return;
    try {
      setDorkDiscordSending(true);
      setDorkDiscordError(null);
      setDorkDiscordSuccess(null);
      const res = await sendDorksToDiscord({
        title: genResponse.research_title,
        objective: genResponse.objective_summary,
        queries: genResponse.queries,
        category: category,
      });
      setDorkDiscordSuccess(`Delivered ${res.messages_sent} dispatch to Discord at ${new Date(res.delivery_timestamp).toLocaleTimeString()}`);
      if (onCheckpointUpdate) {
        onCheckpointUpdate({ sentToDiscord: true });
      }
      setTimeout(() => setDorkDiscordSuccess(null), 6000);
    } catch (err: any) {
      setDorkDiscordError(err.message || 'Failed to dispatch dorks to Discord');
    } finally {
      setDorkDiscordSending(false);
    }
  };

  const catObj = CATEGORIES.find(c => c.id === category);

  return (
    <div className="space-y-6 max-w-5xl animate-fade-up">

      {/* ─── Objective Input ─── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'rgba(11,17,32,0.8)',
          border: '1px solid rgba(99,179,237,0.15)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 40px rgba(0,0,0,0.4), 0 0 60px rgba(99,179,237,0.04)',
        }}
      >
        {/* Decorative top gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,179,237,0.5), rgba(167,139,250,0.5), transparent)' }}
        />

        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4" style={{ color: '#63b3ed' }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#63b3ed', fontFamily: 'JetBrains Mono, monospace' }}>
            Research Objective
          </span>
        </div>

        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Describe what you want to research… e.g. 'Find all publicly exposed API documentation for authentication services'"
          rows={3}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#f0f6ff',
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: '1.7',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(99,179,237,0.4)';
            e.target.style.boxShadow = '0 0 0 3px rgba(99,179,237,0.08)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.08)';
            e.target.style.boxShadow = 'none';
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleGenerate()}
        />

        {/* Character counter */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
            Ctrl+Enter to generate
          </span>
          <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
            {objective.length} chars
          </span>
        </div>
      </div>

      {/* ─── Category Selector ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(167,139,250,0.8)', fontFamily: 'JetBrains Mono, monospace' }}>
            Research Category
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`p-3 rounded-xl text-left transition-all duration-300 group stagger-${Math.min(i+1,6)}`}
                style={{
                  background: active ? `${cat.accent}12` : 'rgba(11,17,32,0.6)',
                  border: `1px solid ${active ? cat.accent + '40' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: active ? `0 4px 20px ${cat.accent}15` : 'none',
                  transform: active ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <Icon className="w-3.5 h-3.5 mb-1.5" style={{ color: active ? cat.accent : 'rgba(148,163,184,0.5)' }} />
                <div className="text-[11px] font-semibold" style={{ color: active ? '#f0f6ff' : 'rgba(148,163,184,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {cat.label}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'rgba(100,116,139,0.7)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {cat.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Advanced Options Row ─── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Target Domains */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(99,179,237,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
            Target Domains
          </div>
          <div className="flex gap-1.5 mb-2">
            <input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              placeholder="example.com"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f0f6ff',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            <button
              onClick={handleAddDomain}
              className="px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.25)', color: '#63b3ed' }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {targetDomains.map((d) => (
              <span key={d} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono"
                style={{ background: 'rgba(99,179,237,0.1)', border: '1px solid rgba(99,179,237,0.2)', color: '#7dd3fc' }}>
                {d}
                <button onClick={() => setTargetDomains(targetDomains.filter(x => x !== d))} className="hover:text-red-400">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          {category === 'domain_exposure_audit' && targetDomains.length === 0 && (
            <p className="text-[10px] mt-2" style={{ color: '#f59e0b' }}>⚠ Required for Domain Audit</p>
          )}
        </div>

        {/* Keywords */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(167,139,250,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
            Keywords
          </div>
          <div className="flex gap-1.5 mb-2">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder="Add keyword"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f0f6ff',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            <button
              onClick={handleAddKeyword}
              className="px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono"
                style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#c4b5fd' }}>
                {kw}
                <button onClick={() => setKeywords(keywords.filter(x => x !== kw))} className="hover:text-red-400">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* File Types + Date */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(11,17,32,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(16,185,129,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
            File Types
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {FILE_TYPES.map((ft) => (
              <button
                key={ft}
                onClick={() => toggleFileType(ft)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all duration-200"
                style={{
                  background: selectedFileTypes.includes(ft) ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedFileTypes.includes(ft) ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  color: selectedFileTypes.includes(ft) ? '#34d399' : 'rgba(148,163,184,0.5)',
                }}
              >
                .{ft}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'rgba(251,146,60,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
            Date Range
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f6ff',
              appearance: 'none',
            }}
          >
            {DATE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Domain Audit Authorization */}
      {category === 'domain_exposure_audit' && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl animate-fade-up"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <input
            type="checkbox"
            id="authConfirm"
            checked={authorizedConfirmed}
            onChange={(e) => setAuthorizedConfirmed(e.target.checked)}
            className="mt-0.5 accent-amber-500"
          />
          <label htmlFor="authConfirm" className="text-xs leading-relaxed cursor-pointer" style={{ color: '#fde68a' }}>
            <span className="font-bold">⚠ Authorization Declaration</span><br />
            I confirm I have explicit written authorization to conduct this exposure audit on the specified target domains. Unauthorized enumeration may violate CFAA/Computer Misuse Act.
          </label>
        </div>
      )}

      {/* ─── Error ─── */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl animate-fade-up"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#f87171' }} />
          <p className="text-xs" style={{ color: '#fca5a5', fontFamily: "'Space Grotesk', sans-serif" }}>{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="ml-auto" style={{ color: '#94a3b8' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Generate Button ─── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating || !objective.trim()}
          className="glow-btn flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: generating
              ? 'rgba(99,179,237,0.1)'
              : 'linear-gradient(135deg, rgba(99,179,237,0.25), rgba(167,139,250,0.25))',
            border: '1px solid rgba(99,179,237,0.35)',
            color: '#f0f6ff',
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: '0 4px 20px rgba(99,179,237,0.1)',
          }}
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#63b3ed' }} />
              <span>Generating Dork Queries…</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" style={{ color: '#63b3ed' }} />
              <span>Generate Dork Queries</span>
            </>
          )}
        </button>

        {generating && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(148,163,184,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
            <Brain className="w-3.5 h-3.5 animate-pulse" style={{ color: '#a78bfa' }} />
            Qwen 3.5 9B synthesizing operators…
          </div>
        )}
      </div>

      {/* ─── Generated Queries Panel ─── */}
      {genResponse && (
        <div className="space-y-4 animate-fade-up">
          {/* Header */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'rgba(11,17,32,0.85)',
              border: '1px solid rgba(99,179,237,0.12)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(99,179,237,0.4), transparent)' }}
            />
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Code2 className="w-4 h-4" style={{ color: '#63b3ed' }} />
                  <h2 className="text-base font-bold" style={{ color: '#f0f6ff', fontFamily: "'Space Grotesk', sans-serif" }}>
                    {genResponse.research_title}
                  </h2>
                </div>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {genResponse.objective_summary}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="badge badge-pro">
                  {genResponse.queries.length} queries
                </span>
                <span className="badge badge-violet">
                  {genResponse.is_local ? 'Local AI' : 'Fallback'}
                </span>
              </div>
            </div>

            {/* Model info */}
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(100,116,139,0.7)', fontFamily: 'JetBrains Mono, monospace' }}>
              <Brain className="w-3 h-3" />
              {genResponse.model_used}
            </div>

            {/* Session actions */}
            {genResponse && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={handleSaveSession}
                  disabled={savingSession}
                  className="glow-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: 'rgba(167,139,250,0.15)',
                    border: '1px solid rgba(167,139,250,0.3)',
                    color: '#c4b5fd',
                  }}
                >
                  {savingSession ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {sessionSavedMsg ? 'Saved!' : savingSession ? 'Saving…' : 'Save Session'}
                </button>

                {discordConfigured && (
                  <button
                    onClick={handleSendDorksToDiscord}
                    disabled={dorkDiscordSending}
                    className="glow-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: 'rgba(99,102,241,0.18)',
                      border: '1px solid rgba(99,102,241,0.35)',
                      color: '#c7d2fe',
                    }}
                    title="Send synthesized dork query commands to Discord webhook"
                  >
                    {dorkDiscordSending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: '#818cf8' }} />
                    ) : (
                      <Send className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
                    )}
                    {dorkDiscordSending ? 'Sending to Discord…' : 'Send Dorks to Discord'}
                  </button>
                )}

                {savedSessionId && (
                  <span className="text-[10px] font-mono ml-auto" style={{ color: 'rgba(100,116,139,0.6)' }}>
                    ID: {savedSessionId.slice(0, 8)}
                  </span>
                )}
              </div>
            )}

            {/* Dork discord feedback */}
            {dorkDiscordSuccess && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{dorkDiscordSuccess}</span>
              </div>
            )}
            {dorkDiscordError && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{dorkDiscordError}</span>
              </div>
            )}
          </div>

          {/* Limitations */}
          {genResponse.limitations.length > 0 && (
            <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl text-[11px]"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <div style={{ color: 'rgba(253,230,138,0.7)' }}>
                {genResponse.limitations.join(' · ')}
              </div>
            </div>
          )}

          {/* Query Cards */}
          <div className="space-y-3">
            {genResponse.queries.map((q, i) => (
              <div key={q.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                <QueryCard
                  query={q}
                  isSearching={searching && activeQueryId === q.id}
                  onSearch={(queryStr) => handleSearch(queryStr, q.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Results Workspace ─── */}
      {(searchResponse || searching) && (
        <div className="animate-fade-up">
          <ResultsWorkspace
            searchResponse={searchResponse}
            loading={searching}
            onPreview={onPreviewUrl}
            onClose={() => setSearchResponse(null)}
            sessionId={savedSessionId || undefined}
            discordConfigured={discordConfigured}
            onDiscordSent={() => {
              if (onCheckpointUpdate) {
                onCheckpointUpdate({ sentToDiscord: true });
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
