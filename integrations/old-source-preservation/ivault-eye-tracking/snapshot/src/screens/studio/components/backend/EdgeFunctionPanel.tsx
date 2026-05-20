import { STUDIO_EDGE_FUNCTION_CONTRACTS } from "../../backend/studioEdgeFunctionContracts";

const CRITICAL_NAMES = new Set([
  "create-ledger-transaction",
  "confirm-magic-unlock",
  "pay-campaign-reward",
  "release-settlement",
  "run-fraud-assessment",
  "complete-pops-challenge",
]);

export function EdgeFunctionPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 10 }} className="ist-mono">
      <p style={{ margin: 0, color: "var(--ist-muted)" }}>Contracts only — no Edge deployment in Stage 9. Implement in Stage 10+ with service role and idempotency.</p>
      <div style={{ overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.05)" }}>
              <th style={{ padding: 6 }}>Name</th>
              <th style={{ padding: 6 }}>Purpose</th>
              <th style={{ padding: 6 }}>Authority</th>
              <th style={{ padding: 6 }}>Auth</th>
              <th style={{ padding: 6 }}>Svc</th>
              <th style={{ padding: 6 }}>Idem</th>
              <th style={{ padding: 6 }}>Risk</th>
            </tr>
          </thead>
          <tbody>
            {STUDIO_EDGE_FUNCTION_CONTRACTS.map((fn) => {
              const mark = CRITICAL_NAMES.has(fn.name) ? " ⚠ critical" : "";
              return (
                <tr key={fn.name} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: CRITICAL_NAMES.has(fn.name) ? "rgba(248,113,113,0.06)" : undefined }}>
                  <td style={{ padding: 6, whiteSpace: "nowrap" }}>
                    {fn.name}
                    {mark}
                  </td>
                  <td style={{ padding: 6, maxWidth: 220 }}>{fn.purpose}</td>
                  <td style={{ padding: 6 }}>{fn.authorityDomain}</td>
                  <td style={{ padding: 6 }}>{fn.requiresAuth ? "y" : "n"}</td>
                  <td style={{ padding: 6 }}>{fn.requiresServiceRole ? "y" : "n"}</td>
                  <td style={{ padding: 6 }}>{fn.idempotencyRequired ? "y" : "n"}</td>
                  <td style={{ padding: 6 }}>{fn.riskLevel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
