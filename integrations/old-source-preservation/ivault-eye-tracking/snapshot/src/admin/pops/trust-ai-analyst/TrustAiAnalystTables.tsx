import type { CSSProperties } from "react";

const sectionStyle: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 20,
  background: "#fff"
};

const tableWrap: CSSProperties = {
  marginTop: 20,
  overflowX: "auto"
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  textAlign: "left"
};

const thStyle: CSSProperties = {
  padding: "8px 4px",
  fontSize: 12,
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0"
};

const tdStyle: CSSProperties = {
  padding: "12px 4px",
  borderTop: "1px solid #f1f5f9"
};

export function TrustAiFindingTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Trust AI findings</h2>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Severity</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Finding</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Detector</th>
              <th style={thStyle}>Signals</th>
              <th style={thStyle}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.admin_security_trust_ai_finding_id ?? item.finding_key)}>
                <td style={tdStyle}>{String(item.severity ?? "")}</td>
                <td style={tdStyle}>{String(item.status ?? "")}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{String(item.finding_title ?? "")}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{String(item.finding_summary ?? "")}</div>
                </td>
                <td style={tdStyle}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                <td style={tdStyle}>{String(item.detector_family ?? "")}</td>
                <td style={tdStyle}>{String(item.signal_count ?? "")}</td>
                <td style={tdStyle}>
                  {Math.round(Number(item.confidence ?? 0) * 100)}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const cardGrid: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"
};

const riskCard: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 20,
  background: "#fff"
};

export function CustomerTrustRiskScoreCards({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={{ ...sectionStyle, border: "none", padding: 0, background: "transparent" }}>
      <div style={cardGrid}>
        {items.map((item) => (
          <article key={String(item.admin_security_customer_trust_risk_score_id ?? item.risk_score_key)} style={riskCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", color: "#64748b" }}>Customer risk</p>
                <h3 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>{String(item.customer_name ?? "")}</h3>
              </div>
              <span style={{ border: "1px solid #e2e8f0", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
                {String(item.risk_level ?? "")}
              </span>
            </div>

            <p style={{ margin: "16px 0 0", fontSize: 28, fontWeight: 600 }}>{Number(item.overall_risk_score ?? 0).toFixed(1)}</p>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                fontSize: 14
              }}
            >
              <div>
                <p style={{ margin: 0, color: "#64748b" }}>Open findings</p>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{String(item.open_finding_count ?? 0)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: "#64748b" }}>Open incidents</p>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{String(item.open_incident_count ?? 0)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: "#64748b" }}>Failed verifications</p>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{String(item.failed_verification_count ?? 0)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: "#64748b" }}>Dead letters</p>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{String(item.dead_lettered_delivery_count ?? 0)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TrustAiRecommendedActionTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Recommended actions</h2>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Target</th>
              <th style={thStyle}>Approval</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.admin_security_trust_ai_recommended_action_id ?? item.recommended_action_key)}>
                <td style={tdStyle}>{String(item.action_priority ?? "")}</td>
                <td style={tdStyle}>{String(item.status ?? "")}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{String(item.title ?? "")}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{String(item.summary ?? "")}</div>
                </td>
                <td style={tdStyle}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                <td style={tdStyle}>
                  {item.target_key != null ? String(item.target_key) : item.target_table != null ? String(item.target_table) : "—"}
                </td>
                <td style={tdStyle}>{item.requires_approval === true ? "Required" : "Not required"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
