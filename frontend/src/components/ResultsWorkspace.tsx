import React, { useState } from 'react';
import {
  Globe,
  ExternalLink,
  Eye,
  Calendar,
  Download,
  Copy,
  Check,
  Search,
  AlertCircle,
  FileText
} from 'lucide-react';
import { SearchResponse, SearchResultItem } from '../types';

interface ResultsWorkspaceProps {
  searchResponse: SearchResponse | null;
  loading: boolean;
  onPreview: (url: string) => void;
  onClose: () => void;
}

export const ResultsWorkspace: React.FC<ResultsWorkspaceProps> = ({
  searchResponse,
  loading,
  onPreview,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-white/10 text-center animate-pulse">
        <div className="inline-flex p-3 rounded-full bg-sky-500/10 text-sky-400 mb-3">
          <Search className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-semibold text-slate-100 mb-1">Querying SERP Provider...</h3>
        <p className="text-xs text-slate-400">Dispatching validated Google search query to indexing engine.</p>
      </div>
    );
  }

  if (!searchResponse) return null;

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(searchResponse, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `serp_results_${Date.now()}.json`;
    a.click();
  };

  return (
    <section className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              SERP Results
            </h3>
            {searchResponse.is_mock ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                Mock Provider Data (Safe Dev Mode)
              </span>
            ) : (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                Live SerpApi Engine
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono">
              ({searchResponse.results.length} items)
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono break-all line-clamp-1">
            Query: <span className="text-sky-300">{searchResponse.query}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
            title="Export results to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Error Banner if any */}
      {searchResponse.error && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Provider Notice</div>
            <div>{searchResponse.error}</div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {searchResponse.results.map((res: SearchResultItem, idx: number) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-[#141822] border border-white/5 hover:border-sky-500/30 transition-all group/item"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div>
                <span className="text-[11px] font-mono text-sky-400/80 mr-2">
                  #{res.position || idx + 1}
                </span>
                <a
                  href={res.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-slate-100 hover:text-sky-300 transition-colors inline-flex items-center gap-1.5"
                >
                  {res.title}
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover/item:text-sky-300 transition-colors" />
                </a>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopyLink(res.link)}
                  className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs transition-all"
                  title="Copy source link"
                >
                  {copiedLink === res.link ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => onPreview(res.link)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-medium transition-all"
                  title="View sanitized safe preview"
                >
                  <Eye className="w-3 h-3 text-sky-400" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Metadata (Domain & Date) */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mb-2">
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-300">
                {res.domain}
              </span>
              {res.date && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3 h-3" />
                  {res.date}
                </span>
              )}
              <span className="text-slate-400 truncate max-w-xs">{res.link}</span>
            </div>

            {/* Snippet */}
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {res.snippet}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
