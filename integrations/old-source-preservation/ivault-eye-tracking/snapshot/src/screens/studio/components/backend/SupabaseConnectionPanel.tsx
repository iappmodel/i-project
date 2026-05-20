import { useState } from "react";
import { getSupabaseClient } from "../../../../lib/supabase/supabaseClient";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "../../../../lib/supabase/supabaseConfig";
import { StudioMockPersistenceAdapter } from "../../backend/studioMockPersistenceAdapter";
import { SupabaseStudioPersistenceAdapter } from "../../backend/supabaseStudioAdapter";
import type { StudioController } from "../../studioStore";

const ENV_TEMPLATE = `VITE_STUDIO_BACKEND_MODE=mock
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# Optional: fail closed when credentials missing
# VITE_STUDIO_STRICT_BACKEND=true
`;

function maskKey(k: string | undefined): string {
  if (!k) return "(empty)";
  if (k.length <= 12) return "•••• (hidden)";
  return `${k.slice(0, 6)}…${k.slice(-4)} (hidden)`;
}

export function SupabaseConnectionPanel({ studio }: { studio: StudioController }) {
  const { state, actions } = studio;
  const [copyOk, setCopyOk] = useState<string | null>(null);
  const urlPresent = Boolean(getSupabaseUrl()?.trim());
  const keyPresent = Boolean(getSupabaseAnonKey()?.trim());
  const envConfigured = isSupabaseConfigured();
  const clientOk = getSupabaseClient() != null;
  const mockActive = state.persistenceAdapter instanceof StudioMockPersistenceAdapter;
  const supaActive = state.persistenceAdapter instanceof SupabaseStudioPersistenceAdapter;

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE);
      setCopyOk("Copied env template");
      setTimeout(() => setCopyOk(null), 2000);
    } catch {
      setCopyOk("Copy failed — select template manually");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 11 }}>
      <p style={{ margin: 0, color: "var(--ist-muted)" }}>
        Stage 9 reads <code className="ist-mono">VITE_*</code> via <code className="ist-mono">supabaseConfig.ts</code>. No secrets are shown here. The app compiles and runs in mock mode without credentials.
      </p>

      <div className="ist-mono" style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 6, fontSize: 10 }}>
        <span style={{ color: "var(--ist-muted)" }}>Config mode</span>
        <span>{state.backendConfig.mode}</span>
        <span style={{ color: "var(--ist-muted)" }}>Active persistence</span>
        <span>{state.activeBackendMode}</span>
        <span style={{ color: "var(--ist-muted)" }}>Supabase URL set</span>
        <span>{urlPresent ? "yes" : "no"}</span>
        <span style={{ color: "var(--ist-muted)" }}>Anon key set</span>
        <span>{keyPresent ? maskKey(getSupabaseAnonKey()) : "no"}</span>
        <span style={{ color: "var(--ist-muted)" }}>Client initialized</span>
        <span>{clientOk ? "yes" : "no"}</span>
        <span style={{ color: "var(--ist-muted)" }}>Strict backend</span>
        <span>{state.backendConfig.strictBackendMode ? "on" : "off"}</span>
        <span style={{ color: "var(--ist-muted)" }}>Adapter</span>
        <span>{mockActive ? "mock" : supaActive ? "supabase" : "unknown"}</span>
      </div>

      {mockActive && state.backendConfig.mode === "supabase" ? (
        <div style={{ fontSize: 10, color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)", padding: 8, borderRadius: 8 }}>
          Supabase mode is selected in config but persistence is still mock — add URL + anon key and enable persistence, or switch to mock mode.
        </div>
      ) : null}
      {mockActive && state.backendConfig.mode === "mock" ? (
        <div style={{ fontSize: 10, color: "var(--ist-muted)" }}>Using local mock persistence (default). Safe for UI and Stage 1–8 flows.</div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.setStudioBackendMode("mock")}>
          Use mock backend
        </button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          style={{ fontSize: 10 }}
          disabled={!envConfigured}
          title={!envConfigured ? "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first" : undefined}
          onClick={() => actions.setStudioBackendMode("supabase")}
        >
          Use Supabase (if configured)
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.checkBackendHealth()}>
          Refresh health (no network)
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.initializePersistenceAdapter()}>
          Rebuild adapter
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void copyTemplate()}>
          Copy env template
        </button>
      </div>
      {copyOk ? <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>{copyOk}</div> : null}

      <pre
        className="ist-mono"
        style={{ margin: 0, fontSize: 9, padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.35)", overflow: "auto", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {ENV_TEMPLATE.trim()}
      </pre>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={state.backendConfig.strictBackendMode} onChange={(e) => actions.setBackendConfig({ strictBackendMode: e.target.checked })} />
          Strict backend mode (also respect <code className="ist-mono">VITE_STUDIO_STRICT_BACKEND</code> in env)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={state.backendConfig.enablePersistence} onChange={(e) => actions.setBackendConfig({ enablePersistence: e.target.checked })} />
          Enable Supabase persistence path when credentials exist
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={state.backendConfig.enableRealtime} onChange={(e) => actions.setBackendConfig({ enableRealtime: e.target.checked })} />
          Enable realtime flag (Stage 10+)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={state.backendConfig.enableServerLedger} onChange={(e) => actions.setBackendConfig({ enableServerLedger: e.target.checked })} />
          Prefer server ledger (planning)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={state.backendConfig.enableServerVerification} onChange={(e) => actions.setBackendConfig({ enableServerVerification: e.target.checked })} />
          Prefer server verification (planning)
        </label>
      </div>

      {state.backendConfig.envWarnings.length ? (
        <div className="ist-mono" style={{ fontSize: 9, color: "#fca5a5" }}>
          {state.backendConfig.envWarnings.map((w, i) => (
            <div key={i}>
              [{w.code}] {w.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
