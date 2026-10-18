import React from 'react';
import {
  Search,
  History,
  Sliders,
  ShieldCheck,
  Cpu,
  HelpCircle,
  Terminal,
  Compass
} from 'lucide-react';

export type NavTab = 'workbench' | 'history' | 'models' | 'security' | 'about';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  savedSessionsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  savedSessionsCount,
}) => {
  const navItems = [
    { id: 'workbench', label: 'Operator Workbench', icon: Search, badge: null },
    { id: 'history', label: 'Research History', icon: History, badge: savedSessionsCount > 0 ? savedSessionsCount : null },
    { id: 'models', label: 'Local LM Studio', icon: Cpu, badge: 'Qwen' },
    { id: 'security', label: 'Scope & Guardrails', icon: ShieldCheck, badge: null },
    { id: 'about', label: 'Diagnostics & Docs', icon: HelpCircle, badge: null },
  ];

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0d1017] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-white/10 gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-inner">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm tracking-wide flex items-center gap-1.5">
              SearchLens <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">AI</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">Google Operator Studio</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400 font-mono">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                      active
                        ? 'bg-sky-400/20 text-sky-300'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/10 bg-[#0a0d13]/60">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">Local-First Guard</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Zero arbitrary execution. All operators validated locally before SERP submission.
        </p>
      </div>
    </aside>
  );
};
