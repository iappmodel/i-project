import { popsAdminActionAuditMock, popsSessionReviewRecords } from "./popsAdminMockData";

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

const timelineLabels: Record<string, string> = {
  session_started: "Session started",
  content_started: "Content started",
  content_progress_checkpoint: "Content progress checkpoint",
  app_backgrounded: "App backgrounded",
  interruption: "Interruption",
  reward_checkpoint: "Reward checkpoint",
  session_completed: "Session completed",
  judgment_created: "Judgment created",
  reward_decision_created: "Reward decision created",
  wallet_intent_created: "Wallet intent created",
  privacy_receipt_created: "Privacy receipt created",
};

export function PopsSessionReview() {
  const session = popsSessionReviewRecords[1] ?? popsSessionReviewRecords[0];
  if (!session) {
    return <section style={panelStyle}>No sessions in review.</section>;
  }

  return (
    <section style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>P.O.P.S Session Review</h2>
      <div style={metaGridStyle}>
        <Field label="User ID" value={session.userId} />
        <Field label="Session ID" value={session.sessionId} />
        <Field label="Campaign" value={`${session.campaignName} (${session.campaignId})`} />
        <Field label="Content" value={`${session.contentName} (${session.contentId})`} />
        <Field label="Proof level" value={session.proofLevel} />
        <Field label="Started / Ended" value={`${new Date(session.startedAt).toLocaleString()} -> ${new Date(session.endedAt).toLocaleString()}`} />
        <Field label="Duration" value={`${session.durationSeconds}s`} />
        <Field
          label="Confidence scores"
          value={`presence ${Math.round(session.presenceConfidence * 100)}%, attention ${Math.round(
            session.attentionConfidence * 100,
          )}%, intent ${Math.round(session.intentConfidence * 100)}%`}
        />
        <Field label="Fraud risk" value={`${Math.round(session.fraudRisk * 100)}%`} />
        <Field label="Reason codes" value={session.reasonCodes.join(", ")} />
        <Field label="Reward decision" value={session.rewardDecision} />
        <Field label="Wallet status" value={session.walletStatus} />
        <Field
          label="Trust impact"
          value={`${session.trustImpact.action} (${session.trustImpact.scoreDelta >= 0 ? "+" : ""}${session.trustImpact.scoreDelta.toFixed(3)})`}
        />
        <Field
          label="Privacy receipt"
          value={`${session.privacyReceipt.receiptId} · ${session.privacyReceipt.policyVersion}`}
        />
      </div>

      <h3 style={{ marginBottom: 8 }}>Event Timeline</h3>
      <ol style={{ marginTop: 0, paddingLeft: 20 }}>
        {session.timeline.map((event) => (
          <li key={event.id} style={{ marginBottom: 6 }}>
            <strong>{timelineLabels[event.type] ?? event.type}</strong> - {new Date(event.at).toLocaleString()}
            {event.detail ? ` - ${event.detail}` : ""}
          </li>
        ))}
      </ol>

      <h3 style={{ marginBottom: 8 }}>Admin Actions</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {adminActions.map((action) => (
          <button key={action} type="button" style={buttonStyle}>
            {action}
          </button>
        ))}
      </div>

      <h3 style={{ marginBottom: 8 }}>Recent Overrides (Audit)</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Admin user</th>
              <th style={thStyle}>Old decision</th>
              <th style={thStyle}>New decision</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {popsAdminActionAuditMock.map((entry) => (
              <tr key={entry.id}>
                <td style={tdStyle}>{entry.adminUserId}</td>
                <td style={tdStyle}>{entry.oldDecision}</td>
                <td style={tdStyle}>{entry.newDecision}</td>
                <td style={tdStyle}>{entry.reason}</td>
                <td style={tdStyle}>{new Date(entry.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={fieldStyle}>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const panelStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 16,
  background: "#ffffff",
};

const metaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(240px, 1fr))",
  gap: 8,
  marginBottom: 14,
};

const fieldStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "8px 10px",
  background: "#f8fafc",
};

const buttonStyle = {
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  borderRadius: 6,
  color: "#334155",
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
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
