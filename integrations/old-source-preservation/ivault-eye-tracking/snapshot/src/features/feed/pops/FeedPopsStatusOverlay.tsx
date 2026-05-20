import type { CSSProperties } from "react";
import { popsTokens } from "../../../design/pops/pops-tokens";
import { FeedPopsProgressRing } from "./FeedPopsProgressRing";

type FeedPopsStatusOverlayProps = {
  title: string;
  subtitle: string;
  progressPct: number;
  state: "idle" | "verifying" | "verified" | "degraded" | "held";
};

export function FeedPopsStatusOverlay({ title, subtitle, progressPct, state }: FeedPopsStatusOverlayProps) {
  const ringColor =
    state === "verified"
      ? "#16a34a"
      : state === "degraded" || state === "held"
        ? "#f59e0b"
        : state === "idle"
          ? "#94a3b8"
          : "#22c55e";
  return (
    <div style={{ ...overlayStyle, ...stateTone[state] }}>
      <FeedPopsProgressRing
        progressPct={progressPct}
        label={state === "verified" ? "Verified" : "Verification"}
        color={ringColor}
      />
      <div style={{ display: "grid", gap: 2 }}>
        <div style={titleStyle}>{title}</div>
        <div style={subtitleStyle}>{subtitle}</div>
        {state === "verifying" ? <div style={hintStyle}>Moment confidence rising</div> : null}
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: popsTokens.radius.lg,
  padding: 10,
  border: `1px solid ${popsTokens.color.border.subtle}`
};

const titleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: popsTokens.color.text.primary
};

const subtitleStyle: CSSProperties = {
  fontSize: 12,
  color: popsTokens.color.text.secondary
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: popsTokens.color.text.secondary
};

const stateTone: Record<FeedPopsStatusOverlayProps["state"], CSSProperties> = {
  idle: { background: popsTokens.color.surface.elevated, borderColor: "rgba(148, 163, 184, 0.24)" },
  verifying: { background: "rgba(34, 197, 94, 0.11)", borderColor: "rgba(34, 197, 94, 0.26)" },
  verified: { background: "rgba(16, 185, 129, 0.14)", borderColor: "rgba(16, 185, 129, 0.35)" },
  degraded: { background: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.28)" },
  held: { background: "rgba(245, 158, 11, 0.16)", borderColor: "rgba(245, 158, 11, 0.34)" }
};
