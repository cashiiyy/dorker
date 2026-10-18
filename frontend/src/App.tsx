import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { QueryWorkbench } from './components/QueryWorkbench';
import { HistoryView } from './components/HistoryView';
import { ModelSettingsView } from './components/ModelSettingsView';
import { SecurityView } from './components/SecurityView';
import { AboutView } from './components/AboutView';
import { PreviewModal } from './components/PreviewModal';
import { SystemHealth, SettingsStatus, PreviewResponse, ResearchSession } from './types';
import { fetchHealth, fetchSettings, fetchPreview, listSessions } from './api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('workbench');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [settings, setSettings] = useState<SettingsStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [savedSessionsCount, setSavedSessionsCount] = useState(0);

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Loaded session from history into workbench
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);

  const loadStatus = async () => {
    try {
      setLoadingHealth(true);
      const [h, s, sessions] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchSettings().catch(() => null),
        listSessions().catch(() => [])
      ]);
      if (h) setHealth(h);
      if (s) setSettings(s);
      if (sessions) setSavedSessionsCount(sessions.length);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Periodic health refresh every 30s
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
        url,
        title: 'Preview Failed',
        domain: '',
        content_excerpt: '',
        sanitized_html: '',
        status: 'error',
        error: err.message || 'Failed to fetch preview'
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
    <div className="flex h-screen bg-[#0a0c10] text-slate-100 overflow-hidden font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'workbench') setActiveSession(null);
        }}
        savedSessionsCount={savedSessionsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopBar
          health={health}
          loading={loadingHealth}
          onRefresh={loadStatus}
        />

        {/* Dynamic View Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {currentTab === 'workbench' && (
            <QueryWorkbench
              onPreviewUrl={handlePreviewUrl}
              onSessionSaved={loadStatus}
              initialSession={activeSession}
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

          {currentTab === 'about' && (
            <AboutView />
          )}
        </main>
      </div>

      {/* Safe Source Preview Modal */}
      <PreviewModal
        preview={previewData}
        loading={previewLoading}
        onClose={() => setPreviewData(null)}
      />
    </div>
  );
}

export default App;
