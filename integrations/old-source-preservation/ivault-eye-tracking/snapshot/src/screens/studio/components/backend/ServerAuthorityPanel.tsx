import { STUDIO_HARD_BOUNDARY_RULES } from "../../backend/studioHardBoundaries";
import { assertServerAuthorityRequired, getServerAuthorityExplanation, type ServerAuthorityDomain } from "../../backend/studioServerAuthority";

const DOMAINS: ServerAuthorityDomain[] = [
  "wallet",
  "ledger",
  "rewards",
  "verification",
  "fraud",
  "trust",
  "safety",
  "rights",
  "publish",
  "campaign_budget",
  "settlement",
  "disputes",
  "age",
  "runtime_unlock",
];

export function ServerAuthorityPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 10 }}>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#e2e8f0" }}>
        <li>Client may request.</li>
        <li>Server decides economics, verification, publish, and unlock.</li>
        <li>Ledger is append-only; reversals are compensating entries.</li>
        <li>Rewards require verification + budget reservation.</li>
        <li>Publish requires validated, signed package snapshot.</li>
        <li>Age, trust, and fraud outcomes are never client-supplied as authority.</li>
        <li>Client preview / unlock simulation is not settlement or payment.</li>
      </ul>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Examples</div>
        <ul className="ist-mono" style={{ margin: 0, paddingLeft: 16, fontSize: 9, color: "var(--ist-muted)" }}>
          <li style={{ marginBottom: 6 }}>
            <strong style={{ color: "#fde68a" }}>Viewer taps Pay &amp; Reveal</strong> — client request; server checks eligibility; server debits wallet; server records ledger.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong style={{ color: "#fde68a" }}>Creator edits blur area</strong> — client drafts geometry; server validates monetization &amp; safety before publish.
          </li>
          <li>
            <strong style={{ color: "#fde68a" }}>Campaign action completed</strong> — client reports attempt; server verifies; server pays or rejects with audit trail.
          </li>
        </ul>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Hard boundaries (1–15)</div>
        <ol className="ist-mono" style={{ margin: 0, paddingLeft: 18, fontSize: 9, color: "var(--ist-muted)" }}>
          {STUDIO_HARD_BOUNDARY_RULES.map((r) => (
            <li key={r.id} style={{ marginBottom: 4 }}>
              {r.rule}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>assertServerAuthorityRequired</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(["request_unlock", "request_publish", "client_compute_balance"] as const).map((a) => {
            const r = assertServerAuthorityRequired(a);
            return (
              <div key={a} className="ist-mono" style={{ fontSize: 9, padding: 6, background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>
                <div style={{ color: "#a5f3fc" }}>{a}</div>
                <div>{r.reason}</div>
                <div style={{ color: "var(--ist-muted)" }}>{r.domains.join(", ")}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Domains</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflow: "auto" }}>
          {DOMAINS.map((d) => (
            <div key={d} className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>
              <span style={{ color: "#e2e8f0" }}>{d}</span> — {getServerAuthorityExplanation(d)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
