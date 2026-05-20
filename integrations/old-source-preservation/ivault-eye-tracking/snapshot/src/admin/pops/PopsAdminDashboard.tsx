import type { ReactNode } from "react";
import { PopsFraudSignalsPanel } from "./PopsFraudSignalsPanel";
import { PopsPrivacyReceiptViewer } from "./PopsPrivacyReceiptViewer";
import { PopsRewardReviewQueue } from "./PopsRewardReviewQueue";
import { PopsTrustImpactPanel } from "./PopsTrustImpactPanel";
import { PopsTrustAiAnalyst } from "./trust-ai-analyst/PopsTrustAiAnalyst";
import { PopsTrustCommandCenter } from "./trust-command-center/PopsTrustCommandCenter";
import { PopsTrustAlerts } from "./trust-alerts/PopsTrustAlerts";
import {
  popsDashboardMetrics,
  popsTopCampaignsByHoldRate,
  popsTopDevicesBySuspiciousSessions,
  popsTopReasonCodes,
} from "./popsAdminMockData";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PopsAdminDashboard() {
  return (
    <main style={pageStyle}>
      <header>
        <h1 style={{ marginBottom: 6 }}>P.O.P.S Admin Review Console</h1>
        <p style={{ marginTop: 0, color: "#475569" }}>
          Internal operations dashboard for session review, reward holds, suspicious patterns, privacy receipts, and trust
          impacts.
        </p>
      </header>

      <section style={metricGridStyle}>
        <MetricCard label="Total sessions today" value={String(popsDashboardMetrics.totalSessionsToday)} />
        <MetricCard label="Verified moments" value={String(popsDashboardMetrics.verifiedMoments)} />
        <MetricCard label="Rewards approved" value={String(popsDashboardMetrics.rewardsApproved)} />
        <MetricCard label="Rewards held" value={String(popsDashboardMetrics.rewardsHeld)} />
        <MetricCard label="Rewards denied" value={String(popsDashboardMetrics.rewardsDenied)} />
        <MetricCard label="Avg presence confidence" value={percent(popsDashboardMetrics.averagePresenceConfidence)} />
        <MetricCard label="Avg attention confidence" value={percent(popsDashboardMetrics.averageAttentionConfidence)} />
        <MetricCard label="Avg fraud risk" value={percent(popsDashboardMetrics.averageFraudRisk)} />
        <MetricCard label="Manual review backlog" value={String(popsDashboardMetrics.manualReviewBacklog)} />
      </section>

      <section style={splitGridStyle}>
        <Card title="Top reason codes">
          <ul style={listStyle}>
            {popsTopReasonCodes.map((item) => (
              <li key={item.code}>
                {item.code}: <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Top campaigns by hold rate">
          <ul style={listStyle}>
            {popsTopCampaignsByHoldRate.map((item) => (
              <li key={item.campaignId}>
                {item.campaignName}: <strong>{Math.round(item.holdRate * 100)}%</strong> ({item.heldSessions}/
                {item.totalSessions})
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Top devices by suspicious sessions">
          <ul style={listStyle}>
            {popsTopDevicesBySuspiciousSessions.map((item) => (
              <li key={item.deviceId}>
                {item.deviceId}: <strong>{item.suspiciousSessions}</strong> suspicious sessions ({item.uniqueUsers} users)
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section style={sectionStackStyle}>
        <PopsRewardReviewQueue />
        <PopsFraudSignalsPanel />
        <PopsTrustImpactPanel />
        <PopsTrustCommandCenter />
        <PopsTrustAlerts />
        <PopsTrustAiAnalyst />
        <PopsPrivacyReceiptViewer />
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

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article style={cardStyle}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h3>
      {children}
    </article>
  );
}

const pageStyle = {
  margin: "0 auto",
  maxWidth: 1200,
  padding: 16,
  fontFamily: "system-ui, sans-serif",
  color: "#0f172a",
};

const metricGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
  marginBottom: 14,
};

const metricCardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  background: "#f8fafc",
  padding: 12,
};

const splitGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(3, minmax(240px, 1fr))",
  marginBottom: 14,
};

const cardStyle = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  background: "#ffffff",
  padding: 12,
};

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  lineHeight: 1.5,
};

const sectionStackStyle = {
  display: "grid",
  gap: 12,
};
