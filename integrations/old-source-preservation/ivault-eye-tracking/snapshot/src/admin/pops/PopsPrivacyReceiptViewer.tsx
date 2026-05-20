import { popsSessionReviewRecords } from "./popsAdminMockData";

export function PopsPrivacyReceiptViewer() {
  return (
    <section style={panelStyle}>
      <h3 style={{ marginTop: 0 }}>Privacy Receipts</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {popsSessionReviewRecords.map((session) => (
          <article key={session.privacyReceipt.receiptId} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong>{session.privacyReceipt.receiptId}</strong>
              <span style={pillStyle}>{session.privacyReceipt.policyVersion}</span>
            </div>
            <p style={{ marginBottom: 8, color: "#334155" }}>{session.privacyReceipt.userVisibleSummary}</p>
            <div style={metaGridStyle}>
              <Field label="Session ID" value={session.sessionId} />
              <Field label="User ID" value={session.userId} />
              <Field label="Proof level" value={session.proofLevel} />
              <Field label="Retention policy" value={session.privacyReceipt.retentionPolicy} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{value}</div>
    </div>
  );
}

const panelStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 12,
  padding: 14,
  background: "#ffffff",
};

const cardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const pillStyle = {
  background: "#e2e8f0",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  color: "#334155",
};

const metaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: 8,
};
