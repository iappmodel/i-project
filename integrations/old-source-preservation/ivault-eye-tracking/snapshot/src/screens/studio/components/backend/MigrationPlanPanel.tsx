import { STUDIO_MIGRATION_FILES } from "../../backend/studioMigrationFiles";

/**
 * SQL files use `studio_0001_*.sql` … `studio_0008_*.sql` so they sort after numeric economy migrations
 * (`0006_external_transfers.sql`, etc.) and avoid filename collisions.
 */
export function MigrationPlanPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 10 }} className="ist-mono">
      <p style={{ margin: 0, color: "var(--ist-muted)" }}>
        Scaffold migrations under <code>supabase/migrations/</code>. Run order follows lexicographic sort — keep <code>studio_*</code> after existing <code>000x</code> economy migrations.
      </p>

      <div style={{ overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.05)" }}>
              <th style={{ padding: 6 }}>File</th>
              <th style={{ padding: 6 }}>Domain</th>
              <th style={{ padding: 6 }}>Tables</th>
              <th style={{ padding: 6 }}>Depends</th>
              <th style={{ padding: 6 }}>Risk</th>
              <th style={{ padding: 6 }}>Prod</th>
            </tr>
          </thead>
          <tbody>
            {STUDIO_MIGRATION_FILES.map((m) => (
              <tr key={m.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: 6, whiteSpace: "nowrap" }}>{m.filename}</td>
                <td style={{ padding: 6 }}>{m.domain}</td>
                <td style={{ padding: 6, maxWidth: 200 }}>{m.tables.join(", ") || "—"}</td>
                <td style={{ padding: 6 }}>{m.dependsOn.join(", ") || "—"}</td>
                <td style={{ padding: 6 }}>{m.riskLevel}</td>
                <td style={{ padding: 6 }}>{m.productionRequired ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Recommended commands (do not run from Studio UI)</div>
        <pre style={{ margin: 0, padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.35)", overflow: "auto", border: "1px solid rgba(255,255,255,0.08)" }}>
          {`supabase init
supabase migration new studio_placeholder
supabase db push
supabase gen types typescript --local > src/lib/supabase/database.gen.ts`}
        </pre>
      </div>
    </div>
  );
}
