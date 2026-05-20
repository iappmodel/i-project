import type { CSSProperties } from "react";
import type { UserPopsReceiptListItem } from "./user-pops-summary.service";
import { formatUserPopsDate } from "./user-pops-summary.service";

export interface UserPopsReceiptsProps {
  receipts: UserPopsReceiptListItem[];
  onViewReceipt?: (receiptId: string) => void;
}

export function UserPopsReceipts({ receipts, onViewReceipt }: UserPopsReceiptsProps) {
  return (
    <section style={sectionStyle} aria-labelledby="pops-privacy-receipts-heading">
      <h3 id="pops-privacy-receipts-heading" style={headingStyle}>
        Privacy receipts
      </h3>
      <p style={helperStyle}>
        Records showing what signal categories were used for reward or trust decisions.
      </p>
      {receipts.length === 0 ? (
        <p style={emptyStyle}>No receipts yet.</p>
      ) : (
        <ul style={listStyle}>
          {receipts.map((r) => (
            <li key={r.id} style={cardStyle}>
              <div style={rowStyle}>
                <span style={labelStyle}>Session type</span>
                <span style={valueStyle}>{r.sessionTypeLabel}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Date</span>
                <span style={valueStyle}>{formatUserPopsDate(r.date)}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Decision</span>
                <span style={valueStyle}>{r.decision}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Proof level</span>
                <span style={valueStyle}>{r.proofLevelLabel}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Raw data stored</span>
                <span style={valueStyle}>{r.rawDataStored ? "Yes" : "No"}</span>
              </div>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => onViewReceipt?.(r.id)}
              >
                View receipt
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const sectionStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
  background: "#fff"
};

const headingStyle: CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: 16,
  color: "#0f172a"
};

const helperStyle: CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: 13,
  color: "#475569",
  lineHeight: 1.45
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const cardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 12,
  background: "#f8fafc",
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  flex: "0 0 auto"
};

const valueStyle: CSSProperties = {
  color: "#0f172a",
  fontWeight: 600,
  textAlign: "right",
  flex: "1 1 auto"
};

const buttonStyle: CSSProperties = {
  marginTop: 4,
  alignSelf: "flex-start",
  border: "1px solid #cbd5f5",
  background: "#eff6ff",
  color: "#1e3a8a",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer"
};

const emptyStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#64748b"
};
