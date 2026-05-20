import { STUDIO_RLS_POLICY_DESCRIPTIONS, getRlsPolicySummary } from "../../backend/studioRlsPolicies";

const DANGEROUS = [
  "wallet_ledger_entries",
  "wallet_balances",
  "verification_records",
  "fraud_assessments",
  "disputes",
  "dispute_evidence",
  "post_packages",
];

export function RlsPolicyPanel() {
  const summary = getRlsPolicySummary();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 10 }} className="ist-mono">
      <p style={{ margin: 0, color: "var(--ist-muted)" }}>{summary}</p>

      <div style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.08)" }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: "#fecaca" }}>High-risk tables (client must not own writes)</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {DANGEROUS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      {STUDIO_RLS_POLICY_DESCRIPTIONS.map((p) => (
        <div key={p.domain} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.domain}</div>
          <div style={{ color: "#86efac", marginBottom: 4 }}>User</div>
          <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
            {p.userCan.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div style={{ color: "#93c5fd", marginBottom: 4 }}>Server only</div>
          <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
            {p.serverOnly.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          {p.appendOnly.length ? (
            <>
              <div style={{ color: "#fcd34d", marginBottom: 4 }}>Append-only</div>
              <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                {p.appendOnly.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          ) : null}
          {p.immutable.length ? (
            <>
              <div style={{ color: "#fca5a5", marginBottom: 4 }}>Immutable</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {p.immutable.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
