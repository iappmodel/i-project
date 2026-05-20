import { popsTrustImpactFeed } from "./popsAdminMockData";

function signed(value: number): string {
  const rounded = value.toFixed(3);
  return value >= 0 ? `+${rounded}` : rounded;
}

export function PopsTrustImpactPanel() {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Trust Impact</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Event</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Score delta</th>
              <th style={thStyle}>Confidence</th>
              <th style={thStyle}>Session</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>
          <tbody>
            {popsTrustImpactFeed.map((impact) => (
              <tr key={impact.id}>
                <td style={tdStyle}>{impact.eventType}</td>
                <td style={tdStyle}>{impact.recommendedAction}</td>
                <td style={tdStyle}>{signed(impact.scoreDelta)}</td>
                <td style={tdStyle}>{Math.round(impact.confidence * 100)}%</td>
                <td style={tdStyle}>{impact.sessionId}</td>
                <td style={tdStyle}>{impact.userId}</td>
                <td style={tdStyle}>{new Date(impact.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const panelStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 14,
  background: "#ffffff",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const thStyle = {
  textAlign: "left" as const,
  borderBottom: "1px solid #e2e8f0",
  padding: "8px 6px",
  color: "#475569",
  fontSize: 12,
  fontWeight: 600,
};

const tdStyle = {
  borderBottom: "1px solid #f1f5f9",
  padding: "8px 6px",
  fontSize: 13,
  color: "#0f172a",
};
