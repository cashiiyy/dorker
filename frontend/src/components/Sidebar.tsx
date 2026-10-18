import React from 'react';
import {
  Compass,
  FileSearch,
  Sparkles,
  ShieldCheck,
  Send,
  CheckCircle2,
  Circle,
  Database,
  Share2,
  Terminal,
  Activity,
  Layers,
  Crosshair
} from 'lucide-react';
import { WorkflowCheckpoints } from '../types';

export type NavTab = 'workbench' | 'history' | 'models' | 'security' | 'settings' | 'about';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedSessionsCount: number;
  discordActive?: boolean;
  checkpoints?: WorkflowCheckpoints;
}

const NAV_ITEMS = [
  { id: 'workbench' as NavTab, label: 'Dork Workbench', icon: Crosshair, badge: null, accent: '#38bdf8' },
  { id: 'history'   as NavTab, label: 'Sessions',       icon: Database,  badge: 'count', accent: '#a78bfa' },
  { id: 'models'    as NavTab, label: 'LM Studio / Qwen',icon: Sparkles, badge: '9B', accent: '#34d399' },
  { id: 'security'  as NavTab, label: 'Guardrails',     icon: ShieldCheck, badge: null, accent: '#fbbf24' },
  { id: 'settings'  as NavTab, label: 'Discord Sync',   icon: Share2,    badge: null, accent: '#818cf8' },
  { id: 'about'     as NavTab, label: 'Diagnostics',    icon: Activity,  badge: null, accent: '#94a3b8' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  savedSessionsCount,
  discordActive,
  checkpoints = {
    objectiveDefined: false,
    queriesGenerated: false,
    queriesValidated: false,
    searchExecuted: false,
    resultsInspected: false,
    sentToDiscord: false,
  },
}) => {
  const steps = [
    {
      id: 'objective',
      label: 'Objective Defined',
      done: checkpoints.objectiveDefined,
      icon: Compass,
      color: '#38bdf8',
    },
    {
      id: 'generated',
      label: 'Dorks Synthesized',
      done: checkpoints.queriesGenerated,
      icon: Sparkles,
      color: '#a78bfa',
    },
    {
      id: 'validated',
      label: 'Syntax Validated',
      done: checkpoints.queriesValidated,
      icon: ShieldCheck,
      color: '#34d399',
    },
    {
      id: 'searched',
      label: 'SERP Executed',
      done: checkpoints.searchExecuted,
      icon: FileSearch,
      color: '#fbbf24',
    },
    {
      id: 'discord',
      label: 'Dispatched to Discord',
      done: checkpoints.sentToDiscord,
      icon: Send,
      color: '#818cf8',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <aside
      className="w-64 shrink-0 flex flex-col justify-between select-none relative overflow-hidden"
      style={{
        background: 'rgba(6, 10, 18, 0.96)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(25px)',
      }}
    >
      {/* Subtle background glow */}
      <div
        className="absolute -top-24 -left-24 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* ─── Top: Brand & Nav ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Brand header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(167,139,250,0.25))',
                border: '1px solid rgba(56,189,248,0.4)',
                boxShadow: '0 0 25px rgba(56,189,248,0.2)',
              }}
            >
              <Crosshair className="w-5 h-5 text-sky-300 relative z-10" />
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(56,189,248,0.3) 0%, transparent 70%)',
                }}
              />
            </div>
            <div>
              <div
                className="text-lg font-black tracking-wider leading-none"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: 'linear-gradient(135deg, #f8fafc 0%, #38bdf8 50%, #c084fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DORKER
              </div>
              <div
                className="text-[9px] tracking-widest uppercase mt-0.5"
                style={{ color: 'rgba(56,189,248,0.8)', fontFamily: "'JetBrains Mono', monospace" }}
              >
                OSINT Intelligence
              </div>
            </div>
          </div>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
            style={{
              background: 'rgba(56,189,248,0.1)',
              color: '#38bdf8',
              border: '1px solid rgba(56,189,248,0.2)',
            }}
          >
            v1.0
          </span>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5">
          <div
            className="px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase"
            style={{ color: 'rgba(148,163,184,0.4)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            const badge =
              item.badge === 'count'
                ? savedSessionsCount > 0
                  ? savedSessionsCount
                  : null
                : item.badge;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 group"
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${item.accent}22, ${item.accent}0a)`
                    : 'transparent',
                  border: active ? `1px solid ${item.accent}40` : '1px solid transparent',
                  color: active ? '#f8fafc' : 'rgba(148,163,184,0.75)',
                  boxShadow: active ? `0 2px 14px ${item.accent}18` : 'none',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className="w-4 h-4 shrink-0 transition-colors"
                    style={{ color: active ? item.accent : undefined }}
                  />
                  <span
                    className="truncate"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                {badge !== null && badge !== undefined && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                    style={{
                      background: active ? `${item.accent}30` : 'rgba(255,255,255,0.06)',
                      color: active ? item.accent : 'rgba(148,163,184,0.6)',
                      border: `1px solid ${active ? item.accent + '40' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {badge}
                  </span>
                )}
                {item.id === 'settings' && discordActive && (
                  <span
                    className="w-2 h-2 rounded-full animate-pulse-glow"
                    style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
                    title="Discord Webhook Active"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ─── Workflow Checkpoints / Stepper ─── */}
        <div className="px-3 pt-2">
          <div
            className="p-3.5 rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(10,15,28,0.95) 100%)',
              border: '1px solid rgba(56,189,248,0.18)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header with progress */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    color: '#e2e8f0',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Workflow Checkpoints
                </span>
              </div>
              <span
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: progressPercent === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.15)',
                  color: progressPercent === 100 ? '#34d399' : '#38bdf8',
                  border: `1px solid ${progressPercent === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(56,189,248,0.25)'}`,
                }}
              >
                {completedCount}/{steps.length}
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-1 rounded-full mb-3 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    progressPercent === 100
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #38bdf8, #818cf8)',
                  boxShadow: '0 0 8px rgba(56,189,248,0.5)',
                }}
              />
            </div>

            {/* Step list with tick states */}
            <div className="space-y-1.5">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.id}
                    className="flex items-center justify-between p-1.5 rounded-lg transition-all duration-300"
                    style={{
                      background: step.done ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.02)',
                      border: step.done
                        ? '1px solid rgba(56,189,248,0.2)'
                        : '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform duration-300"
                        style={{
                          background: step.done ? `${step.color}25` : 'rgba(255,255,255,0.04)',
                          color: step.done ? step.color : 'rgba(148,163,184,0.4)',
                          transform: step.done ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        <StepIcon className="w-3 h-3" />
                      </div>
                      <span
                        className="text-[11px] truncate transition-colors duration-200"
                        style={{
                          color: step.done ? '#f1f5f9' : 'rgba(148,163,184,0.5)',
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: step.done ? 600 : 400,
                        }}
                      >
                        {step.label}
                      </span>
                    </div>

                    {/* Tick mark or empty state */}
                    <div className="shrink-0 ml-1">
                      {step.done ? (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center animate-scale-in"
                          style={{
                            background: '#10b981',
                            color: '#060a12',
                            boxShadow: '0 0 10px rgba(16,185,129,0.5)',
                          }}
                        >
                          <svg
                            className="w-2.5 h-2.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : (
                        <Circle
                          className="w-3.5 h-3.5"
                          style={{ color: 'rgba(148,163,184,0.25)' }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Footer: Local-First Guard ─── */}
      <div
        className="p-3 m-3 rounded-xl shrink-0"
        style={{
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.18)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
          <span
            className="text-[9.5px] font-bold tracking-widest uppercase"
            style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}
          >
            Local-First Engine
          </span>
        </div>
        <p className="text-[10.5px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Private syntax verification. Zero telemetry before verified SERP submission.
        </p>
      </div>
    </aside>
  );
};
