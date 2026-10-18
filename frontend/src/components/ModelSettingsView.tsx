import React, { useState } from 'react';
import {
  Cpu,
  Globe,
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  Key,
  ShieldCheck,
  Server
} from 'lucide-react';
import { SettingsStatus, SystemHealth } from '../types';
import { testModelInference } from '../api';

interface ModelSettingsViewProps {
  settings: SettingsStatus | null;
  health: SystemHealth | null;
}

export const ModelSettingsView: React.FC<ModelSettingsViewProps> = ({
  settings,
  health,
}) => {
  const [testingModel, setTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestInference = async () => {
    try {
      setTestingModel(true);
      setTestResult(null);
      const start = Date.now();
      const res = await testModelInference();
      const latency = Date.now() - start;
      setTestResult({ ...res, latency });
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setTestingModel(false);
    }
  };

  const isModelLoaded = health?.lm_studio?.configured_model_loaded ?? false;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-sky-400" />
          Runtime & Model Configuration
        </h2>
        <p className="text-xs text-slate-400">
          SearchLens AI runs query generation on local LM Studio and search retrieval through configurable SERP providers.
        </p>
      </div>

      {/* Model Spec Card */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
                Configured Local LLM
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Local-Only Runtime
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100 font-mono">
              {settings?.lm_studio_model || 'qwen3.5-9b-uncensored-hauhaucs-aggressive'}
            </h3>
          </div>

          <button
            onClick={handleTestInference}
            disabled={testingModel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${testingModel ? 'animate-spin' : ''}`} />
            <span>{testingModel ? 'Testing Inference...' : 'Test Model'}</span>
          </button>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#141824] border border-white/5">
            <div className="text-[10px] text-slate-400 mb-1">PARAMETERS</div>
            <div className="text-slate-100 font-semibold">9 Billion (9B)</div>
          </div>
          <div className="p-3 rounded-xl bg-[#141824] border border-white/5">
            <div className="text-[10px] text-slate-400 mb-1">QUANT / SIZE</div>
            <div className="text-slate-100 font-semibold">6.55 GB (Local VRAM)</div>
          </div>
          <div className="p-3 rounded-xl bg-[#141824] border border-white/5">
            <div className="text-[10px] text-slate-400 mb-1">CONTEXT LENGTH</div>
            <div className="text-slate-100 font-semibold">68,225 Tokens</div>
          </div>
          <div className="p-3 rounded-xl bg-[#141824] border border-white/5">
            <div className="text-[10px] text-slate-400 mb-1">ARCHITECTURE</div>
            <div className="text-slate-100 font-semibold">qwen35</div>
          </div>
        </div>

        {/* Connection endpoint */}
        <div className="p-3.5 rounded-xl bg-[#0a0d13] border border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" />
            <span>Base Endpoint: <strong className="text-slate-200">{settings?.lm_studio_base_url}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isModelLoaded ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={isModelLoaded ? 'text-emerald-300 font-medium' : 'text-amber-400 font-medium'}>
              {isModelLoaded ? 'Loaded & Active' : 'Idle / Standby'}
            </span>
          </div>
        </div>

        {/* Test Result Box */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 font-mono ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {testResult.success ? 'Model Inference Passed' : 'Inference Error'}
              </span>
              {testResult.latency && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  {testResult.latency}ms
                </span>
              )}
            </div>
            {testResult.response && (
              <div className="p-2 rounded bg-black/40 text-slate-200 text-[11px] break-all">
                Sample Output: "{testResult.response}"
              </div>
            )}
            {testResult.error && <div>{testResult.error}</div>}
          </div>
        )}
      </div>

      {/* SERP Provider Card */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold mb-1">
              Search Index Retrieval Provider
            </div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              {settings?.serp_provider?.toUpperCase()} Provider Adapter
            </h3>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
              settings?.serp_configured
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}
          >
            {settings?.serp_configured ? 'Live API Key Configured' : 'Mock Dev Mode'}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Search requests are dispatched strictly upon explicit user interaction. When no API key is provided, SearchLens automatically provides zero-cost realistic mock SERP data for development and testing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#141824] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Result Limit:</span>
            <span className="text-slate-200 font-semibold">{settings?.serp_result_limit} results / query</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#141824] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Key Exposure:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Server-side only
            </span>
          </div>
        </div>
      </div>

      {/* Persistence Card */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">Local SQLite Storage</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          Database URI: <span className="text-sky-300">{settings?.database_url}</span>
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          All research history, operator queries, and preview notes are persisted locally on your filesystem. No cloud sync or third-party telemetry.
        </p>
      </div>
    </div>
  );
};
