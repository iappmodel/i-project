import type { StudioBackendPanelTab } from "../../studioTypes";
import type { StudioController } from "../../studioStore";
import { StudioMockPersistenceAdapter } from "../../backend/studioMockPersistenceAdapter";
import { SupabaseStudioPersistenceAdapter } from "../../backend/supabaseStudioAdapter";
import { STUDIO_MIGRATION_PLAN } from "../../backend/studioMigrationPlan";
import { ApiContractPanel } from "./ApiContractPanel";
import { DataBoundaryPanel } from "./DataBoundaryPanel";
import { EdgeFunctionPanel } from "./EdgeFunctionPanel";
import { MigrationPlanPanel } from "./MigrationPlanPanel";
import { PersistenceInspector } from "./PersistenceInspector";
import { ProductionChecklistPanel } from "./ProductionChecklistPanel";
import { RlsPolicyPanel } from "./RlsPolicyPanel";
import { SchemaPreviewPanel } from "./SchemaPreviewPanel";
import { ServerAuthorityPanel } from "./ServerAuthorityPanel";
import { SupabaseConnectionPanel } from "./SupabaseConnectionPanel";

const TABS: { id: StudioBackendPanelTab; label: string }[] = [
  { id: "connection", label: "Connection" },
  { id: "api", label: "API" },
  { id: "persistence", label: "Persistence" },
  { id: "boundary", label: "Boundary" },
  { id: "authority", label: "Authority" },
  { id: "schema", label: "Schema" },
  { id: "migrations", label: "Migrations" },
  { id: "rls", label: "RLS" },
  { id: "edge_functions", label: "Edge Functions" },
  { id: "checklist", label: "Checklist" },
];

function Chip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className="ist-mono"
      style={{
        fontSize: 8,
        padding: "2px 6px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: on ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
        color: on ? "#86efac" : "var(--ist-muted)",
      }}
    >
      {label}
    </span>
  );
}

export function BackendReadinessPanel({ studio }: { studio: StudioController }) {
  const { state, actions } = studio;
  const tab = state.selectedBackendPanel;
  const mockActive = state.persistenceAdapter instanceof StudioMockPersistenceAdapter;
  const supaActive = state.persistenceAdapter instanceof SupabaseStudioPersistenceAdapter;
  const h = state.backendHealth;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Backend Readiness</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <Chip label={`mode: ${state.activeBackendMode}`} on />
          <Chip label="supabase env" on={state.supabaseConfigured} />
          <Chip label="mock adapter" on={mockActive} />
          <Chip label="supabase adapter" on={supaActive} />
          <Chip label="client ok" on={h.clientAvailable} />
          <Chip label="migrations known" on={h.migrationsKnown} />
          <Chip label="strict backend" on={state.backendConfig.strictBackendMode} />
        </div>
        <div style={{ fontSize: 9, color: "var(--ist-muted)", marginBottom: 4 }} className="ist-mono">
          Readiness gates (Stage 8 contract)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <Chip label="local only" on={state.activeBackendMode === "mock"} />
          <Chip label="mock persistence active" on={mockActive} />
          <Chip label="server authority mapped" on />
          <Chip label="ledger immutable (design)" on />
          <Chip label="production not connected" on={!state.supabaseConfigured || !h.clientAvailable} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.saveToMockPersistence()}>
            Save local → mock
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.hydrateFromMockPersistence()}>
            Hydrate from mock
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.persistMagicRevealsToMock()}>
            Persist Magic reveals
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.persistPostPackageToMock()}>
            Persist post package
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.persistCampaignToMock()}>
            Persist campaign
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => void actions.createMockLedgerPersist()}>
            Mock ledger txn
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.setSelectedBackendPanel("schema")}>
            Schema preview
          </button>
        </div>
        {state.persistedSnapshotMeta ? (
          <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 6 }}>
            Last mock save: {state.persistedSnapshotMeta.savedAt} · project {state.persistedSnapshotMeta.projectId}
          </div>
        ) : null}
        <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 4 }}>
          sync: {state.backendSyncStatus}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`ist-btn ist-btn--ghost${tab === t.id ? " ist-btn--active" : ""}`}
            style={{ fontSize: 10, padding: "4px 10px" }}
            onClick={() => actions.setSelectedBackendPanel(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {tab === "connection" ? <SupabaseConnectionPanel studio={studio} /> : null}
        {tab === "api" ? <ApiContractPanel /> : null}
        {tab === "persistence" ? <PersistenceInspector studio={studio} /> : null}
        {tab === "boundary" ? <DataBoundaryPanel /> : null}
        {tab === "authority" ? <ServerAuthorityPanel /> : null}
        {tab === "schema" ? <SchemaPreviewPanel /> : null}
        {tab === "migrations" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <MigrationPlanPanel />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Phase roadmap (Stage 8 plan)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="ist-mono">
                {STUDIO_MIGRATION_PLAN.map((p) => (
                  <div key={p.phase} style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Phase {p.phase}: {p.goal}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--ist-muted)", marginBottom: 4 }}>Tables: {p.tables.join(", ")}</div>
                    <div style={{ fontSize: 9, color: "var(--ist-muted)", marginBottom: 4 }}>APIs: {p.apis.join(", ")}</div>
                    <div style={{ fontSize: 9, color: "#fca5a5", marginBottom: 4 }}>Risks: {p.risks.join("; ")}</div>
                    <div style={{ fontSize: 9, color: "#86efac" }}>Acceptance: {p.acceptanceCriteria.join("; ")}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "rls" ? <RlsPolicyPanel /> : null}
        {tab === "edge_functions" ? <EdgeFunctionPanel /> : null}
        {tab === "checklist" ? <ProductionChecklistPanel /> : null}
      </div>
    </div>
  );
}
