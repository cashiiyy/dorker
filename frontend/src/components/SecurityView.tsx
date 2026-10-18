import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  EyeOff,
  Server,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

export const SecurityView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Security Architecture & Scope Guardrails
        </h2>
        <p className="text-xs text-slate-400">
          SearchLens AI enforces multi-layered defense to guarantee lawful, authorized, and safe OSINT research.
        </p>
      </div>

      {/* Safety Policy */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-sky-400" />
          Prohibited Content & Benign Redirection
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The workbench explicitly prohibits searches structured for credential harvesting, stolen API tokens, private cryptographic keys, database dumps, or personal identifiable information (PII).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Prohibited Patterns
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-200/90 font-mono">
              <li>"password" ext:sql / ext:dump / ext:env</li>
              <li>id_rsa / id_dsa / .aws/credentials</li>
              <li>site:pastebin.com + leaked tokens</li>
              <li>CVV, SSN, and financial records</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Benign Alternatives
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-200/90">
              <li>Official CVE security advisories & bulletins</li>
              <li>OWASP secure configuration baselines</li>
              <li>Public synthetic datasets and test fixtures</li>
              <li>Lawful indexing hygiene & public disclosures</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SSRF Guard */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-purple-400" />
          SSRF (Server-Side Request Forgery) Protections
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Remote public document previews are mediated through our backend sandboxed proxy. Direct connection to private, internal, or cloud metadata endpoints is cryptographically and logically blocked.
        </p>

        <div className="p-4 rounded-xl bg-[#0b0e14] border border-white/10 font-mono text-[11px] space-y-2 text-slate-300">
          <div className="text-sky-400 font-semibold">// Blocked Destination Ranges</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
            <div>• 127.0.0.0/8 (Loopback IPv4)</div>
            <div>• 169.254.169.254 (Cloud Metadata)</div>
            <div>• 10.0.0.0/8 & 192.168.0.0/16 (Private)</div>
            <div>• 172.16.0.0/12 (RFC1918 Private)</div>
            <div>• ::1/128 (Loopback IPv6)</div>
            <div>• fe80::/10 & fc00::/7 (Link-Local)</div>
          </div>
          <div className="pt-2 text-slate-400 border-t border-white/5">
            Redirect checks: Destination IP re-resolved and re-validated at each hop (max 3 redirects).
          </div>
        </div>
      </div>

      {/* DOM Sanitization */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-amber-400" />
          Zero-Script Execution Sandbox
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Retrieved public HTML is scrubbed of all `&lt;script&gt;`, `&lt;iframe&gt;`, `&lt;object&gt;`, forms, inline javascript, and tracking tags before being rendered. The browser never executes downloaded programs or macros.
        </p>
      </div>
    </div>
  );
};
