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
  Send,
  CheckSquare,
  Square,
  RefreshCw,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { SearchResponse, SearchResultItem, DiscordSendResponse } from '../types';
import { sendDiscordReport } from '../api';

interface ResultsWorkspaceProps {
  searchResponse: SearchResponse | null;
  loading: boolean;
  onPreview: (url: string) => void;
  onClose: () => void;
  // Discord integration
  sessionId?: string;
  discordConfigured?: boolean;
}

export const ResultsWorkspace: React.FC<ResultsWorkspaceProps> = ({
  searchResponse,
  loading,
  onPreview,
  onClose,
  sessionId,
  discordConfigured,
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<DiscordSendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

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

  const toggleSelect = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    setSendResult(null);
    setSendError(null);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === searchResponse.results.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(searchResponse.results.map((_, i) => i)));
    }
    setSendResult(null);
    setSendError(null);
  };

  const handleSendToDiscord = async () => {
    if (!sessionId) {
      setSendError('Save the session first to enable Discord delivery.');
      return;
    }
    if (selectedIndices.size === 0) {
      setSendError('Select at least one result to send.');
      return;
    }
    try {
      setSending(true);
      setSendResult(null);
      setSendError(null);
      const res = await sendDiscordReport({
        session_id: sessionId,
        selected_result_indices: Array.from(selectedIndices).sort((a, b) => a - b),
        query_executed: searchResponse.query,
      });
      setSendResult(res);
    } catch (e: any) {
      setSendError(e.message || 'Discord delivery failed.');
    } finally {
      setSending(false);
    }
  };

  const allSelected = selectedIndices.size === searchResponse.results.length;
  const showDiscordPanel = discordConfigured && sessionId;

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

      {/* Discord Action Bar */}
      {showDiscordPanel && searchResponse.results.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl bg-indigo-500/8 border border-indigo-500/20">
          <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-indigo-300">Send to Discord</span>
            <span className="text-[11px] text-slate-400 ml-2">
              {selectedIndices.size > 0
                ? `${selectedIndices.size} result${selectedIndices.size !== 1 ? 's' : ''} selected`
                : 'Select results below to include in report'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
            >
              {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5" />}
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleSendToDiscord}
              disabled={sending || selectedIndices.size === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {sending ? 'Sending…' : 'Send to Discord'}
            </button>
          </div>
        </div>
      )}

      {/* Discord no-session notice */}
      {discordConfigured && !sessionId && searchResponse.results.length > 0 && (
        <div className="px-3.5 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-[11px] text-indigo-300 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          Save this session first to enable Discord delivery.
        </div>
      )}

      {/* Discord send feedback */}
      {sendResult && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <div>
            <span className="font-semibold">Delivered to Discord.</span>{' '}
            {sendResult.messages_sent} message{sendResult.messages_sent !== 1 ? 's' : ''} sent at{' '}
            {new Date(sendResult.delivery_timestamp).toLocaleTimeString()}.
          </div>
        </div>
      )}
      {sendError && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {sendError}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {searchResponse.results.map((res: SearchResultItem, idx: number) => {
          const isSelected = selectedIndices.has(idx);
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all group/item ${
                showDiscordPanel
                  ? isSelected
                    ? 'bg-indigo-500/8 border-indigo-500/30'
                    : 'bg-[#141822] border-white/5 hover:border-white/15 cursor-pointer'
                  : 'bg-[#141822] border-white/5 hover:border-sky-500/30'
              }`}
              onClick={() => showDiscordPanel && toggleSelect(idx)}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Selection checkbox */}
                  {showDiscordPanel && (
                    <div className="shrink-0 mt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 group-hover/item:text-slate-300 transition-colors" />
                      )}
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-mono text-sky-400/80 mr-2">
                      #{res.position || idx + 1}
                    </span>
                    <a
                      href={res.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-slate-100 hover:text-sky-300 transition-colors inline-flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {res.title}
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover/item:text-sky-300 transition-colors" />
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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

              {/* Metadata */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mb-2 ml-6">
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
              <p className="text-xs text-slate-300 leading-relaxed font-sans ml-6">
                {res.snippet}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
