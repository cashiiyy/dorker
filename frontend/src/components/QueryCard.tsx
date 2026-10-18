import React, { useState } from 'react';
import {
  Copy, Check, Search, AlertTriangle, ShieldCheck,
  ChevronRight, ExternalLink, Zap, Code2, Info
} from 'lucide-react';
import { GeneratedQuery } from '../types';

interface QueryCardProps {
  query: GeneratedQuery;
  isSearching: boolean;
  onSearch: (query: string) => void;
}

/** Syntax-highlight Google dork operators in a query string */
function highlightDork(raw: string): React.ReactNode[] {
  // Order matters: more specific patterns first
  const patterns: { re: RegExp; cls: string }[] = [
    { re: /(site:[^\s]+)/g,           cls: 'dork-site'  },
    { re: /(filetype:[^\s]+)/g,       cls: 'dork-op'    },
    { re: /(intitle:[^\s]+)/g,        cls: 'dork-op'    },
    { re: /(inurl:[^\s]+)/g,          cls: 'dork-op'    },
    { re: /(intext:[^\s]+)/g,         cls: 'dork-op'    },
    { re: /(ext:[^\s]+)/g,            cls: 'dork-op'    },
    { re: /("(?:[^"\\]|\\.)*")/g,     cls: 'dork-quote' },
    { re: /(\bOR\b)/g,                cls: 'dork-op'    },
    { re: /(\bAND\b)/g,               cls: 'dork-op'    },
    { re: /(-[^\s"]+)/g,              cls: 'dork-minus' },
  ];

  // Use a single-pass approach: split into tokens
  const tokens: { text: string; cls?: string }[] = [{ text: raw }];

  for (const { re, cls } of patterns) {
    const next: typeof tokens = [];
    for (const tok of tokens) {
      if (tok.cls) { next.push(tok); continue; } // already classified
      const parts = tok.text.split(re);
      parts.forEach((part, i) => {
        if (!part) return;
        // Every 2nd part (i % 2 === 1) is the captured group (a match)
        next.push({ text: part, cls: i % 2 === 1 ? cls : undefined });
      });
    }
    tokens.splice(0, tokens.length, ...next);
  }

  return tokens.map((tok, i) =>
    tok.cls
      ? <span key={i} className={tok.cls}>{tok.text}</span>
      : <span key={i}>{tok.text}</span>
  );
}

const RISK_CONFIG = {
  low:        { label: 'LOW RISK',   cls: 'badge-low',    border: 'rgba(16,185,129,0.2)',  glow: 'rgba(16,185,129,0.06)' },
  medium:     { label: 'MEDIUM',     cls: 'badge-medium', border: 'rgba(245,158,11,0.2)',  glow: 'rgba(245,158,11,0.04)' },
  high:       { label: 'HIGH RISK',  cls: 'badge-high',   border: 'rgba(239,68,68,0.2)',   glow: 'rgba(239,68,68,0.04)' },
  prohibited: { label: 'BLOCKED',    cls: 'badge-high',   border: 'rgba(239,68,68,0.35)',  glow: 'rgba(239,68,68,0.08)' },
};

export const QueryCard: React.FC<QueryCardProps> = ({ query, isSearching, onSearch }) => {
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const risk = RISK_CONFIG[query.risk_level] || RISK_CONFIG.low;
  const isBlocked = query.risk_level === 'prohibited' || !query.is_valid;

  const handleCopy = () => {
    navigator.clipboard.writeText(query.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGoogle = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query.query)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="glass-card rounded-2xl overflow-hidden"
      style={{
        borderColor: isBlocked ? 'rgba(239,68,68,0.2)' : risk.border,
        boxShadow: `0 4px 30px rgba(0,0,0,0.3), inset 0 0 30px ${risk.glow}`,
      }}
    >
      {/* Top accent line */}
      <div
        className="h-0.5"
        style={{
          background: isBlocked
            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
            : query.risk_level === 'medium'
            ? 'linear-gradient(90deg, #f59e0b, #d97706)'
            : 'linear-gradient(90deg, #63b3ed, #a78bfa)',
        }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Code2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#63b3ed' }} />
              <span
                className="text-sm font-bold"
                style={{ color: '#f0f6ff', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {query.label}
              </span>
              <span className={`badge ${risk.cls}`}>{risk.label}</span>
              {query.requires_scope_confirmation && (
                <span className="badge badge-medium">SCOPE CONFIRM</span>
              )}
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(148,163,184,0.65)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {query.purpose}
            </p>
          </div>

          {/* Notes toggle */}
          {query.validation_notes.length > 0 && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: showNotes ? 'rgba(99,179,237,0.12)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: showNotes ? '#63b3ed' : 'rgba(148,163,184,0.5)',
              }}
              title="Show validation notes"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dork Query Display */}
        <div className="dork-query mb-3 select-all">
          {highlightDork(query.query)}
        </div>

        {/* Operator badges */}
        {query.operators.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {query.operators.map((op) => (
              <span
                key={op}
                className="text-[10px] px-2 py-0.5 rounded font-mono font-bold"
                style={{
                  background: 'rgba(99,179,237,0.08)',
                  border: '1px solid rgba(99,179,237,0.15)',
                  color: '#93c5fd',
                }}
              >
                {op}
              </span>
            ))}
          </div>
        )}

        {/* Validation notes */}
        {showNotes && query.validation_notes.length > 0 && (
          <div
            className="mb-3 p-3 rounded-xl text-[11px] space-y-1"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            {query.validation_notes.map((note, i) => (
              <div key={i} className="flex items-start gap-1.5" style={{ color: '#fde68a' }}>
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />
                {note}
              </div>
            ))}
          </div>
        )}

        {/* Blocked warning */}
        {isBlocked && (
          <div
            className="flex items-center gap-2 mb-3 p-2.5 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-red-400" />
            Blocked by security guardrails. Query requires scope authorization or targets prohibited resources.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="glow-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: copied ? '#34d399' : 'rgba(148,163,184,0.8)',
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          {/* Open in Google */}
          <button
            onClick={openInGoogle}
            className="glow-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(148,163,184,0.8)',
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Try in Google
          </button>

          {/* Execute via SERP */}
          <button
            onClick={() => !isBlocked && onSearch(query.query)}
            disabled={isSearching || isBlocked}
            className="glow-btn ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isSearching
                ? 'rgba(99,179,237,0.1)'
                : isBlocked
                ? 'rgba(239,68,68,0.08)'
                : 'linear-gradient(135deg, rgba(99,179,237,0.25), rgba(167,139,250,0.2))',
              border: `1px solid ${isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(99,179,237,0.3)'}`,
              color: isBlocked ? '#f87171' : '#f0f6ff',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {isSearching ? (
              <>
                <Search className="w-3.5 h-3.5 animate-spin" style={{ color: '#63b3ed' }} />
                Searching…
              </>
            ) : isBlocked ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Blocked
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" style={{ color: '#63b3ed' }} />
                Execute SERP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
