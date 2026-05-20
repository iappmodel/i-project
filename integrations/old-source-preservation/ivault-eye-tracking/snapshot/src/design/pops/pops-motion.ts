export const popsMotionDuration = {
  instant: 0,
  fast: 140,
  base: 220,
  slow: 420,
  pulseSlow: 2400,
  shimmer: 1700,
  sealPop: 280,
} as const;

export const popsMotionEasing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  softExit: "cubic-bezier(0.4, 0, 1, 1)",
  pop: "cubic-bezier(0.16, 1, 0.3, 1)",
  linear: "linear",
} as const;

export const popsMotion = {
  detectingPulse: {
    keyframes: [
      { transform: "scale(0.96)", opacity: 0.7 },
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(0.96)", opacity: 0.7 },
    ],
    durationMs: popsMotionDuration.pulseSlow,
    easing: popsMotionEasing.standard,
    iterationCount: "infinite" as const,
  },
  confidenceRingFill: {
    keyframes: [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }],
    durationMs: popsMotionDuration.slow,
    easing: popsMotionEasing.standard,
    iterationCount: 1 as const,
    fillMode: "forwards" as const,
  },
  verifiedSealPop: {
    keyframes: [
      { transform: "scale(0.86)", opacity: 0.6 },
      { transform: "scale(1.06)", opacity: 1 },
      { transform: "scale(1)", opacity: 1 },
    ],
    durationMs: popsMotionDuration.sealPop,
    easing: popsMotionEasing.pop,
    iterationCount: 1 as const,
    fillMode: "forwards" as const,
  },
  pendingShimmer: {
    keyframes: [
      { backgroundPosition: "-100% 0", opacity: 0.32 },
      { backgroundPosition: "100% 0", opacity: 0.5 },
      { backgroundPosition: "160% 0", opacity: 0.32 },
    ],
    durationMs: popsMotionDuration.shimmer,
    easing: popsMotionEasing.linear,
    iterationCount: "infinite" as const,
  },
} as const;

export function shouldReducePopsMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resolvePopsMotionDuration(durationMs: number): number {
  return shouldReducePopsMotion() ? popsMotionDuration.instant : durationMs;
}

/**
 * Usage notes:
 * - Never use aggressive flashing for state changes.
 * - Keep motion informative: pulse for detecting, ring fill for confidence, seal pop for verified.
 * - Always route duration through `resolvePopsMotionDuration`.
 */
