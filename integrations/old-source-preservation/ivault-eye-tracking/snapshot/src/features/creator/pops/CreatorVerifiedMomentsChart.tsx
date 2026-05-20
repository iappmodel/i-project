import type { CreatorVerifiedMomentSeriesPoint } from "./creator-pops.service";

interface CreatorVerifiedMomentsChartProps {
  series: CreatorVerifiedMomentSeriesPoint[];
}

export function CreatorVerifiedMomentsChart({ series }: CreatorVerifiedMomentsChartProps) {
  const maxValue = Math.max(...series.map((item) => item.verifiedMoments), 1);

  return (
    <article style={cardStyle}>
      <h3 style={{ margin: "0 0 8px 0" }}>Verified moments by content</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {series.map((item) => {
          const width = `${Math.round((item.verifiedMoments / maxValue) * 100)}%`;
          return (
            <div key={item.label}>
              <div style={labelRowStyle}>
                <span>{item.label}</span>
                <strong>{item.verifiedMoments}</strong>
              </div>
              <div style={barTrackStyle}>
                <div style={{ ...barFillStyle, width }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

const cardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  background: "#ffffff",
  padding: 12,
};

const labelRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 4,
  fontSize: 13,
  color: "#334155",
};

const barTrackStyle = {
  width: "100%",
  borderRadius: 999,
  background: "#e2e8f0",
  height: 9,
  overflow: "hidden",
};

const barFillStyle = {
  height: "100%",
  background: "linear-gradient(90deg, #3b82f6, #22c55e)",
};
