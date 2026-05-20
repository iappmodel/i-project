export const popsTokens = {
  color: {
    surface: {
      base: "#0F172A",
      elevated: "#111827",
      muted: "#1F2937",
    },
    text: {
      primary: "#E5E7EB",
      secondary: "#9CA3AF",
      muted: "#6B7280",
    },
    border: {
      subtle: "rgba(148, 163, 184, 0.24)",
      strong: "rgba(148, 163, 184, 0.4)",
    },
    signal: {
      membrane: "#67E8F9",
      pulse: "#22D3EE",
      ring: "#34D399",
      receipt: "#14B8A6",
      seal: "#10B981",
      pendingValue: "#F59E0B",
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
  },
  shadow: {
    membrane: "0 0 0 1px rgba(103, 232, 249, 0.2), 0 8px 24px rgba(6, 182, 212, 0.14)",
    seal: "0 6px 18px rgba(16, 185, 129, 0.24)",
    receipt: "0 10px 28px rgba(15, 23, 42, 0.35)",
  },
  opacity: {
    disabled: 0.4,
    subdued: 0.72,
    active: 1,
  },
} as const;

export type PopsTokenMap = typeof popsTokens;

/**
 * Usage notes:
 * - Keep verification visuals calm: membrane, pulse, ring, signal, receipt.
 * - Avoid surveillance or enforcement aesthetics in all UI states.
 * - Use subtle contrast shifts instead of aggressive warning visuals.
 */
export const popsComponentTokens = {
  PopsStatusDot: {
    size: 10,
    radius: popsTokens.radius.pill,
  },
  PopsConfidenceRing: {
    size: 44,
    strokeWidth: 4,
    trackColor: "rgba(148, 163, 184, 0.2)",
  },
  PopsReceiptCard: {
    radius: popsTokens.radius.lg,
    padding: popsTokens.spacing.lg,
    shadow: popsTokens.shadow.receipt,
  },
  PopsProofBadge: {
    height: 24,
    horizontalPadding: popsTokens.spacing.md,
    radius: popsTokens.radius.pill,
    borderColor: popsTokens.border.subtle,
  },
  PopsSignalRow: {
    minHeight: 40,
    gap: popsTokens.spacing.sm,
    radius: popsTokens.radius.md,
  },
  PopsRewardSeal: {
    size: 48,
    radius: popsTokens.radius.pill,
    shadow: popsTokens.shadow.seal,
  },
  PopsPendingStrip: {
    height: 6,
    radius: popsTokens.radius.pill,
    shimmerOpacity: 0.28,
  },
} as const;
