import React from "react";

type PopsHeldRewardCardProps = {
  reasonLabel?: string;
};

export function PopsHeldRewardCard({ reasonLabel }: PopsHeldRewardCardProps) {
  return (
    <article
      data-testid="pops-held-reward-card"
      style={{
        border: "1px solid #FDE68A",
        borderRadius: 10,
        padding: 12,
        background: "#FFFBEB",
      }}
    >
      <div style={{ fontWeight: 600, color: "#92400E", marginBottom: 4 }}>Reward under review.</div>
      <div style={{ fontSize: 12, color: "#78350F" }}>
        {reasonLabel ? `Reason: ${reasonLabel}` : "Your moment is being reviewed before reward release."}
      </div>
    </article>
  );
}
