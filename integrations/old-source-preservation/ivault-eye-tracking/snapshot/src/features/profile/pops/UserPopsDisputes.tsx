import type { CSSProperties } from "react";
import type { UserPopsDisputeListItem } from "./user-pops-summary.service";
import { formatUserPopsDate } from "./user-pops-summary.service";

export interface UserPopsDisputesProps {
  disputes: UserPopsDisputeListItem[];
  onViewDetails?: (disputeId: string) => void;
}

export function UserPopsDisputes({ disputes, onViewDetails }: UserPopsDisputesProps) {
  return (
    <section style={sectionStyle} aria-labelledby="pops-disputes-heading">
      <h3 id="pops-disputes-heading" style={headingStyle}>
        Disputes
      </h3>
      {disputes.length === 0 ? (
        <p style={emptyStyle}>No open disputes.</p>
      ) : (
        <ul style={listStyle}>
          {disputes.map((d) => (
            <li key={d.id} style={cardStyle}>
              <div style={rowStyle}>
                <span style={labelStyle}>Reward</span>
                <span style={valueStyle}>{d.rewardLabel}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Status</span>
                <span style={valueStyle}>{d.status}</span>
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Last update</span>
                <span style={valueStyle}>{formatUserPopsDate(d.lastUpdated)}</span>
              </div>
              <button
                type="button"
                style={buttonStyle}
                onClick={() => onViewDetails?.(d.id)}
              >
                View details
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
  margin: "0 0 12px 0",
  fontSize: 16,
  color: "#0f172a"
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
  border: "1px solid #fee2e2",
  borderRadius: 10,
  padding: 12,
  background: "#fff7ed",
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
  border: "1px solid #fdba74",
  background: "#ffedd5",
  color: "#9a3412",
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
