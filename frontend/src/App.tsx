import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { QueryWorkbench } from './components/QueryWorkbench';
import { HistoryView } from './components/HistoryView';
import { ModelSettingsView } from './components/ModelSettingsView';
import { SecurityView } from './components/SecurityView';
import { AboutView } from './components/AboutView';
import { DiscordSettingsView } from './components/DiscordSettingsView';
import { PreviewModal } from './components/PreviewModal';
import { SystemHealth, SettingsStatus, PreviewResponse, ResearchSession, WorkflowCheckpoints } from './types';
import { fetchHealth, fetchSettings, fetchPreview, listSessions, getDiscordStatus } from './api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('workbench');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [savedSessionsCount, setSavedSessionsCount] = useState(0);
  const [discordActive, setDiscordActive] = useState(false);

  // Workflow Checkpoints for left sidebar
  const [checkpoints, setCheckpoints] = useState<WorkflowCheckpoints>({
    objectiveDefined: false,
    queriesGenerated: false,
    queriesValidated: false,
    searchExecuted: false,
    resultsInspected: false,
    sentToDiscord: false,
  });

  const handleUpdateCheckpoints = (updates: Partial<WorkflowCheckpoints>) => {
    setCheckpoints((prev) => ({ ...prev, ...updates }));
  };

  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);

  const loadStatus = async () => {
    try {
      setLoadingHealth(true);
      const [h, s, sessions] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchSettings().catch(() => null),
        listSessions().catch(() => []),
      ]);
      if (h) setHealth(h);
      if (s) setSettings(s);
      if (sessions) setSavedSessionsCount(sessions.length);

      // Discord status
      try {
        const ds = await getDiscordStatus();
        setDiscordActive(ds.configured && ds.enabled);
      } catch {}
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 30000);
    return () => clearInterval(timer);
  }, []);

  const handlePreviewUrl = async (url: string) => {
    try {
      setPreviewLoading(true);
      setPreviewData(null);
      const res = await fetchPreview(url);
      setPreviewData(res);
    } catch (err: any) {
      setPreviewData({
        url, title: 'Preview Failed', domain: '',
        content_excerpt: '', sanitized_html: '',
        status: 'error', error: err.message || 'Failed to fetch preview',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleLoadSessionFromHistory = (session: ResearchSession) => {
    setActiveSession(session);
    setCurrentTab('workbench');
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg-void)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
    >
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'workbench') setActiveSession(null);
        }}
        savedSessionsCount={savedSessionsCount}
        discordActive={discordActive}
        checkpoints={checkpoints}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{ zIndex: 1 }}>
        <TopBar health={health} loading={loadingHealth} onRefresh={loadStatus} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {currentTab === 'workbench' && (
            <QueryWorkbench
              onPreviewUrl={handlePreviewUrl}
              onSessionSaved={loadStatus}
              initialSession={activeSession}
              onCheckpointUpdate={handleUpdateCheckpoints}
            />
          )}
          {currentTab === 'history' && (
            <HistoryView onLoadSession={handleLoadSessionFromHistory} />
          )}
          {currentTab === 'models' && (
            <ModelSettingsView settings={settings} health={health} />
          )}
          {currentTab === 'security' && (
            <SecurityView />
          )}
          {currentTab === 'settings' && (
            <DiscordSettingsView />
          )}
          {currentTab === 'about' && (
            <AboutView
              settings={settings}
              health={health}
              onRefresh={loadStatus}
            />
          )}
        </main>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        preview={previewData}
        loading={previewLoading}
        onClose={() => setPreviewData(null)}
      />
    </div>
  );
}

export default App;
