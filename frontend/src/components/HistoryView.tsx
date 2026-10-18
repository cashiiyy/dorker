import React, { useEffect, useState } from 'react';
import {
  History,
  Trash2,
  Download,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { ResearchSession } from '../types';
import { listSessions, deleteSession, getExportUrl } from '../api';

interface HistoryViewProps {
  onLoadSession: (session: ResearchSession) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onLoadSession }) => {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await listSessions();
      setSessions(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this research session?')) return;
    try {
      await deleteSession(id);
      setSessions(sessions.filter((s) => s.id !== id));
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            Saved Research Sessions
          </h2>
          <p className="text-xs text-slate-400">
            Locally persisted in SQLite (`searchlens.db`). Export reports or resume past investigations.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all"
        >
          Refresh List
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Loading sessions from SQLite...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No Saved Sessions</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Generate queries in the Operator Workbench and click "Save Session" to persist research here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="glass-card rounded-xl p-5 border border-white/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-100 text-sm truncate max-w-xs">
                    {sess.title}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    {sess.category.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                  {sess.objective}
                </p>

                <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(sess.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-sky-400" />
                    {sess.queries?.length || 0} queries
                  </span>
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3 text-emerald-400" />
                    {sess.results?.length || 0} results
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => onLoadSession(sess)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-medium transition-all"
                >
                  Load in Studio
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={getExportUrl(sess.id)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs flex items-center gap-1 transition-all"
                    title="Download Markdown Report"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">Markdown</span>
                  </a>
                  <button
                    onClick={() => handleDelete(sess.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
