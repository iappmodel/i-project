import React from "react";
import type { PopsRewardDecision, PopsWalletRewardIntent } from "../types/pops-decisions.types";
import type { PopsJudgment } from "../types/pops.types";
import { getPopsResultCopy } from "../copy/pops-result-copy";

export type PopsMomentVerifiedProps = {
  judgment?: PopsJudgment | null;
  rewardDecision: PopsRewardDecision | null;
  walletIntent: PopsWalletRewardIntent | null;
};

export function PopsMomentVerified({ judgment, rewardDecision, walletIntent }: PopsMomentVerifiedProps) {
  if (!rewardDecision) return null;

  const { title, body, tone } = getPopsResultCopy({ judgment, rewardDecision, walletIntent });

  const border =
    tone === "success"
      ? "1px solid rgba(34,197,94,0.45)"
      : tone === "pending"
        ? "1px solid rgba(251,191,36,0.45)"
        : tone === "held"
          ? "1px solid rgba(245,158,11,0.45)"
          : tone === "denied"
            ? "1px solid rgba(251,113,133,0.45)"
            : "1px solid rgba(148,163,184,0.35)";

  return (
    <article
      data-testid="pops-moment-verified"
      style={{
        border,
        borderRadius: 12,
        padding: 14,
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#94a3b8" }}>{body}</p>
      <div style={{ marginTop: 12, fontSize: 13, color: "#cbd5e1" }}>
        <strong style={{ color: "#86efac" }}>{rewardDecision.finalAmount}</strong> {rewardDecision.coinType}
      </div>
      {walletIntent ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
          Wallet intent: {walletIntent.status}
          {walletIntent.releaseEligibleAt ? ` · release eligible ${walletIntent.releaseEligibleAt}` : ""}
        </div>
      ) : null}
    </article>
  );
}
