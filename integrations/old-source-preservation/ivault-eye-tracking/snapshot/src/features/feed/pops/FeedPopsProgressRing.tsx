import type { CSSProperties } from "react";
import { popsTokens } from "../../../design/pops/pops-tokens";

type FeedPopsProgressRingProps = {
  progressPct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
};

export function FeedPopsProgressRing({
  progressPct,
  size = 44,
  strokeWidth = 4,
  color = "#2563eb",
  trackColor = "rgba(148, 163, 184, 0.24)",
  label,
}: FeedPopsProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progressPct));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div style={textWrap}>
        <div style={pctStyle}>{Math.round(clamped)}%</div>
        {label ? <div style={labelStyle}>{label}</div> : null}
      </div>
    </div>
  );
}

const textWrap: CSSProperties = {
  display: "grid",
  gap: 2,
};

const pctStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: popsTokens.color.text.primary,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace"
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: popsTokens.color.text.secondary,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace"
};
