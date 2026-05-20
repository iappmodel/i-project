import { useState } from "react";
import type { StudioController } from "../../studioStore";
import type { DisputeReason } from "../../verification/studioVerificationTypes";

const reasons: DisputeReason[] = [
  "misleading_reveal",
  "empty_reveal",
  "reward_not_received",
  "campaign_action_rejected",
  "payment_issue",
  "fraud",
  "other",
];

export function DisputePanel({ studio }: { studio: StudioController }) {
  const [reason, setReason] = useState<DisputeReason>("misleading_reveal");
  const [statement, setStatement] = useState("Viewer dispute (mock).");
  const selected = studio.state.disputes.find((d) => d.id === studio.state.selectedDisputeId) ?? studio.state.disputes.at(-1);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="ist-panel" style={{ padding: 10 }}>
        <div className="ist-label">Create dispute</div>
        <div style={{ display: "grid", gap: 6 }}>
          <select className="ist-select" value={reason} onChange={(e) => setReason(e.target.value as DisputeReason)}>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="ist-input" value={statement} onChange={(e) => setStatement(e.target.value)} />
          <button
            type="button"
            className="ist-btn ist-btn--primary"
            onClick={() =>
              studio.actions.createDispute({
                reason,
                statement,
                reporterAccountId: studio.state.walletAccounts.find((a) => a.type === "viewer")?.userId ?? "viewer",
                creatorAccountId: studio.state.walletAccounts.find((a) => a.type === "creator")?.userId,
                revealId: studio.state.selectedMagicRevealId,
                postId: studio.state.studioSimPost.postId,
              })
            }
          >
            Open Dispute
          </button>
        </div>
      </div>
      {selected ? (
        <div className="ist-panel" style={{ padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong style={{ fontSize: 11 }}>{selected.reason}</strong>
            <span className="ist-mono" style={{ fontSize: 10 }}>{selected.status}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.collectDisputeEvidence(selected.id)}>Collect evidence</button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.resolveDispute(selected.id, "viewer_wins")}>Viewer wins / refund</button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.resolveDispute(selected.id, "creator_wins")}>Creator wins</button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.resolveDispute(selected.id, "rejected")}>Reject</button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => studio.actions.resolveDispute(selected.id, "escalated")}>Escalate</button>
          </div>
          <div className="ist-mono" style={{ fontSize: 10, marginTop: 8 }}>
            Evidence: {selected.evidence.length} · Ledger refs: {selected.ledgerEntryIds.length}
          </div>
        </div>
      ) : null}
    </div>
  );
}
