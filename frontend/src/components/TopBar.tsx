import React from 'react';
import { Cpu, Globe, Database, RefreshCw, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { SystemHealth } from '../types';

interface TopBarProps {
  health: SystemHealth | null;
  loading: boolean;
  onRefresh: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ health, loading, onRefresh }) => {
  const lmConnected = health?.lm_studio?.connected ?? false;
  const lmModelLoaded = health?.lm_studio?.configured_model_loaded ?? false;
  const serpConfigured = health?.serp_provider?.configured ?? false;

  return (
    <header className="h-16 border-b border-white/10 bg-[#0d1017]/90 backdrop-blur px-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-200 font-semibold uppercase tracking-wider">Operational</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-xs text-slate-400 font-medium hidden md:inline">
          Google Search Operator Workbench
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* LM Studio status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141822] border border-white/10 text-xs">
          <Cpu className={`w-3.5 h-3.5 ${lmConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400 hidden sm:inline">LM Studio:</span>
            {lmConnected ? (
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                {lmModelLoaded ? 'Qwen 3.5 (9B) Loaded' : 'Connected (Idle)'}
                <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
              </span>
            ) : (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                Offline (Heuristic Fallback)
                <AlertTriangle className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* SERP Provider status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141822] border border-white/10 text-xs">
          <Globe className={`w-3.5 h-3.5 ${serpConfigured ? 'text-sky-400' : 'text-purple-400'}`} />
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400 hidden sm:inline">SERP:</span>
            {serpConfigured ? (
              <span className="text-sky-300 font-medium">SerpApi Active</span>
            ) : (
              <span className="text-purple-300 font-medium bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                Mock Mode (Safe)
              </span>
            )}
          </div>
        </div>

        {/* Refresh health button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh runtime health"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
