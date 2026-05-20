import type { PopsReasonCode } from "../constants/pops-reason-codes";

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function capScore(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max)) return 0;
  return Math.min(clamp01(value), max);
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
}

export function scoreDuration(activeDurationMs: number, requiredDurationMs: number): number {
  if (requiredDurationMs <= 0) return activeDurationMs > 0 ? 1 : 0;
  const ratio = activeDurationMs / requiredDurationMs;
  if (ratio >= 1) return 1;
  if (ratio >= 0.75) return 0.75;
  if (ratio >= 0.5) return 0.5;
  if (activeDurationMs > 0) return 0.25;
  return 0;
}

export function scoreCompletion(progressPct: number, requiredCompletionPct: number): number {
  if (requiredCompletionPct <= 0) return clamp01(progressPct / 100);
  return clamp01(safeDivide(progressPct, requiredCompletionPct, 0));
}

export function hasReason(reasonCodes: readonly PopsReasonCode[], code: PopsReasonCode): boolean {
  return reasonCodes.includes(code);
}

export function addReason(reasonCodes: readonly PopsReasonCode[], code: PopsReasonCode): PopsReasonCode[] {
  if (reasonCodes.includes(code)) return [...reasonCodes];
  return [...reasonCodes, code];
}
