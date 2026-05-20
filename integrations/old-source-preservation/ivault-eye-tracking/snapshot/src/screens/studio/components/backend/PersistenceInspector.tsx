import { useMemo, useState } from "react";
import type { StudioController } from "../../studioStore";
import { StudioMockPersistenceAdapter } from "../../backend/studioMockPersistenceAdapter";

export function PersistenceInspector({ studio }: { studio: StudioController }) {
  const { state, actions } = studio;
  const [importText, setImportText] = useState("");
  const adapter = state.persistenceAdapter;

  const counts = useMemo(() => {
    if (adapter instanceof StudioMockPersistenceAdapter) {
      return adapter.getEntityCounts();
    }
    return null;
  }, [adapter, state.backendEvents.length, state.ledgerEntries.length]);

  const preview = useMemo(() => {
    if (!(adapter instanceof StudioMockPersistenceAdapter)) return "";
    const firstProject = [...adapter.projects.values()][0];
    return JSON.stringify(firstProject ?? { empty: true }, null, 2);
  }, [adapter, state.persistedSnapshotMeta, state.backendEvents.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 10 }} className="ist-mono">
      {counts ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} style={{ padding: "4px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
              {k}: <strong>{v}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--ist-muted)" }}>Counts available only for mock adapter.</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.saveToMockPersistence()}>
          Save current state
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.hydrateFromMockPersistence()}>
          Load saved state
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.clearMockPersistenceStores()}>
          Clear mock
        </button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          style={{ fontSize: 10 }}
          onClick={() => {
            const j = actions.exportMockPersistenceJson();
            void navigator.clipboard?.writeText(j);
          }}
        >
          Copy JSON snapshot
        </button>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ color: "var(--ist-muted)" }}>Import JSON snapshot</span>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={4}
          style={{ width: "100%", fontSize: 9, fontFamily: "monospace", background: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: 6 }}
        />
        <button type="button" className="ist-btn ist-btn--primary" style={{ fontSize: 10 }} onClick={() => void actions.importMockPersistenceJson(importText)}>
          Import
        </button>
      </label>
      <div>
        <div style={{ color: "var(--ist-muted)", marginBottom: 4 }}>Latest persisted project (compact)</div>
        <pre
          style={{
            margin: 0,
            maxHeight: 160,
            overflow: "auto",
            fontSize: 8,
            padding: 8,
            background: "rgba(0,0,0,0.35)",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {preview}
        </pre>
      </div>
    </div>
  );
}
