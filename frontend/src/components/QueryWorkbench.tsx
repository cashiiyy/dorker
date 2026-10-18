import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Globe,
  FileCode,
  ShieldAlert,
  Database,
  FileText,
  Copy,
  Check,
  Bookmark,
  Layers,
  AlertCircle,
  Tag,
  Calendar,
  X,
  Plus
} from 'lucide-react';
import {
  ResearchCategory,
  GeneratedQuery,
  GenerateQueriesResponse,
  SearchResultItem,
  SearchResponse,
  ResearchSession
} from '../types';
import { generateQueries, executeSearch, saveSession } from '../api';
import { QueryCard } from './QueryCard';
import { ResultsWorkspace } from './ResultsWorkspace';

interface QueryWorkbenchProps {
  onPreviewUrl: (url: string) => void;
  onSessionSaved?: () => void;
  initialSession?: ResearchSession | null;
}

const CATEGORY_PRESETS: { id: ResearchCategory; label: string; icon: any; desc: string }[] = [
  { id: 'public_documentation', label: 'Public Documentation', icon: FileText, desc: 'API docs, manuals, architecture specs' },
  { id: 'security_advisories', label: 'Security Advisories & CVEs', icon: ShieldAlert, desc: 'Vendor bulletins, CVE disclosures, patches' },
  { id: 'code_repositories', label: 'Code & Repositories', icon: FileCode, desc: 'GitHub/GitLab repos, trees, and blobs' },
  { id: 'datasets_papers', label: 'Datasets & Papers', icon: Database, desc: 'arXiv, HuggingFace, Kaggle, OpenData' },
  { id: 'domain_exposure_audit', label: 'Authorized Domain Audit', icon: Globe, desc: 'Exposed subdomains, test routes, staging' },
  { id: 'pdf_technical_docs', label: 'Technical PDF Extraction', icon: FileText, desc: 'Whitepapers, standards, schematics' },
  { id: 'indexing_diagnostics', label: 'Indexing Diagnostics', icon: Layers, desc: 'Subdomain hygiene, index hygiene, 404s' },
  { id: 'academic_osint', label: 'Lawful Academic OSINT', icon: Search, desc: 'Government, university, open research' },
];

export const QueryWorkbench: React.FC<QueryWorkbenchProps> = ({
  onPreviewUrl,
  onSessionSaved,
  initialSession,
}) => {
  const [objective, setObjective] = useState(initialSession?.objective || '');
  const [category, setCategory] = useState<ResearchCategory>(
    (initialSession?.category as ResearchCategory) || 'public_documentation'
  );
  const [targetDomains, setTargetDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('Any time');
  const [authorizedConfirmed, setAuthorizedConfirmed] = useState(false);

  // Generation state
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

  // SERP Search state
  const [searching, setSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSavedMsg, setSessionSavedMsg] = useState(false);

  // Add Domain Tag
  const handleAddDomain = () => {
    if (!domainInput.trim()) return;
    const clean = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!targetDomains.includes(clean)) {
      setTargetDomains([...targetDomains, clean]);
    }
    setDomainInput('');
  };

  // Add Keyword Tag
  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    if (!keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
    }
    setKeywordInput('');
  };

  const toggleFileType = (ft: string) => {
    if (selectedFileTypes.includes(ft)) {
      setSelectedFileTypes(selectedFileTypes.filter((f) => f !== ft));
    } else {
      setSelectedFileTypes([...selectedFileTypes, ft]);
    }
  };

  // Handle Generate
  const handleGenerate = async () => {
    if (!objective.trim()) {
      setErrorMsg('Please specify a research objective.');
      return;
    }
    if (category === 'domain_exposure_audit' && targetDomains.length === 0) {
      setErrorMsg('Authorized Domain Exposure Audit requires at least one target domain.');
      return;
    }

    try {
      setGenerating(true);
      setErrorMsg(null);
      setSearchResponse(null);
      const res = await generateQueries({
        objective: objective.trim(),
        category,
        target_domains: targetDomains,
        keywords,
        file_types: selectedFileTypes,
        date_range: dateRange !== 'Any time' ? dateRange : undefined,
        authorized_domain_confirmed: authorizedConfirmed,
      });
      setGenResponse(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate queries');
    } finally {
      setGenerating(false);
    }
  };

  // Handle Search
  const handleExecuteSearch = async (queryStr: string) => {
    try {
      setSearching(true);
      const res = await executeSearch({ query: queryStr, num_results: 10 });
      setSearchResponse(res);
    } catch (err: any) {
      alert(`Search execution failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Update a single query card in-place
  const handleUpdateQuery = (id: string, newQuery: string) => {
    if (!genResponse) return;
    const updated = genResponse.queries.map((q) => (q.id === id ? { ...q, query: newQuery } : q));
    setGenResponse({ ...genResponse, queries: updated });
  };

  // Copy All Queries
  const handleCopyAll = () => {
    if (!genResponse) return;
    const text = genResponse.queries.map((q) => `# ${q.label}\n${q.query}\n`).join('\n');
    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  // Save Session
  const handleSaveSession = async () => {
    if (!genResponse) return;
    try {
      setSavingSession(true);
      await saveSession({
        title: genResponse.research_title || `Research: ${objective.slice(0, 30)}`,
        objective: objective.trim(),
        category,
        queries: genResponse.queries,
        results: searchResponse?.results || [],
        notes: `Executed via SearchLens AI (${genResponse.model_used})`,
      });
      setSessionSavedMsg(true);
      setTimeout(() => setSessionSavedMsg(false), 3000);
      if (onSessionSaved) onSessionSaved();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingSession(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Central Research Input Box */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Natural Language Research Objective
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Qwen 3.5 Local Synthesis
            </span>
          </div>

          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={3}
            placeholder="e.g. Find public security hardening guidelines, CIS benchmarks, and RBAC best practices for Kubernetes clusters..."
            className="w-full bg-[#0a0d13] border border-white/10 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all leading-relaxed resize-none shadow-inner"
          />
        </div>

        {/* Preset Category Pills */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono block mb-2.5">
            Research Preset & Operator Strategy
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORY_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const selected = category === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCategory(preset.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selected
                      ? 'bg-sky-500/15 border-sky-400/40 text-sky-200 shadow-sm'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${selected ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">{preset.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{preset.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope Controls: Target Domains, Keywords, File Types */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
          {/* Target Domains */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
              Target Domains (site: constraint)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDomain())}
                placeholder="e.g. kubernetes.io"
                className="flex-1 bg-[#0a0d13] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/40"
              />
              <button
                type="button"
                onClick={handleAddDomain}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 font-medium border border-white/10 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {targetDomains.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {targetDomains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-mono"
                  >
                    site:{d}
                    <button
                      onClick={() => setTargetDomains(targetDomains.filter((x) => x !== d))}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Keywords */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
              Focus Keywords
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                placeholder="e.g. RBAC, admission controller"
                className="flex-1 bg-[#0a0d13] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/40"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 font-medium border border-white/10 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-slate-300 text-xs"
                  >
                    {k}
                    <button
                      onClick={() => setKeywords(keywords.filter((x) => x !== k))}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* File types & Date range */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400 mr-1">File Types:</span>
            {['pdf', 'docx', 'txt', 'csv', 'json', 'log'].map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => toggleFileType(ft)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all ${
                  selectedFileTypes.includes(ft)
                    ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {ft.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-[#0a0d13] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="Any time">Any time</option>
              <option value="Past 24 hours">Past 24 hours</option>
              <option value="Past week">Past week</option>
              <option value="Past month">Past month</option>
              <option value="Past year">Past year</option>
            </select>
          </div>
        </div>

        {/* Authorization checkbox for Domain Exposure Audits */}
        {category === 'domain_exposure_audit' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <input
              type="checkbox"
              id="auth-check"
              checked={authorizedConfirmed}
              onChange={(e) => setAuthorizedConfirmed(e.target.checked)}
              className="mt-1 rounded bg-[#0a0d13] border-amber-500/50 text-sky-500 focus:ring-0"
            />
            <label htmlFor="auth-check" className="text-xs text-amber-200 leading-relaxed cursor-pointer">
              <strong>Owner Authorization Confirmation:</strong> I confirm that I own or hold explicit written authorization to assess public indexing exposure on the configured target domains.
            </label>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generate Button CTA */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-400 font-mono">
            {targetDomains.length > 0 ? `Scoped to ${targetDomains.length} target(s)` : 'Scope: Open Web'}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-sky-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Formulating Operator Queries...' : 'Generate Google Queries'}</span>
          </button>
        </div>
      </section>

      {/* Generated Queries Presentation */}
      {genResponse && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                {genResponse.research_title || 'Generated Google Queries'}
              </h3>
              <p className="text-xs text-slate-400">
                Model: <span className="font-mono text-sky-300">{genResponse.model_used}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                title="Copy all queries to clipboard"
              >
                {allCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{allCopied ? 'All Copied' : 'Copy All'}</span>
              </button>

              <button
                onClick={handleSaveSession}
                disabled={savingSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 transition-all"
                title="Save queries & findings to SQLite"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{sessionSavedMsg ? 'Saved in DB!' : 'Save Session'}</span>
              </button>
            </div>
          </div>

          {/* Queries Grid */}
          <div className="grid grid-cols-1 gap-4">
            {genResponse.queries.map((q) => (
              <QueryCard
                key={q.id}
                query={q}
                onSearch={handleExecuteSearch}
                onUpdateQuery={handleUpdateQuery}
              />
            ))}
          </div>

          {/* Limitations Banner */}
          {genResponse.limitations && genResponse.limitations.length > 0 && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Methodology & Scope Limitations:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {genResponse.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* SERP Search Results Workspace */}
      <ResultsWorkspace
        searchResponse={searchResponse}
        loading={searching}
        onPreview={onPreviewUrl}
        onClose={() => setSearchResponse(null)}
      />
    </div>
  );
};
