import React from 'react';
import { HelpCircle, Terminal, Cpu, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-400" />
          About & Troubleshooting Guide
        </h2>
        <p className="text-xs text-slate-400">
          Architecture overview, model setup steps, SERP configuration, and diagnostic recommendations.
        </p>
      </div>

      {/* Overview */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">About SearchLens AI</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          SearchLens AI — Google Search Operator Workbench empowers security researchers, intelligence analysts, and engineers to transform natural-language queries into mathematically validated Google search operators (`site:`, `filetype:`, `intitle:`, `inurl:`, `-negation`, exact phrases).
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Inference runs locally using LM Studio hosting the configured uncensored Qwen 3.5 9B model (`qwen3.5-9b-uncensored-hauhaucs-aggressive`), ensuring zero research objective leakage to third-party AI APIs.
        </p>
      </div>

      {/* Model Setup Guide */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          LM Studio & Qwen 3.5 Setup
        </h3>
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            1. Open LM Studio on your workstation.
          </p>
          <p>
            2. In the Search tab, load: <strong className="font-mono text-sky-300">qwen3.5-9b-uncensored-hauhaucs-aggressive</strong> (or configure <code className="text-slate-200">LM_STUDIO_MODEL</code> in <code className="text-slate-200">.env</code>).
          </p>
          <p>
            3. In the Developer / Local Server tab, start the local server on port <strong>1234</strong> with CORS enabled.
          </p>
          <div className="p-3.5 rounded-xl bg-[#0b0e14] border border-white/10 font-mono text-[11px] text-slate-300">
            # Verify via CLI in terminal<br />
            lms ps<br />
            curl http://127.0.0.1:1234/v1/models
          </div>
        </div>
      </div>

      {/* SERP Setup */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          SERP API Configuration
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          To retrieve live organic Google SERP results, set your SerpApi key in <code className="text-sky-300">.env</code>:
        </p>
        <div className="p-3.5 rounded-xl bg-[#0b0e14] border border-white/10 font-mono text-[11px] text-slate-300">
          SERP_PROVIDER=serpapi<br />
          SERPAPI_API_KEY=your_secret_api_key_here<br />
          SERP_RESULT_LIMIT=10
        </div>
        <p className="text-xs text-slate-400">
          If no key is configured, SearchLens seamlessly operates in <strong>Mock Mode</strong>, providing sample organic data so you can test and build without spending API credits.
        </p>
      </div>

      {/* Troubleshooting */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          Troubleshooting
        </h3>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <strong>LM Studio shows Offline:</strong> Ensure the LM Studio local server toggle is switched ON on port 1234.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <strong>Slow Generation / Fallback active:</strong> Qwen 3.5 9B with internal thinking tokens takes 30–60s on local GPUs. If LM Studio is busy, our heuristic engine provides immediate high-precision queries as fallback.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <strong>Preview Blocked:</strong> SSRF protection blocks access to local IP addresses (127.0.0.1, 10.x, 192.168.x) and cloud metadata. Only public HTTP/HTTPS documents can be previewed.
          </div>
        </div>
      </div>
    </div>
  );
};
