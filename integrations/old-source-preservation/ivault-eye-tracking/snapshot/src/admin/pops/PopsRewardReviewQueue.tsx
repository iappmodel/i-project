import { popsReviewQueue } from "./popsAdminMockData";

const adminActions = [
  "approve reward",
  "partially approve reward",
  "deny reward",
  "release hold",
  "extend hold",
  "request KYC",
  "mark false positive",
  "escalate fraud review",
  "add internal note",
];

export function PopsRewardReviewQueue() {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Reward Review Queue</h3>
      <p style={{ marginTop: 0, color: "#475569" }}>
        All actions below are auditable and must create an override record with old/new decision, reason, admin user, and
        timestamp.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Session</th>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Campaign</th>
              <th style={thStyle}>Fraud risk</th>
              <th style={thStyle}>Reason codes</th>
              <th style={thStyle}>Decision</th>
              <th style={thStyle}>Wallet</th>
            </tr>
          </thead>
          <tbody>
            {popsReviewQueue.map((session) => (
              <tr key={session.sessionId}>
                <td style={tdStyle}>{session.sessionId}</td>
                <td style={tdStyle}>{session.userId}</td>
                <td style={tdStyle}>{session.campaignName}</td>
                <td style={tdStyle}>{Math.round(session.fraudRisk * 100)}%</td>
                <td style={tdStyle}>{session.reasonCodes.join(", ")}</td>
                <td style={tdStyle}>{session.rewardDecision}</td>
                <td style={tdStyle}>{session.walletStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 style={{ marginBottom: 8 }}>Available admin actions</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {adminActions.map((action) => (
          <span key={action} style={actionChipStyle}>
            {action}
          </span>
        ))}
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

const actionChipStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "3px 8px",
  fontSize: 12,
  color: "#334155",
  background: "#f8fafc",
};
