import type { StudioController } from "../../studioStore";

export function CampaignOwnerDashboard({ studio }: { studio: StudioController }) {
  const campaignRecs = studio.state.verificationRecords.filter((r) => r.subjectType === "campaign_action");
  const rejected = campaignRecs.filter((r) => r.status === "failed" || r.status === "rejected").length;
  const fraudSignals = studio.state.fraudAssessments
    .filter((f) => f.subjectType === "campaign_action")
    .reduce((n, f) => n + f.signals.length, 0);
  const pops = studio.state.popsChallenges.filter((c) => c.metadata?.campaignId);
  const popsPassed = pops.filter((c) => c.status === "passed").length;

  return (
    <div className="ist-panel" style={{ padding: 10, marginTop: 10 }}>
      <div className="ist-display" style={{ fontSize: 11, marginBottom: 8 }}>
        Campaign risk monitor
      </div>
      <div className="ist-grid2">
        <Stat label="Rejected actions" value={String(rejected)} />
        <Stat label="Fraud signals" value={String(fraudSignals)} />
        <Stat label="Verification records" value={String(campaignRecs.length)} />
        <Stat label="POPS pass/fail" value={`${popsPassed}/${pops.length}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ist-mono" style={{ fontSize: 10 }}>
      <span style={{ color: "var(--ist-muted)" }}>{label}</span>
      <br />
      <strong>{value}</strong>
    </div>
  );
}
