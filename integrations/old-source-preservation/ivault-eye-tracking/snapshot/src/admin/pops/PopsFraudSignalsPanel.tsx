import { popsFraudSignals } from "./popsAdminMockData";

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PopsFraudSignalsPanel() {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Fraud Signals</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Signal</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Risk</th>
              <th style={thStyle}>Reason code</th>
              <th style={thStyle}>Session</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>
          <tbody>
            {popsFraudSignals.map((signal) => (
              <tr key={signal.signalId}>
                <td style={tdStyle}>{signal.signalId}</td>
                <td style={tdStyle}>{signal.category}</td>
                <td style={tdStyle}>{toPercent(signal.risk)}</td>
                <td style={tdStyle}>{signal.reasonCode}</td>
                <td style={tdStyle}>{signal.sessionId}</td>
                <td style={tdStyle}>{signal.userId}</td>
                <td style={tdStyle}>{new Date(signal.createdAt).toLocaleString()}</td>
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
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
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
