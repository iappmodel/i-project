import type { CSSProperties } from "react";
import { popsTokens } from "../../../design/pops/pops-tokens";

type FeedPopsRewardBadgeProps = {
  rewardLabel: string;
  pending?: boolean;
  underReview?: boolean;
  disabled?: boolean;
};

export function FeedPopsRewardBadge({
  rewardLabel,
  pending = false,
  underReview = false,
  disabled = false,
}: FeedPopsRewardBadgeProps) {
  const subtitle = underReview ? "Reward under review" : pending ? "Reward pending" : "P.O.P.S verifying moment";
  const tone = underReview ? heldTone : pending ? pendingTone : baseTone;
  return (
    <div
      style={{
        ...badgeStyle,
        ...tone,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={titleStyle}>{rewardLabel}</span>
      <span style={subtitleStyle}>{subtitle}</span>
    </div>
  );
}

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 2,
  border: `1px solid ${popsTokens.color.border.subtle}`,
  borderRadius: popsTokens.radius.md,
  padding: "6px 10px"
};

const titleStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: popsTokens.color.text.primary
};

const subtitleStyle: CSSProperties = {
  fontSize: 11,
  color: popsTokens.color.text.secondary
};

const baseTone: CSSProperties = {
  background: popsTokens.color.surface.elevated
};

const pendingTone: CSSProperties = {
  background: "rgba(245, 158, 11, 0.12)",
  borderColor: "rgba(245, 158, 11, 0.34)"
};

const heldTone: CSSProperties = {
  background: "rgba(249, 115, 22, 0.12)",
  borderColor: "rgba(249, 115, 22, 0.36)"
};
