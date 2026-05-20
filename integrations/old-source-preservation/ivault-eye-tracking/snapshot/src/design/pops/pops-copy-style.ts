export const popsTypography = {
  metricMono: {
    fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, monospace',
    letterSpacing: "0.01em",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },
  userCopy: {
    fontFamily: '"DM Sans", "Inter", "Segoe UI", sans-serif',
    letterSpacing: "0em",
    fontWeight: 500,
    lineHeight: 1.45,
  },
  verificationTitle: {
    fontFamily: '"Syne", "DM Sans", "Inter", sans-serif',
    letterSpacing: "-0.015em",
    fontWeight: 700,
    lineHeight: 1.15,
  },
  proofLabel: {
    fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, monospace',
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    fontSize: 11,
    fontWeight: 600,
  },
} as const;

export const popsCopyTone = {
  principles: [
    "calm verification language",
    "serious money-system framing",
    "privacy-respecting and non-invasive tone",
    "clear pending and held explanations",
  ],
  avoid: [
    "surveillance-first language",
    "policing or punishment framing",
    "alarmist fraud copy",
    "childish gamification language",
  ],
} as const;

export const popsCopyTemplates = {
  detecting: "Verifying signal quality for this moment.",
  present: "Presence confirmed. Building confidence.",
  attentionRising: "Confidence is rising with stable intent.",
  verified: "Verified moment sealed. Reward path is unlocked.",
  pending: "Value is pending final settlement checks.",
  held: "Value is held for an extra integrity review.",
  degraded: "Signal quality is reduced. Please continue naturally.",
  denied: "This moment could not be verified for reward release.",
} as const;

/**
 * Usage notes:
 * - Keep copy factual and de-escalated.
 * - Use explicit "value pending" language for money states.
 * - Keep internal fraud copy separated from end-user surfaces.
 */
