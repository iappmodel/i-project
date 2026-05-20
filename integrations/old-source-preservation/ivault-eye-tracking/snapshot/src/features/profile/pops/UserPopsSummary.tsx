import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { UserPopsDisputes } from "./UserPopsDisputes";
import { UserPopsReceipts } from "./UserPopsReceipts";
import { UserVerifiedMoments } from "./UserVerifiedMoments";
import {
  fetchUserPopsSummary,
  type UserPopsSummaryPayload,
  type VerificationReliabilityState
} from "./user-pops-summary.service";

export interface UserPopsSummaryProps {
  userId?: string;
  onViewReceipt?: (receiptId: string) => void;
  onViewDispute?: (disputeId: string) => void;
}

function reliabilityLabel(state: VerificationReliabilityState): string {
  switch (state) {
    case "strong":
      return "Strong";
    case "good":
      return "Good";
    case "limited":
      return "Limited";
    case "under_review":
      return "Under review";
    default:
      return "Good";
  }
}

function reliabilityBadgeStyle(state: VerificationReliabilityState): CSSProperties {
  const base: CSSProperties = {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
    borderRadius: 999,
    padding: "4px 10px",
    border: "1px solid"
  };
  switch (state) {
    case "strong":
      return { ...base, background: "#dcfce7", color: "#166534", borderColor: "#86efac" };
    case "good":
      return { ...base, background: "#dbeafe", color: "#1e3a8a", borderColor: "#93c5fd" };
    case "limited":
      return { ...base, background: "#fef9c3", color: "#854d0e", borderColor: "#fde047" };
    case "under_review":
      return { ...base, background: "#ffedd5", color: "#9a3412", borderColor: "#fdba74" };
    default:
      return { ...base, background: "#f1f5f9", color: "#334155", borderColor: "#cbd5e1" };
  }
}

export function UserPopsSummary({ userId, onViewReceipt, onViewDispute }: UserPopsSummaryProps) {
  const [data, setData] = useState<UserPopsSummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchUserPopsSummary(userId)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("We couldn’t load your P.O.P.S summary. Try again shortly.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const metrics = data?.metrics;

  const statItems = useMemo(() => {
    if (!metrics) {
      return [];
    }
    return [
      { label: "Verified moments", value: metrics.verifiedMoments },
      { label: "Rewards verified", value: metrics.rewardsVerified },
      { label: "Rewards pending", value: metrics.rewardsPending },
      { label: "Rewards under review", value: metrics.rewardsUnderReview },
      { label: "Privacy receipts", value: metrics.privacyReceipts },
      { label: "Disputes", value: metrics.disputeCount }
    ];
  }, [metrics]);

  return (
    <article style={pageStyle} aria-label="P.O.P.S user profile summary">
      <header style={headerStyle}>
        <h2 style={titleStyle}>Your verification overview</h2>
        <p style={subtitleStyle}>
          A transparent summary of verified moments, reward checks, privacy receipts, and any
          disputes — without sensitive scoring details.
        </p>
      </header>

      {loading ? <p style={mutedStyle}>Loading summary…</p> : null}
      {error ? <p style={errorStyle}>{error}</p> : null}

      {!loading && !error && data ? (
        <>
          <section style={gridSectionStyle} aria-label="Summary metrics">
            <div style={gridStyle}>
              {statItems.map((s) => (
                <div key={s.label} style={tileStyle}>
                  <div style={tileValueStyle}>{s.value}</div>
                  <div style={tileLabelStyle}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={cardBlockStyle} aria-labelledby="pops-reliability-heading">
            <h3 id="pops-reliability-heading" style={sectionHeadingStyle}>
              Verification reliability
            </h3>
            <div style={reliabilityRowStyle}>
              <span style={reliabilityBadgeStyle(data.metrics.verificationReliability)}>
                {reliabilityLabel(data.metrics.verificationReliability)}
              </span>
              {data.metrics.trustTierLabel ? (
                <span style={tierPillStyle}>{data.metrics.trustTierLabel}</span>
              ) : null}
            </div>
            <p style={bodyStyle}>
              How consistently your sessions can be verified. This can improve with clean activity
              and stable account history.
            </p>
          </section>

          <section style={cardBlockStyle} aria-labelledby="pops-reward-review-heading">
            <h3 id="pops-reward-review-heading" style={sectionHeadingStyle}>
              Reward review
            </h3>
            <ul style={rewardListStyle}>
              <li style={rewardLiStyle}>
                <span style={rewardLabelStyle}>Verified</span>
                <span style={rewardValueStyle}>{data.metrics.rewardsVerified}</span>
              </li>
              <li style={rewardLiStyle}>
                <span style={rewardLabelStyle}>Pending</span>
                <span style={rewardValueStyle}>{data.metrics.rewardsPending}</span>
              </li>
              <li style={rewardLiStyle}>
                <span style={rewardLabelStyle}>Under review</span>
                <span style={rewardValueStyle}>{data.metrics.rewardsUnderReview}</span>
              </li>
            </ul>
          </section>

          <div style={stackStyle}>
            <UserVerifiedMoments
              verifiedCount={data.metrics.verifiedMoments}
              moments={data.recentVerifiedMoments}
            />
            <UserPopsReceipts receipts={data.receipts} onViewReceipt={onViewReceipt} />
            <UserPopsDisputes disputes={data.disputes} onViewDetails={onViewDispute} />
          </div>
        </>
      ) : null}
    </article>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "8px 4px 24px",
  color: "#0f172a"
};

const headerStyle: CSSProperties = {
  marginBottom: 16
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: "#0f172a"
};

const subtitleStyle: CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 14,
  color: "#475569",
  lineHeight: 1.5
};

const mutedStyle: CSSProperties = {
  fontSize: 14,
  color: "#64748b"
};

const errorStyle: CSSProperties = {
  fontSize: 14,
  color: "#b91c1c"
};

const gridSectionStyle: CSSProperties = {
  marginBottom: 16
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 10
};

const tileStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "12px 10px",
  background: "#fff"
};

const tileValueStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#0f172a"
};

const tileLabelStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.35
};

const cardBlockStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
  background: "#fff",
  marginBottom: 16
};

const sectionHeadingStyle: CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: 16,
  color: "#0f172a"
};

const reliabilityRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  marginBottom: 8
};

const tierPillStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "4px 10px",
  background: "#f8fafc"
};

const bodyStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#475569",
  lineHeight: 1.5
};

const rewardListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8
};

const rewardLiStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#f8fafc",
  fontSize: 14
};

const rewardLabelStyle: CSSProperties = {
  color: "#475569",
  fontWeight: 600
};

const rewardValueStyle: CSSProperties = {
  color: "#0f172a",
  fontWeight: 800
};

const stackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16
};
