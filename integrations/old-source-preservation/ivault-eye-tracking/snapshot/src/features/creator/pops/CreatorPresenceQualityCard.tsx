import type { CreatorPresenceQualityBreakdown, CreatorQualityTier } from "./creator-pops.service";

interface CreatorPresenceQualityCardProps {
  creatorPresenceQuality: number;
  qualityTier: CreatorQualityTier;
  formulaBreakdown: CreatorPresenceQualityBreakdown;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const tierColorMap: Record<CreatorQualityTier, string> = {
  Emerging: "#94a3b8",
  Reliable: "#60a5fa",
  Strong: "#34d399",
  Premium: "#f59e0b",
  Elite: "#a855f7",
};

export function CreatorPresenceQualityCard(props: CreatorPresenceQualityCardProps) {
  return (
    <article style={cardStyle}>
      <header style={{ marginBottom: 10 }}>
        <h3 style={{ margin: "0 0 6px 0" }}>Creator presence quality</h3>
        <p style={subtitleStyle}>
          Aggregate quality score that rewards genuine human attention and intent while reducing impact from suspicious
          traffic.
        </p>
      </header>

      <div style={scoreRowStyle}>
        <div style={{ fontSize: 30, fontWeight: 700 }}>{percent(props.creatorPresenceQuality)}</div>
        <span
          style={{
            ...tierBadgeStyle,
            borderColor: tierColorMap[props.qualityTier],
            color: tierColorMap[props.qualityTier],
          }}
        >
          {props.qualityTier}
        </span>
      </div>

      <ul style={listStyle}>
        <li>Completion contribution: {percent(props.formulaBreakdown.verifiedCompletionRateContribution)}</li>
        <li>Attention contribution: {percent(props.formulaBreakdown.averageAttentionConfidenceContribution)}</li>
        <li>Intent contribution: {percent(props.formulaBreakdown.averageIntentConfidenceContribution)}</li>
        <li>Replay/save contribution: {percent(props.formulaBreakdown.replaySaveSignalContribution)}</li>
        <li>Low-fraud contribution: {percent(props.formulaBreakdown.lowFraudTrafficScoreContribution)}</li>
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

const subtitleStyle = {
  margin: 0,
  color: "#64748b",
  lineHeight: 1.4,
  fontSize: 13,
};

const scoreRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};

const tierBadgeStyle = {
  border: "1px solid",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  background: "#f8fafc",
};

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "#334155",
  lineHeight: 1.5,
  fontSize: 13,
};
