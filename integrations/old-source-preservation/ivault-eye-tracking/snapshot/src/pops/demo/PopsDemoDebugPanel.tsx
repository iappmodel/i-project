import React, { useState } from "react";
import styles from "./PopsSponsoredWatchDemo.module.css";
import type { PopsEvent } from "../types/pops-events.types";
import type { PopsPrivacyReceipt } from "../types/pops-privacy.types";
import type { PopsRewardDecision, PopsWalletRewardIntent } from "../types/pops-decisions.types";
import type { PopsJudgment, PopsSession, PopsSessionAggregate } from "../types/pops.types";

export type PopsDemoDebugPanelProps = {
  session: PopsSession | null;
  events: PopsEvent[];
  aggregate: PopsSessionAggregate | null;
  judgment: PopsJudgment | null;
  rewardDecision: PopsRewardDecision | null;
  walletIntent: PopsWalletRewardIntent | null;
  privacyReceipt: PopsPrivacyReceipt | null;
};

export function PopsDemoDebugPanel(props: PopsDemoDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const {
    session,
    events,
    aggregate,
    judgment,
    rewardDecision,
    walletIntent,
    privacyReceipt,
  } = props;

  return (
    <section className={styles.popsDebugPanel} data-testid="pops-demo-debug-panel">
      <button type="button" className={`${styles.popsButton} ${styles.popsButtonMuted}`} onClick={() => setOpen((o) => !o)}>
        Developer debug {open ? "▲" : "▼"}
      </button>
      {open ? (
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          <div className={styles.popsMuted} style={{ fontSize: 11 }}>
            Internal debug view. User-facing copy should not expose fraud details.
          </div>
          <div>session state: {session?.state ?? "—"}</div>
          <div>event count: {events.length}</div>
          <div>progress %: {aggregate?.contentProgressPct ?? "—"}</div>
          <div>active duration ms: {aggregate?.activeDurationMs ?? "—"}</div>
          <div>background duration ms: {aggregate?.backgroundDurationMs ?? "—"}</div>
          <div>presence: {judgment ? judgment.presenceConfidence.toFixed(3) : "—"}</div>
          <div>attention: {judgment ? judgment.attentionConfidence.toFixed(3) : "—"}</div>
          <div>intent: {judgment ? judgment.intentConfidence.toFixed(3) : "—"}</div>
          <div>continuity: {judgment ? judgment.continuityConfidence.toFixed(3) : "—"}</div>
          <div>fraud risk: {judgment ? judgment.fraudRisk.toFixed(3) : "—"}</div>
          <div>reward eligibility: {judgment?.rewardEligibility ?? "—"}</div>
          <div>decision status: {rewardDecision?.decisionStatus ?? "—"}</div>
          <div>wallet status: {walletIntent?.status ?? "—"}</div>
          <div>reason codes: {(rewardDecision?.reasonCodes ?? judgment?.reasonCodes ?? []).join(", ") || "—"}</div>
          <div>privacy receipt id: {privacyReceipt?.id ?? "—"}</div>
        </div>
      ) : null}
    </section>
  );
}
