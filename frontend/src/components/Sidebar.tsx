import React, { useEffect, useRef } from 'react';
import {
  Search,
  History,
  ShieldCheck,
  Cpu,
  HelpCircle,
  Terminal,
  MessageSquare,
  Crosshair,
  Zap,
  Settings2
} from 'lucide-react';

export type NavTab = 'workbench' | 'history' | 'models' | 'security' | 'settings' | 'about';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedSessionsCount: number;
  discordActive?: boolean;
}

const NAV_ITEMS = [
  { id: 'workbench' as NavTab, label: 'Dork Workbench', icon: Crosshair, badge: null, accent: '#63b3ed' },
  { id: 'history'   as NavTab, label: 'Sessions',       icon: History,   badge: 'count', accent: '#a78bfa' },
  { id: 'models'    as NavTab, label: 'LM Studio',      icon: Cpu,       badge: 'Qwen', accent: '#10b981' },
  { id: 'security'  as NavTab, label: 'Guardrails',     icon: ShieldCheck, badge: null, accent: '#f59e0b' },
  { id: 'settings'  as NavTab, label: 'Discord',        icon: MessageSquare, badge: null, accent: '#7c3aed' },
  { id: 'about'     as NavTab, label: 'Diagnostics',    icon: HelpCircle, badge: null, accent: '#64748b' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  savedSessionsCount,
  discordActive,
}) => {
  return (
    <aside
      className="w-60 shrink-0 flex flex-col justify-between select-none"
      style={{
        background: 'rgba(6, 10, 18, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ─── DORKER Brand ─── */}
      <div>
        <div
          className="px-5 py-5 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(99,179,237,0.2), rgba(167,139,250,0.2))',
                border: '1px solid rgba(99,179,237,0.3)',
                boxShadow: '0 0 20px rgba(99,179,237,0.15)',
              }}
            >
              <Crosshair className="w-4.5 h-4.5 text-sky-300 relative z-10" style={{ width: 18, height: 18 }} />
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(99,179,237,0.25) 0%, transparent 70%)',
                }}
              />
            </div>
            <div>
              <div
                className="text-lg font-black tracking-widest"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #63b3ed 50%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DORKER
              </div>
              <div
                className="text-[10px] tracking-widest uppercase"
                style={{ color: 'rgba(99,179,237,0.7)', fontFamily: "'JetBrains Mono', monospace" }}
              >
                Think · Dork · Discover
              </div>
            </div>
          </div>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="p-3 space-y-0.5 mt-1">
          <div
            className="px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase mb-1"
            style={{ color: 'rgba(99,179,237,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            Navigation
          </div>
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            const badge = item.badge === 'count'
              ? (savedSessionsCount > 0 ? savedSessionsCount : null)
              : item.badge;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 group"
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${item.accent}18, ${item.accent}08)`
                    : 'transparent',
                  border: active
                    ? `1px solid ${item.accent}35`
                    : '1px solid transparent',
                  color: active ? '#f0f6ff' : 'rgba(148,163,184,0.8)',
                  boxShadow: active ? `0 4px 20px ${item.accent}15` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#f0f6ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(148,163,184,0.8)';
                  }
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className="w-4 h-4 shrink-0 transition-all duration-300"
                    style={{ color: active ? item.accent : undefined }}
                  />
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: active ? 600 : 500 }}>
                    {item.label}
                  </span>
                </div>
                {badge !== null && badge !== undefined && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold"
                    style={{
                      background: active ? `${item.accent}25` : 'rgba(255,255,255,0.07)',
                      color: active ? item.accent : 'rgba(148,163,184,0.7)',
                      border: `1px solid ${active ? item.accent + '40' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {badge}
                  </span>
                )}
                {/* Discord live indicator */}
                {item.id === 'settings' && discordActive && (
                  <span
                    className="w-2 h-2 rounded-full animate-pulse-glow"
                    style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── Footer: Local-First Guard ─── */}
      <div
        className="p-4 m-3 rounded-xl"
        style={{
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Terminal className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}
          >
            Local-First Guard
          </span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
          All queries validated locally. Zero arbitrary execution before SERP submission.
        </p>
      </div>
    </aside>
  );
};
