import type { CSSProperties } from "react";
import type { UserVerifiedMomentListItem } from "./user-pops-summary.service";
import { formatUserPopsDate } from "./user-pops-summary.service";

export interface UserVerifiedMomentsProps {
  verifiedCount: number;
  moments: UserVerifiedMomentListItem[];
}

export function UserVerifiedMoments({ verifiedCount, moments }: UserVerifiedMomentsProps) {
  return (
    <section style={sectionStyle} aria-labelledby="pops-moment-history-heading">
      <h3 id="pops-moment-history-heading" style={headingStyle}>
        Moment history
      </h3>
      <p style={labelStrongStyle}>Verified moments</p>
      <p style={helperStyle}>
        Moments where P.O.P.S confirmed enough presence for the action to count.
      </p>
      <p style={countStyle} aria-label={`${verifiedCount} verified moments`}>
        <span style={countNumberStyle}>{verifiedCount}</span>
        <span style={countSuffixStyle}> verified</span>
      </p>
      {moments.length > 0 ? (
        <ul style={listStyle}>
          {moments.map((m) => (
            <li key={m.id} style={listItemStyle}>
              <div style={rowTitleStyle}>{m.sessionTypeLabel}</div>
              <div style={rowMetaStyle}>{formatUserPopsDate(m.occurredAt)}</div>
              <div style={rowBodyStyle}>{m.summary}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={emptyStyle}>No recent verified moments to show.</p>
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

const labelStrongStyle: CSSProperties = {
  margin: "0 0 4px 0",
  fontWeight: 700,
  fontSize: 14,
  color: "#0f172a"
};

const helperStyle: CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: 13,
  color: "#475569",
  lineHeight: 1.45
};

const countStyle: CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: 14,
  color: "#334155"
};

const countNumberStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: 22,
  color: "#0f172a"
};

const countSuffixStyle: CSSProperties = {
  fontWeight: 600
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const listItemStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#f8fafc"
};

const rowTitleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  color: "#0f172a"
};

const rowMetaStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 2
};

const rowBodyStyle: CSSProperties = {
  fontSize: 12,
  color: "#475569",
  marginTop: 6,
  lineHeight: 1.4
};

const emptyStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#64748b"
};
