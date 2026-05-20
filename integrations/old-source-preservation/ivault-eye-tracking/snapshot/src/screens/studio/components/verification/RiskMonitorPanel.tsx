import type { StudioController } from "../../studioStore";

export function RiskMonitorPanel({ studio }: { studio: StudioController }) {
  const highRisk = studio.state.fraudAssessments.filter((f) => f.riskLevel === "high" || f.riskLevel === "critical");
  const blocked = studio.state.verificationRecords.filter((v) => v.status === "failed" || v.status === "rejected");
  const openDisputes = studio.state.disputes.filter((d) => d.status === "open" || d.status === "under_review");
  return (
    <div className="ist-grid2">
      <Card title="High risk actions" value={String(highRisk.length)} />
      <Card title="Blocked attempts" value={String(blocked.length)} />
      <Card title="Open disputes" value={String(openDisputes.length)} />
      <Card title="Fraud rejected" value={String(studio.state.events.filter((e) => e.type === "fraud.action_rejected").length)} />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="ist-panel" style={{ padding: 10 }}>
      <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>{title}</div>
      <strong style={{ fontSize: 14 }}>{value}</strong>
    </div>
  );
}
