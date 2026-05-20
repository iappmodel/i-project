import { useMemo, useState } from "react";
import type { StudioController } from "../../studioStore";
import { VerificationGateStack } from "./VerificationGateStack";
import { POPSPanel } from "./POPSPanel";
import { FraudScorePanel } from "./FraudScorePanel";
import { ActionVerificationTimeline } from "./ActionVerificationTimeline";
import { DisputePanel } from "./DisputePanel";
import { TrustImpactPanel } from "./TrustImpactPanel";
import { SettlementHoldPanel } from "./SettlementHoldPanel";
import { RiskMonitorPanel } from "./RiskMonitorPanel";

type Tab = "gates" | "pops" | "fraud" | "disputes" | "trust" | "holds" | "risk";

export function VerificationPanel({ studio }: { studio: StudioController }) {
  const [tab, setTab] = useState<Tab>("gates");
  const latestRecord = studio.state.verificationRecords.at(-1);
  const latestFraud = studio.state.fraudAssessments.at(-1);
  const viewer = studio.state.walletAccounts.find((a) => a.type === "viewer");
  const creator = studio.state.walletAccounts.find((a) => a.type === "creator");
  const postId = studio.state.studioSimPost.postId;

  const failedGates = useMemo(
    () => (latestRecord?.gates ?? []).filter((g) => g.status === "failed" || g.status === "rejected").length,
    [latestRecord]
  );
  const openDisputes = studio.state.disputes.filter((d) => d.status === "open" || d.status === "under_review").length;
  const pendingHolds = studio.state.unlocks.filter((u) => u.settlementStatus === "pending" || u.settlementStatus === "held").length;

  const runVerification = () => studio.actions.completeCampaignActionMock();
  const runFraud = () => studio.actions.completeCampaignActionMock();

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Verification</h3>
      <div className="ist-grid2" style={{ marginBottom: 8 }}>
        <Summary label="Status" value={latestRecord?.status ?? "pending"} />
        <Summary label="Risk" value={latestFraud?.riskLevel ?? "low"} />
        <Summary label="Pending holds" value={String(pendingHolds)} />
        <Summary label="Open disputes" value={String(openDisputes)} />
        <Summary label="Failed gates" value={String(failedGates)} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" className="ist-btn ist-btn--primary" onClick={runVerification}>Run Verification</button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={runFraud}>Run Fraud Assessment</button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.createPopsChallenge("active_tap", studio.state.selectedMagicRevealId)}>Create POPS Challenge</button>
        <button
          type="button"
          className="ist-btn ist-btn--ghost"
          onClick={() =>
            studio.actions.createDispute({
              reason: "reward_not_received",
              reporterAccountId: viewer?.userId ?? "viewer",
              creatorAccountId: creator?.userId,
              postId,
              revealId: studio.state.selectedMagicRevealId,
              statement: "Reward not received (mock dispute).",
            })
          }
        >
          Open Dispute
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.applyTrustImpactMock()}>Apply Trust Impact</button>
      </div>
      <div className="ist-segmented" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        {(["gates", "pops", "fraud", "disputes", "trust", "holds", "risk"] as Tab[]).map((t) => (
          <button key={t} type="button" className={tab === t ? "ist-segmented--active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "gates" ? <VerificationGateStack gates={latestRecord?.gates ?? []} /> : null}
      {tab === "pops" ? <POPSPanel studio={studio} /> : null}
      {tab === "fraud" ? <FraudScorePanel studio={studio} /> : null}
      {tab === "disputes" ? <DisputePanel studio={studio} /> : null}
      {tab === "trust" ? <TrustImpactPanel studio={studio} /> : null}
      {tab === "holds" ? <SettlementHoldPanel studio={studio} /> : null}
      {tab === "risk" ? <RiskMonitorPanel studio={studio} /> : null}
      <div style={{ marginTop: 12 }}>
        <ActionVerificationTimeline studio={studio} />
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="ist-panel" style={{ padding: 8 }}>
      <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>{label}</div>
      <strong style={{ fontSize: 12 }}>{value}</strong>
    </div>
  );
}
