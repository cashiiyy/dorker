import React from 'react';
import {
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { SystemHealth } from '../types';

interface TopBarProps {
  health: SystemHealth | null;
  loading: boolean;
  onRefresh: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ health, loading, onRefresh }) => {
  const lmOk = health?.lm_studio?.connected && health?.lm_studio?.configured_model_loaded;
  const serpOk = health?.serp_provider?.configured;
  const discordOk = (health as any)?.discord_integration?.configured;
  const systemOk = lmOk && serpOk;

  return (
    <header
      className="h-14 flex items-center px-6 gap-4 shrink-0 relative"
      style={{
        background: 'rgba(6, 10, 18, 0.90)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Page title */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-1.5 h-5 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, #63b3ed, #a78bfa)',
            boxShadow: '0 0 10px rgba(99,179,237,0.5)',
          }}
        />
        <h1
          className="text-sm font-bold tracking-wider"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background: 'linear-gradient(135deg, #f0f6ff 0%, #63b3ed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Google Dork Workbench
        </h1>
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 ml-4">
        {/* LM Studio */}
        <StatusPill
          label="Qwen"
          ok={!!lmOk}
          loading={loading}
          tooltip={health?.lm_studio?.configured_model || 'Not loaded'}
        />
        {/* SERP */}
        <StatusPill
          label="SERP"
          ok={!!serpOk}
          loading={loading}
          tooltip={health?.serp_provider?.provider || 'No API key'}
        />
        {/* Discord */}
        {discordOk !== undefined && (
          <StatusPill
            label="Discord"
            ok={!!discordOk}
            loading={loading}
            tooltip={discordOk ? 'Webhook active' : 'Not configured'}
          />
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* System status */}
        {health && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold"
            style={{
              background: systemOk ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${systemOk ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
              color: systemOk ? '#10b981' : '#f59e0b',
            }}
          >
            {systemOk
              ? <CheckCircle className="w-3 h-3" />
              : <AlertTriangle className="w-3 h-3" />
            }
            {systemOk ? 'READY' : 'PARTIAL'}
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(148,163,184,0.7)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#63b3ed';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,179,237,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(148,163,184,0.7)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
          }}
          title="Refresh system status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};

const StatusPill: React.FC<{ label: string; ok: boolean; loading: boolean; tooltip: string }> = ({
  label, ok, loading, tooltip
}) => (
  <div
    title={tooltip}
    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-default"
    style={{
      background: loading
        ? 'rgba(255,255,255,0.04)'
        : ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${loading ? 'rgba(255,255,255,0.06)' : ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      color: loading ? 'rgba(148,163,184,0.5)' : ok ? '#10b981' : '#ef4444',
    }}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${loading ? 'shimmer' : ok ? 'animate-pulse-glow' : ''}`}
      style={{
        background: loading ? 'rgba(255,255,255,0.2)' : ok ? '#10b981' : '#ef4444',
        boxShadow: !loading && ok ? '0 0 6px #10b981' : undefined,
      }}
    />
    {label}
  </div>
);
