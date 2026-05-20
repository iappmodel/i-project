export const popsStatusColorMap = {
  DETECTING: {
    foreground: "#67E8F9",
    background: "rgba(34, 211, 238, 0.14)",
    border: "rgba(34, 211, 238, 0.35)",
  },
  PRESENT: {
    foreground: "#86EFAC",
    background: "rgba(34, 197, 94, 0.14)",
    border: "rgba(34, 197, 94, 0.34)",
  },
  ATTENTION_RISING: {
    foreground: "#A3E635",
    background: "rgba(132, 204, 22, 0.16)",
    border: "rgba(132, 204, 22, 0.35)",
  },
  VERIFIED: {
    foreground: "#10B981",
    background: "rgba(16, 185, 129, 0.16)",
    border: "rgba(16, 185, 129, 0.4)",
  },
  PENDING: {
    foreground: "#F59E0B",
    background: "rgba(245, 158, 11, 0.18)",
    border: "rgba(245, 158, 11, 0.4)",
  },
  HELD: {
    foreground: "#F97316",
    background: "rgba(249, 115, 22, 0.18)",
    border: "rgba(249, 115, 22, 0.42)",
  },
  DEGRADED: {
    foreground: "#94A3B8",
    background: "rgba(100, 116, 139, 0.2)",
    border: "rgba(148, 163, 184, 0.36)",
  },
  DENIED: {
    foreground: "#FB7185",
    background: "rgba(244, 63, 94, 0.18)",
    border: "rgba(244, 63, 94, 0.4)",
  },
  FRAUD_INTERNAL: {
    foreground: "#EF4444",
    background: "rgba(239, 68, 68, 0.2)",
    border: "rgba(239, 68, 68, 0.44)",
    adminOnly: true,
  },
} as const;

export type PopsStatusState = keyof typeof popsStatusColorMap;

export const popsSemanticAccents = {
  verified: "#10B981",
  pending: "#F59E0B",
  degraded: "#94A3B8",
  held: "#F97316",
  denied: "#FB7185",
  privacy: "#22D3EE",
  admin: "#A855F7",
  neutral: "#9CA3AF",
} as const;

/**
 * Usage notes:
 * - Use `FRAUD_INTERNAL` only in admin surfaces.
 * - Prefer background+border+foreground triads rather than hard red alert blocks.
 */
