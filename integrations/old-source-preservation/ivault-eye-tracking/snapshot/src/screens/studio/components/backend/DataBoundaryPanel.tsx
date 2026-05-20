import { StudioDataBoundaryRules } from "../../backend/studioDataBoundary";

export function DataBoundaryPanel() {
  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }} className="ist-mono">
        <thead>
          <tr style={{ textAlign: "left", color: "var(--ist-muted)" }}>
            <th style={{ padding: 4 }}>Domain</th>
            <th style={{ padding: 4 }}>Field</th>
            <th style={{ padding: 4 }}>Client</th>
            <th style={{ padding: 4 }}>Server</th>
            <th style={{ padding: 4 }}>Immutable</th>
            <th style={{ padding: 4 }}>Sensitive</th>
            <th style={{ padding: 4 }}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {StudioDataBoundaryRules.map((r) => (
            <tr key={`${r.domain}-${r.field}`} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <td style={{ padding: 4 }}>{r.domain}</td>
              <td style={{ padding: 4, color: "#e2e8f0" }}>{r.field}</td>
              <td style={{ padding: 4 }}>{r.clientWritable ? "yes" : "no"}</td>
              <td style={{ padding: 4 }}>{r.serverComputed ? "yes" : "no"}</td>
              <td style={{ padding: 4 }}>{r.immutable ? "yes" : "—"}</td>
              <td style={{ padding: 4 }}>{r.sensitive ? "yes" : "no"}</td>
              <td style={{ padding: 4, color: "var(--ist-muted)", maxWidth: 220 }}>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
