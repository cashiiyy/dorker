import React, { useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Search,
  Edit2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  CheckCircle2
} from 'lucide-react';
import { GeneratedQuery } from '../types';

interface QueryCardProps {
  query: GeneratedQuery;
  onSearch: (queryString: string) => void;
  onUpdateQuery?: (id: string, newQuery: string) => void;
}

export const QueryCard: React.FC<QueryCardProps> = ({
  query,
  onSearch,
  onUpdateQuery,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuery, setEditedQuery] = useState(query.query);

  const handleCopy = () => {
    // Exact validated query string, without extra formatting
    navigator.clipboard.writeText(isEditing ? editedQuery : query.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGoogle = () => {
    const q = isEditing ? editedQuery : query.query;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSaveEdit = () => {
    if (onUpdateQuery) {
      onUpdateQuery(query.id, editedQuery);
    }
    setIsEditing(false);
  };

  const getRiskBadge = () => {
    switch (query.risk_level) {
      case 'prohibited':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">
            <ShieldAlert className="w-3 h-3" /> Prohibited
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
            <AlertTriangle className="w-3 h-3" /> Scope Warning
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">
            <Info className="w-3 h-3" /> Sensitive Scope
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            <ShieldCheck className="w-3 h-3" /> Validated Safe
          </span>
        );
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-white/10 hover:border-sky-500/30 flex flex-col justify-between group">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-slate-100 text-sm">{query.label}</h4>
            {getRiskBadge()}
            {query.requires_scope_confirmation && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                Needs Owner Auth
              </span>
            )}
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10"
            title="Edit query string"
          >
            <Edit2 className="w-3 h-3" />
            <span className="text-[11px]">{isEditing ? 'Done' : 'Edit'}</span>
          </button>
        </div>

        {/* Purpose Description */}
        <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">
          {query.purpose}
        </p>

        {/* Google Query Code Box */}
        {isEditing ? (
          <div className="space-y-2 mb-3">
            <textarea
              value={editedQuery}
              onChange={(e) => setEditedQuery(e.target.value)}
              className="w-full bg-[#0a0d13] border border-sky-500/40 rounded-lg p-2.5 text-xs font-mono text-sky-200 focus:outline-none focus:ring-1 focus:ring-sky-400"
              rows={2}
            />
            <button
              onClick={handleSaveEdit}
              className="text-xs px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 font-medium"
            >
              Apply Changes
            </button>
          </div>
        ) : (
          <div className="relative mb-3.5 group/code">
            <div className="bg-[#0b0e14] border border-white/10 rounded-lg p-3 font-mono text-xs text-sky-300 break-all select-all leading-normal shadow-inner">
              {query.query}
            </div>
          </div>
        )}

        {/* Search Operators Tags */}
        {query.operators && query.operators.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {query.operators.map((op, i) => (
              <span
                key={i}
                className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#161b26] text-slate-300 border border-white/5"
              >
                {op}
              </span>
            ))}
          </div>
        )}

        {/* Validation Notes if any */}
        {query.validation_notes && query.validation_notes.length > 0 && (
          <div className="mb-3.5 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-0.5 font-sans">
            {query.validation_notes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <Info className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-1.5">
          {/* Copy Action */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
            }`}
            title="Copy exact Google query"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Open in Google Search Action */}
          <button
            onClick={handleOpenGoogle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title="Open query directly on Google.com"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Google</span>
          </button>
        </div>

        {/* Search with SERP API Action */}
        <button
          onClick={() => onSearch(isEditing ? editedQuery : query.query)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-sky-200 border border-sky-500/40 transition-all shadow-sm"
          title="Query SERP API and inspect results"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
          <span>SERP Search</span>
        </button>
      </div>
    </div>
  );
};
