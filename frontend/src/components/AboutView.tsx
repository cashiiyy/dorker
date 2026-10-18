import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  Cpu,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Server,
  Database,
  Share2,
  ShieldAlert,
  Flame,
  Check,
  Zap,
  Info,
  Copy
} from 'lucide-react';
import { SettingsStatus, SystemHealth } from '../types';
import { testModelInference, testDiscordWebhook, toggleMockMode } from '../api';

interface AboutViewProps {
  settings?: SettingsStatus | null;
  health?: SystemHealth | null;
  onRefresh?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ settings, health, onRefresh }) => {
  const [testingModel, setTestingModel] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<any>(null);

  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<any>(null);

  const [togglingMock, setTogglingMock] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const lmConnected = health?.lm_studio?.connected ?? false;
  const lmModelLoaded = health?.lm_studio?.configured_model_loaded ?? false;
  const serpConfigured = health?.serp_provider?.configured ?? false;
  const isMock = health?.serp_provider?.mock_mode ?? true;
  const discordConfigured = (health as any)?.discord_integration?.configured ?? false;

  const handleTestModel = async () => {
    try {
      setTestingModel(true);
      setModelTestResult(null);
      const start = Date.now();
      const res = await testModelInference();
      const latency = Date.now() - start;
      setModelTestResult({ ...res, latency });
    } catch (e: any) {
      setModelTestResult({ success: false, error: e.message });
    } finally {
      setTestingModel(false);
    }
  };

  const handleTestDiscord = async () => {
    try {
      setTestingDiscord(true);
      setDiscordTestResult(null);
      const res = await testDiscordWebhook();
      setDiscordTestResult(res);
    } catch (e: any) {
      setDiscordTestResult({ success: false, error: e.message });
    } finally {
      setTestingDiscord(false);
    }
  };

  const handleToggleMock = async () => {
    try {
      setTogglingMock(true);
      await toggleMockMode(!isMock);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingMock(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-sky-400" />
            <span>System Diagnostics & Health Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time subsystem verification, network connectivity checks, live probes, and operational troubleshooting.
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Probes</span>
          </button>
        )}
      </div>

      {/* ─── Real-time Subsystem Matrix ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Local AI Engine */}
        <div
          className="p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: 'rgba(11, 17, 32, 0.8)',
            border: `1px solid ${lmConnected ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">AI Synthesizer</span>
            <div className={`w-2 h-2 rounded-full ${lmConnected ? 'bg-emerald-400 animate-pulse-glow' : 'bg-red-400'}`} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-100">
              {lmConnected ? (lmModelLoaded ? 'Qwen 3.5 9B Loaded' : 'Server Online (No Model)') : 'Synthesizer Fallback'}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {health?.lm_studio?.configured_model || 'Local Rule Synthesizer'}
          </p>
        </div>

        {/* 2. SERP Engine */}
        <div
          className="p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: 'rgba(11, 17, 32, 0.8)',
            border: `1px solid ${!isMock && serpConfigured ? 'rgba(56, 189, 248, 0.3)' : 'rgba(192, 132, 252, 0.3)'}`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Search Engine</span>
            <div className={`w-2 h-2 rounded-full ${!isMock && serpConfigured ? 'bg-sky-400 animate-pulse-glow' : 'bg-purple-400'}`} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-bold text-slate-100">
              {isMock ? 'Mock Engine Active' : 'Live SerpApi Online'}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {serpConfigured ? `Key: ${health?.serp_provider?.masked_key || 'configured'}` : 'Mock data mode'}
          </p>
        </div>

        {/* 3. Discord Sync */}
        <div
          className="p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: 'rgba(11, 17, 32, 0.8)',
            border: `1px solid ${discordConfigured ? 'rgba(129, 140, 248, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Discord Webhook</span>
            <div className={`w-2 h-2 rounded-full ${discordConfigured ? 'bg-indigo-400 animate-pulse-glow' : 'bg-slate-500'}`} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-slate-100">
              {discordConfigured ? 'Webhook Active' : 'Not Configured'}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {discordConfigured ? 'Live Dispatch Ready' : 'Add in .env or Settings'}
          </p>
        </div>

        {/* 4. Local Storage */}
        <div
          className="p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: 'rgba(11, 17, 32, 0.8)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Database</span>
            <div className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-slate-100">SQLite Active</h4>
          </div>
          <p className="text-[11px] text-slate-400 truncate font-mono">
            {health?.database || 'searchlens.db'}
          </p>
        </div>
      </div>

      {/* ─── Interactive Diagnostic Action Matrix ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Model Inference Probe */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden"
          style={{
            background: 'rgba(11, 17, 32, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-100">LM Studio Probe</h3>
            </div>
            <button
              onClick={handleTestModel}
              disabled={testingModel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 disabled:opacity-50 transition-all"
            >
              {testingModel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{testingModel ? 'Testing Inference…' : 'Run Model Probe'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Sends a lightweight inference prompt directly to LM Studio on port 1234 to verify latency and token generation.
          </p>
          {modelTestResult && (
            <div
              className={`p-3 rounded-xl text-xs font-mono border ${
                modelTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span>{modelTestResult.success ? '✓ Inference Test Succeeded' : '✗ Probe Failed'}</span>
                {modelTestResult.latency && <span>{modelTestResult.latency}ms</span>}
              </div>
              {modelTestResult.response && (
                <div className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                  Response: "{modelTestResult.response}"
                </div>
              )}
              {modelTestResult.error && (
                <div className="text-[11px] text-red-200 mt-1">
                  Error: {modelTestResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Discord Webhook Probe */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden"
          style={{
            background: 'rgba(11, 17, 32, 0.85)',
            border: '1px solid rgba(129, 140, 248, 0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">Discord Webhook Ping</h3>
            </div>
            <button
              onClick={handleTestDiscord}
              disabled={testingDiscord || !discordConfigured}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 disabled:opacity-50 transition-all"
            >
              {testingDiscord ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{testingDiscord ? 'Pinging Discord…' : 'Ping Webhook'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Dispatches a verified diagnostic test ping embed to your Discord channel to ensure SSL handshake and webhook tokens.
          </p>
          {discordTestResult && (
            <div
              className={`p-3 rounded-xl text-xs font-mono border ${
                discordTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              <div className="font-bold">
                {discordTestResult.success ? '✓ Webhook Ping Delivered (HTTP 204)' : '✗ Webhook Ping Failed'}
              </div>
              {discordTestResult.error && (
                <div className="text-[11px] text-red-200 mt-1">
                  {discordTestResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── SERP Mode Switcher & Quick Commands ─── */}
      <div
        className="p-5 rounded-2xl relative overflow-hidden"
        style={{
          background: 'rgba(11, 17, 32, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>SERP Provider Engine Control</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle between live paid SerpApi searches and zero-cost simulated Mock Mode.
            </p>
          </div>
          <button
            onClick={handleToggleMock}
            disabled={togglingMock || !serpConfigured}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
              isMock
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            } disabled:opacity-50`}
          >
            <span>Current: {isMock ? 'MOCK MODE (Free)' : 'LIVE SERPAPI (Active)'}</span>
            <span className="text-[10px] opacity-75">{serpConfigured ? '⇄ Switch' : '(Add Key)'}</span>
          </button>
        </div>

        {/* Helpful command snippets */}
        <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
            CLI Quick Diagnostic Commands
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { label: 'Check LM Studio CLI status', cmd: 'lms ps', id: 'lms-ps' },
              { label: 'Test Local Models API', cmd: 'curl http://127.0.0.1:1234/v1/models', id: 'curl-lm' },
              { label: 'DORKER API Health Check', cmd: 'curl http://127.0.0.1:8000/api/health', id: 'curl-health' },
              { label: 'Run pytest test suite', cmd: 'python -m pytest backend/tests', id: 'pytest' },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px]"
              >
                <div className="truncate mr-2">
                  <span className="text-slate-500 block text-[9.5px] uppercase">{item.label}</span>
                  <span className="text-sky-300 font-semibold">{item.cmd}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(item.cmd, item.id)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all shrink-0"
                  title="Copy command"
                >
                  {copiedCmd === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SSRF & Security Guardrail Health ─── */}
      <div
        className="p-5 rounded-2xl relative overflow-hidden"
        style={{
          background: 'rgba(11, 17, 32, 0.85)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
        }}
      >
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Security Guardrail & SSRF Sandbox Status</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          DORKER features proactive client and server-side defensive verification:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="font-semibold text-slate-200 mb-1">SSRF Loopback Guard</div>
            <p className="text-[11px] text-slate-400">
              Blocks preview fetches to 127.0.0.1, 10.x, 192.168.x, and AWS/GCP cloud metadata IPs.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="font-semibold text-slate-200 mb-1">HTML Macro Sanitization</div>
            <p className="text-[11px] text-slate-400">
              Completely neutralizes script tags, iframes, inline event handlers, and external form submissions.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="font-semibold text-slate-200 mb-1">Credential Harvesting Block</div>
            <p className="text-[11px] text-slate-400">
              Illegal search objectives (dumps, private keys) are rejected and redirected to benign CVE bulletins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
