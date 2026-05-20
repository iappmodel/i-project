import { CreatorPresenceQualityCard } from "./CreatorPresenceQualityCard";
import { CreatorRewardQualityBreakdown } from "./CreatorRewardQualityBreakdown";
import { CreatorVerifiedMomentsChart } from "./CreatorVerifiedMomentsChart";
import { getCreatorPopsAnalyticsMock } from "./creator-pops.service";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function CreatorPopsAnalytics() {
  const analytics = getCreatorPopsAnalyticsMock();

  return (
    <main style={pageStyle}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ marginBottom: 6 }}>Creator P.O.P.S analytics</h1>
        <p style={subtitleStyle}>
          Aggregate verified presence intelligence for creators. No private user-level sensor, biometric, or fraud
          signature data is exposed.
        </p>
      </header>

      <section style={copyGridStyle}>
        <InfoCard title="Verified moments" body="Human sessions P.O.P.S confirmed as real enough to count." />
        <InfoCard title="Attention quality" body="How strongly viewers stayed present with your content." />
        <InfoCard title="Intent quality" body="How deliberate viewer actions were after consuming your content." />
        <InfoCard title="Reward approval rate" body="The percentage of reward moments that passed verification." />
        <InfoCard title="Held reward rate" body="Moments requiring extra review before rewards release." />
      </section>

      <section style={metricGridStyle}>
        <MetricCard label="Verified moments" value={String(analytics.verifiedMoments)} />
        <MetricCard label="Verified watch time" value={formatHours(analytics.verifiedWatchTimeSeconds)} />
        <MetricCard label="Average moment confidence" value={percent(analytics.averageMomentConfidence)} />
        <MetricCard label="Attention quality score" value={percent(analytics.attentionQualityScore)} />
        <MetricCard label="Intent action score" value={percent(analytics.intentActionScore)} />
        <MetricCard label="Save/follow intent quality" value={percent(analytics.saveFollowIntentQuality)} />
        <MetricCard label="Reward approval rate" value={percent(analytics.rewardApprovalRate)} />
        <MetricCard label="Reward hold rate" value={percent(analytics.rewardHoldRate)} />
        <MetricCard label="Content completion rate" value={percent(analytics.contentCompletionRate)} />
        <MetricCard label="Replay/rewatch quality" value={percent(analytics.replayRewatchQuality)} />
        <MetricCard label="Suspicious traffic rate" value={percent(analytics.suspiciousTrafficRate)} />
        <MetricCard
          label="Trust-adjusted engagement quality"
          value={percent(analytics.trustAdjustedEngagementQuality)}
        />
      </section>

      <section style={detailsGridStyle}>
        <CreatorPresenceQualityCard
          creatorPresenceQuality={analytics.creatorPresenceQuality}
          qualityTier={analytics.qualityTier}
          formulaBreakdown={analytics.qualityFormulaBreakdown}
        />
        <CreatorVerifiedMomentsChart series={analytics.verifiedMomentsByContent} />
        <CreatorRewardQualityBreakdown breakdown={analytics.rewardQualityBreakdown} />
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 20 }}>{value}</div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <article style={infoCardStyle}>
      <h3 style={{ margin: "0 0 4px 0", fontSize: 15 }}>{title}</h3>
      <p style={{ margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.4 }}>{body}</p>
    </article>
  );
}

const pageStyle = {
  margin: "0 auto",
  maxWidth: 1240,
  padding: 16,
  fontFamily: "system-ui, sans-serif",
  color: "#0f172a",
};

const subtitleStyle = {
  margin: 0,
  color: "#475569",
  maxWidth: 900,
};

const copyGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
  marginBottom: 12,
};

const infoCardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  padding: 10,
  background: "#f8fafc",
};

const metricGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
  marginBottom: 12,
};

const metricCardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  background: "#ffffff",
  padding: 12,
};

const detailsGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(3, minmax(260px, 1fr))",
};
