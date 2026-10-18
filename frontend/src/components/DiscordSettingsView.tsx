import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Check,
  X,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  Trash2,
  Zap,
  AlertCircle,
  CheckCircle,
  Settings,
  Clock,
  Hash
} from 'lucide-react';
import { DiscordStatus } from '../types';
import {
  getDiscordStatus,
  updateDiscordConfig,
  clearDiscordConfig,
  testDiscordWebhook
} from '../api';

export const DiscordSettingsView: React.FC = () => {
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [maxResults, setMaxResults] = useState(5);
  const [showUrl, setShowUrl] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadStatus = async () => {
    try {
      setLoading(true);
      const s = await getDiscordStatus();
      setStatus(s);
      setEnabled(s.enabled);
      setMaxResults(s.max_results_per_msg);
    } catch (e: any) {
      // Backend down — show placeholder
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async () => {
    const url = webhookUrl.trim();
    if (!url) {
      showFeedback('error', 'Webhook URL is required.');
      return;
    }
    if (!url.includes('discord.com/api/webhooks')) {
      showFeedback('error', 'Must be a valid Discord webhook URL.');
      return;
    }
    try {
      setSaving(true);
      const updated = await updateDiscordConfig({
        webhook_url: url,
        enabled,
        max_results_per_msg: maxResults,
      });
      setStatus(updated);
      setWebhookUrl('');
      setShowUrl(false);
      showFeedback('success', 'Webhook saved. Configuration is active.');
    } catch (e: any) {
      showFeedback('error', e.message || 'Failed to save config.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await testDiscordWebhook();
      if (res.success) {
        showFeedback('success', 'Test ping delivered successfully to Discord.');
      } else {
        showFeedback('error', res.error || 'Test ping failed.');
      }
      await loadStatus();
    } catch (e: any) {
      showFeedback('error', e.message || 'Test failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Remove Discord webhook configuration?')) return;
    try {
      setClearing(true);
      const updated = await clearDiscordConfig();
      setStatus(updated);
      setWebhookUrl('');
      showFeedback('success', 'Discord configuration cleared.');
    } catch (e: any) {
      showFeedback('error', e.message || 'Clear failed.');
    } finally {
      setClearing(false);
    }
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">Discord Webhook Integration</h2>
          <p className="text-xs text-slate-400">
            Deliver reviewed research results to a Discord channel via webhook. Results are sent only after explicit user approval.
          </p>
        </div>
        <button
          onClick={loadStatus}
          className="ml-auto p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          {feedback.msg}
        </div>
      )}

      {/* Current Status Card */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            Current Configuration
          </span>
          {status && (
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                status.configured && status.enabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : status.configured
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-slate-700/40 text-slate-400 border-slate-600/30'
              }`}
            >
              {status.configured && status.enabled
                ? 'Active'
                : status.configured
                ? 'Disabled'
                : 'Not Configured'}
            </span>
          )}
        </div>

        {status ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#141822] rounded-lg p-3 border border-white/5">
              <div className="text-slate-400 mb-1 font-mono text-[11px]">Webhook</div>
              <div className="text-slate-300 font-mono text-[11px] break-all">
                {status.configured ? status.masked_webhook : 'none'}
              </div>
            </div>
            <div className="bg-[#141822] rounded-lg p-3 border border-white/5">
              <div className="text-slate-400 mb-1 font-mono text-[11px] flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Max Results/Message
              </div>
              <div className="text-slate-300 font-mono">{status.max_results_per_msg}</div>
            </div>
            <div className="bg-[#141822] rounded-lg p-3 border border-white/5">
              <div className="text-slate-400 mb-1 font-mono text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last Delivery
              </div>
              <div className="text-slate-300 font-mono text-[11px]">{fmtTime(status.last_delivery)}</div>
            </div>
            <div className="bg-[#141822] rounded-lg p-3 border border-white/5">
              <div className="text-slate-400 mb-1 font-mono text-[11px]">Last Error</div>
              <div className={`font-mono text-[11px] ${status.last_error ? 'text-red-300' : 'text-slate-500'}`}>
                {status.last_error || 'none'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-mono animate-pulse">Loading status…</div>
        )}
      </div>

      {/* Configure Webhook */}
      <div className="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Configure / Update Webhook
        </h3>

        {/* Webhook URL */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium">Webhook URL</label>
          <div className="relative">
            <input
              type={showUrl ? 'text' : 'password'}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-[#141822] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 pr-10 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowUrl(!showUrl)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              title={showUrl ? 'Hide URL' : 'Show URL'}
            >
              {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Paste your Discord channel webhook URL. The secret is masked in transit and storage.
          </p>
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-xs font-medium text-slate-300">Enable Integration</div>
            <div className="text-[11px] text-slate-500">Allow research results to be sent to Discord.</div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? 'bg-indigo-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Max results */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-medium">
            Max Results per Discord Message (1–10)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-sm font-mono font-bold text-indigo-300 w-4 text-center">
              {maxResults}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Each Discord message supports up to 25 embed fields. Larger batches are split automatically.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !webhookUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save Configuration
          </button>

          {status?.configured && (
            <>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700/40 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-600/30 disabled:opacity-50 transition-all"
              >
                {testing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Send Test Ping
              </button>

              <button
                onClick={handleClear}
                disabled={clearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-red-700/20 hover:bg-red-600/30 text-red-300 border border-red-700/30 disabled:opacity-50 transition-all"
              >
                {clearing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Privacy note */}
      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-200/70 space-y-1">
        <div className="font-semibold text-amber-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Privacy & Delivery Policy
        </div>
        <ul className="space-y-0.5 text-[11px] leading-relaxed list-disc list-inside">
          <li>Webhook URL token is never logged or persisted to disk.</li>
          <li>Results are delivered <strong>only</strong> after you press "Send to Discord" on the workbench.</li>
          <li>All snippets are automatically scanned for credentials, API keys, and PII before delivery.</li>
          <li>Discord rate limits are respected with automatic backoff (max 5 s).</li>
        </ul>
      </div>
    </div>
  );
};
