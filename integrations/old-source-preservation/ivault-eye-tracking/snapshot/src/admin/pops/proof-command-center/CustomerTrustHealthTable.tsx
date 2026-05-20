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

export function CustomerTrustHealthTable({ items }: { items: Record<string, unknown>[] }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Customer trust health</h2>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Room</th>
              <th style={thStyle}>Health</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Incidents</th>
              <th style={thStyle}>Critical</th>
              <th style={thStyle}>Missing notices</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={String(item.admin_security_customer_trust_health_id ?? item.health_key)}>
                <td style={tdStyle}>{item.customer_name != null ? String(item.customer_name) : "—"}</td>
                <td style={tdStyle}>{item.private_room_key != null ? String(item.private_room_key) : "—"}</td>
                <td style={tdStyle}>{String(item.health_status ?? "")}</td>
                <td style={tdStyle}>{String(item.health_score ?? "")}</td>
                <td style={tdStyle}>{String(item.active_incident_count ?? 0)}</td>
                <td style={tdStyle}>{String(item.critical_incident_count ?? 0)}</td>
                <td style={tdStyle}>{String(item.unresolved_notice_required_count ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
