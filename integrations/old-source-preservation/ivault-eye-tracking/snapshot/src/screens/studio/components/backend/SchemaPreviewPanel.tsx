import { useMemo, useState } from "react";
import { STUDIO_SCHEMA_SQL } from "../../backend/studioSchemaSql";

const GROUPS: { label: string; keys: (keyof typeof STUDIO_SCHEMA_SQL)[] }[] = [
  {
    label: "Studio",
    keys: ["studio_projects", "studio_project_snapshots", "studio_assets", "studio_tracks", "studio_clips", "studio_export_jobs"],
  },
  { label: "Magic", keys: ["studio_magic_reveals", "magic_reveal_unlocks"] },
  { label: "Publish", keys: ["post_packages", "published_posts", "post_disclosures"] },
  { label: "Wallet", keys: ["wallet_accounts", "wallet_balances", "wallet_ledger_entries"] },
  { label: "Campaign", keys: ["campaigns", "campaign_action_attempts"] },
  { label: "Verification", keys: ["verification_records", "verification_gate_results", "fraud_assessments", "fraud_signals", "pops_challenges"] },
  { label: "Runtime", keys: ["runtime_events", "viewer_sessions", "trust_impacts"] },
  { label: "Disputes", keys: ["disputes", "dispute_evidence"] },
  { label: "Idempotency", keys: ["idempotency_mutations"] },
];

export function SchemaPreviewPanel() {
  const flatKeys = useMemo(() => GROUPS.flatMap((g) => g.keys), []);
  const [selected, setSelected] = useState<keyof typeof STUDIO_SCHEMA_SQL>(flatKeys[0] ?? "studio_projects");
  const sql = STUDIO_SCHEMA_SQL[selected] ?? "-- unknown";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {GROUPS.map((g) => (
          <div key={g.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 9, color: "var(--ist-muted)" }}>{g.label}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {g.keys.map((k) => (
                <button
                  key={String(k)}
                  type="button"
                  className={`ist-btn ist-btn--ghost${selected === k ? " ist-btn--active" : ""}`}
                  style={{ fontSize: 9, padding: "2px 6px" }}
                  onClick={() => setSelected(k)}
                >
                  {String(k)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <pre
        className="ist-mono"
        style={{
          flex: 1,
          margin: 0,
          overflow: "auto",
          fontSize: 9,
          lineHeight: 1.35,
          padding: 10,
          background: "rgba(0,0,0,0.35)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.08)",
          whiteSpace: "pre-wrap",
        }}
      >
        {sql}
      </pre>
    </div>
  );
}
