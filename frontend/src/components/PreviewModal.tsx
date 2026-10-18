import React from 'react';
import { X, ShieldCheck, ExternalLink, Globe, AlertTriangle } from 'lucide-react';
import { PreviewResponse } from '../types';

interface PreviewModalProps {
  preview: PreviewResponse | null;
  loading: boolean;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  preview,
  loading,
  onClose,
}) => {
  if (!preview && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f131c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 truncate max-w-md">
                  {loading ? 'Retrieving Document...' : preview?.title || 'Document Preview'}
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> SSRF & Sanitized Safe
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                {preview?.url}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {preview?.url && (
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs flex items-center gap-1.5 transition-all"
                title="Open live URL in browser"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open URL</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security Notice Banner */}
        <div className="px-6 py-2 bg-sky-950/30 border-b border-sky-800/30 text-[11px] text-sky-300 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            Proxied through backend SSRF filter. Active scripts, external trackers, forms, and embeds stripped for security.
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-300 text-xs leading-relaxed">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400">Inspecting remote host DNS and sanitizing DOM tree...</p>
            </div>
          ) : preview?.status === 'blocked' || preview?.error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                {preview.status === 'blocked' ? 'SSRF Guard Blocked Request' : 'Retrieval Error'}
              </div>
              <p>{preview.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Meta Description */}
              {preview?.description && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 italic">
                  "{preview.description}"
                </div>
              )}

              {/* Text Excerpt */}
              <div>
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 font-mono">
                  Extracted Content Excerpt
                </h4>
                <div className="p-4 rounded-xl bg-[#090b10] border border-white/10 font-sans whitespace-pre-line text-slate-300 max-h-48 overflow-y-auto">
                  {preview?.content_excerpt}
                </div>
              </div>

              {/* Sanitized View */}
              <div>
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 font-mono">
                  Sanitized Structural Content
                </h4>
                <div
                  className="p-5 rounded-xl bg-[#090b10] border border-white/10 prose prose-invert prose-xs max-w-none max-h-80 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: preview?.sanitized_html || '<p>No content preview available</p>' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#141824] flex items-center justify-between text-xs text-slate-400">
          <span>Domain: <strong className="text-slate-200 font-mono">{preview?.domain}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 font-medium transition-all"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
