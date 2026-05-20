import type { CreatorRewardQualityBreakdown as CreatorRewardQualityBreakdownModel } from "./creator-pops.service";

interface CreatorRewardQualityBreakdownProps {
  breakdown: CreatorRewardQualityBreakdownModel;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function CreatorRewardQualityBreakdown({ breakdown }: CreatorRewardQualityBreakdownProps) {
  return (
    <article style={cardStyle}>
      <h3 style={{ margin: "0 0 8px 0" }}>Reward quality breakdown</h3>
      <ul style={listStyle}>
        <li>
          Reward approval rate: <strong>{percent(breakdown.approvalRate)}</strong>
        </li>
        <li>
          Held reward rate: <strong>{percent(breakdown.holdRate)}</strong>
        </li>
        <li>
          Suspicious traffic rate: <strong>{percent(breakdown.suspiciousTrafficRate)}</strong>
        </li>
        <li>
          Trust-adjusted engagement quality: <strong>{percent(breakdown.trustAdjustedEngagementQuality)}</strong>
        </li>
      </ul>
    </article>
  );
}

const cardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  background: "#ffffff",
  padding: 12,
};

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  lineHeight: 1.6,
  color: "#334155",
};
