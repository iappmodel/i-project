import React from "react";
import type { PopsExpectedReward } from "../types/pops.types";

export type PopsRewardProgressProps = {
  progressPct: number;
  /** Live preview gate (min of content/duration/confidence); UI-only while session active. */
  rewardGatePct?: number;
  expectedReward: PopsExpectedReward;
  presenceConfidence?: number;
  attentionConfidence?: number;
  fraudRisk?: number;
  status: string;
};

export function PopsRewardProgress({
  progressPct,
  rewardGatePct,
  expectedReward,
  presenceConfidence,
  attentionConfidence,
  fraudRisk,
  status,
}: PopsRewardProgressProps) {
  const barPct = rewardGatePct !== undefined ? rewardGatePct : progressPct;
  const clamped = Math.max(0, Math.min(100, barPct));
  const headline = clamped >= 100 ? "Reward pending after verification" : "P.O.P.S verifying moment";
  return (
    <section data-testid="pops-reward-progress" style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>
        {expectedReward.amount} {expectedReward.coinType}
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "#1e293b", overflow: "hidden" }}>
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: "linear-gradient(90deg,#22c55e,#4ade80)",
            transition: "width 180ms ease",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>{headline}</div>
      <div style={{ fontSize: 12, color: "#cbd5e1" }}>{status}</div>
      {(presenceConfidence !== undefined ||
        attentionConfidence !== undefined ||
        fraudRisk !== undefined) && (
        <div
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 11,
            color: "#64748b",
            display: "grid",
            gap: 4,
          }}
        >
          {presenceConfidence !== undefined ? (
            <span>presence {presenceConfidence.toFixed(2)}</span>
          ) : null}
          {attentionConfidence !== undefined ? (
            <span>attention {attentionConfidence.toFixed(2)}</span>
          ) : null}
          {fraudRisk !== undefined ? <span>risk {fraudRisk.toFixed(2)}</span> : null}
        </div>
      )}
    </section>
  );
}
