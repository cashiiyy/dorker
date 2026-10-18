import React, { useState } from 'react';
import {
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SystemHealth } from '../types';
import { toggleMockMode } from '../api';

interface TopBarProps {
  health: SystemHealth | null;
  loading: boolean;
  onRefresh: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ health, loading, onRefresh }) => {
  const [togglingMock, setTogglingMock] = useState(false);
  const lmOk = health?.lm_studio?.connected && health?.lm_studio?.configured_model_loaded;
  const serpConfigured = health?.serp_provider?.configured;
  const isMockMode = health?.serp_provider?.mock_mode;
  const discordOk = (health as any)?.discord_integration?.configured;
  const systemOk = (lmOk || true) && (serpConfigured || isMockMode !== undefined);

  const handleToggleMock = async () => {
    if (!serpConfigured && !isMockMode) return;
    try {
      setTogglingMock(true);
      await toggleMockMode(!isMockMode);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingMock(false);
    }
  };

  return (
    <header
      className="h-14 flex items-center px-6 gap-4 shrink-0 relative"
      style={{
        background: 'rgba(6, 10, 18, 0.92)',
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
          label="Qwen 3.5"
          ok={!!lmOk}
          loading={loading}
          tooltip={lmOk ? `Model: ${health?.lm_studio?.configured_model}` : 'LM Studio unreachable (using rule engine)'}
        />

        {/* SERP & Mock mode toggle */}
        <button
          onClick={handleToggleMock}
          disabled={togglingMock || !serpConfigured}
          title={
            serpConfigured
              ? `Click to toggle: currently ${isMockMode ? 'Mock Mode' : 'Live SerpApi'}`
              : 'Add SERPAPI_API_KEY in .env for live searches'
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all"
          style={{
            background: isMockMode
              ? 'rgba(168,85,247,0.12)'
              : 'rgba(16,185,129,0.12)',
            border: `1px solid ${
              isMockMode ? 'rgba(168,85,247,0.3)' : 'rgba(16,185,129,0.3)'
            }`,
            color: isMockMode ? '#c084fc' : '#34d399',
            cursor: serpConfigured ? 'pointer' : 'default',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isMockMode ? '#c084fc' : '#10b981',
              boxShadow: `0 0 6px ${isMockMode ? '#c084fc' : '#10b981'}`,
            }}
          />
          <span>{isMockMode ? 'SERP: MOCK' : 'SERP: LIVE'}</span>
          {serpConfigured && (
            <span className="text-[9px] opacity-60 ml-0.5">
              {togglingMock ? '…' : '⇄'}
            </span>
          )}
        </button>

        {/* Discord */}
        {discordOk !== undefined && (
          <StatusPill
            label="Discord"
            ok={!!discordOk}
            loading={loading}
            tooltip={discordOk ? 'Discord Webhook Connected' : 'Discord webhook not configured'}
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
              background: 'rgba(99,179,237,0.1)',
              border: '1px solid rgba(99,179,237,0.25)',
              color: '#63b3ed',
            }}
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>DORKER READY</span>
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
