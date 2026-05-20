import { POPS_COMPLETION_LEVEL, type PopsCompletionLevel } from "../rewards/pops-reward-decision.types";
import { POPS_EVENT_TYPE } from "../types/pops-events.types";

export const POPS_MVP_REASON = {
  SIGNALS_AGGREGATED: "signals_aggregated",
  OPTIONAL_VISUAL_MISSING: "optional_visual_absent_no_penalty",
  BACKGROUND_TIME_DETECTED: "background_time_detected",
  INTERRUPTIONS_DETECTED: "interruptions_detected",
  PAUSE_RESUME_NATURAL: "pause_resume_natural",
  LOW_MOTION_STABILITY: "low_motion_stability_degraded",
  LOW_DEVICE_INTEGRITY: "low_device_integrity_degraded",
  IMPOSSIBLE_PROGRESS: "impossible_content_progress",
  CTA_TOO_FAST: "interaction_too_fast",
  SURVEY_IMPOSSIBLE_SPEED: "survey_impossible_speed",
  LATE_EVENTS_ACCEPTED: "late_events_included",
  STRICT_FRAUD_ESCALATION: "strict_fraud_escalation"
} as const;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
}

function avg(batches: Array<{ signals?: Record<string, unknown> }>, key: string): number {
  if (!batches.length) return 0;
  let s = 0;
  for (const b of batches) {
    s += clamp01(Number((b.signals ?? {})[key] ?? 0));
  }
  return s / batches.length;
}

function sum(batches: Array<{ signals?: Record<string, unknown> }>, key: string): number {
  let s = 0;
  for (const b of batches) {
    const v = Number((b.signals ?? {})[key] ?? 0);
    if (Number.isFinite(v)) s += v;
  }
  return s;
}

export interface PopsMvpScoringInput {
  batches: Array<{ signals?: Record<string, unknown>; timestamp_ms?: number }>;
  events: Array<{ event_type: string; timestamp_ms: number; payload?: Record<string, unknown> }>;
  requiredDurationMs: number;
  sessionStartedMs: number;
  enableVisualPresence: boolean;
  strictFraudMode: boolean;
}

export interface PopsMvpScores {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  reasonCodes: string[];
}

/**
 * Deterministic multimodal MVP scoring (no raw media).
 * Visual presence is optional: when disabled, its weight is redistributed to screen/foreground/motion.
 */
export function scorePopsMvpSession(input: PopsMvpScoringInput): PopsMvpScores {
  const { batches, events, requiredDurationMs, sessionStartedMs, enableVisualPresence, strictFraudMode } = input;
  const reasonCodes: string[] = [POPS_MVP_REASON.SIGNALS_AGGREGATED];

  const screen = avg(batches, "screenActiveRatio");
  const foreground = avg(batches, "appForegroundRatio");
  const motion = avg(batches, "motionStabilityScore");
  const integrity = avg(batches, "deviceIntegrityScore");
  const continuity = avg(batches, "accountContinuityScore");
  const visual = enableVisualPresence ? avg(batches, "visualPresenceScore") : 0;
  if (!enableVisualPresence) {
    reasonCodes.push(POPS_MVP_REASON.OPTIONAL_VISUAL_MISSING);
  }

  const wVisual = enableVisualPresence ? 0.2 : 0;
  const wScreen = 0.25 + wVisual * 0.25;
  const wFg = 0.2 + wVisual * 0.15;
  const wMotion = 0.2 + wVisual * 0.2;
  const wCont = 0.2 + wVisual * 0.2;
  const presenceConfidence = clamp01(
    screen * wScreen + foreground * wFg + motion * wMotion + continuity * wCont + visual * wVisual
  );
  if (motion < 0.35 && batches.length > 0) {
    reasonCodes.push(POPS_MVP_REASON.LOW_MOTION_STABILITY);
  }
  if (integrity < 0.4 && batches.length > 0) {
    reasonCodes.push(POPS_MVP_REASON.LOW_DEVICE_INTEGRITY);
  }

  const progressDelta = sum(batches, "contentProgressDeltaPct");
  const taps = sum(batches, "tapCount");
  const scroll = sum(batches, "scrollDistance");
  const interruptionCount = events.filter((e) => e.event_type === POPS_EVENT_TYPE.NOTIFICATION_INTERRUPTION).length;
  const bgCount = events.filter((e) => e.event_type === POPS_EVENT_TYPE.APP_BACKGROUNDED).length;
  const pauseCount = events.filter((e) => e.event_type === POPS_EVENT_TYPE.CONTENT_PAUSED).length;
  const resumeCount = events.filter((e) => e.event_type === POPS_EVENT_TYPE.CONTENT_RESUMED).length;

  if (bgCount > 0) reasonCodes.push(POPS_MVP_REASON.BACKGROUND_TIME_DETECTED);
  if (interruptionCount > 0) reasonCodes.push(POPS_MVP_REASON.INTERRUPTIONS_DETECTED);
  if (pauseCount > 0 && resumeCount > 0) reasonCodes.push(POPS_MVP_REASON.PAUSE_RESUME_NATURAL);

  const interruptionPenalty = clamp01(0.12 * interruptionCount + 0.06 * bgCount);
  const attentionConfidence = clamp01(
    screen * 0.35 + foreground * 0.3 + clamp01(progressDelta / 120) * 0.2 + clamp01(Math.log1p(taps + scroll) / 8) * 0.15 - interruptionPenalty
  );

  const intentConfidence = clamp01(
    clamp01(progressDelta / 100) * 0.45 + clamp01(Math.log1p(taps) / 6) * 0.35 + clamp01(Math.log1p(scroll + 1) / 10) * 0.2
  );

  const continuityConfidence = clamp01(integrity * 0.55 + continuity * 0.45);

  let fraudRisk = clamp01((1 - integrity) * 0.45 + interruptionPenalty * 0.25 + (1 - motion) * 0.15 + (1 - foreground) * 0.15);

  const sortedTs = events.map((e) => e.timestamp_ms).sort((a, b) => a - b);
  const firstTs = sortedTs[0] ?? sessionStartedMs;
  const lastTs = sortedTs[sortedTs.length - 1] ?? sessionStartedMs;
  const spanMs = Math.max(0, lastTs - firstTs);
  const surveyAnswers = events.filter((e) => e.event_type === POPS_EVENT_TYPE.REWARD_CHECKPOINT).length;
  if (progressDelta >= 95 && spanMs < 2_000 && batches.length > 0) {
    fraudRisk = clamp01(fraudRisk + 0.35);
    reasonCodes.push(POPS_MVP_REASON.IMPOSSIBLE_PROGRESS);
  }
  if (taps >= 6 && spanMs < 800) {
    fraudRisk = clamp01(fraudRisk + 0.22);
    reasonCodes.push(POPS_MVP_REASON.CTA_TOO_FAST);
  }
  if (surveyAnswers >= 8 && spanMs < 3_000) {
    fraudRisk = clamp01(fraudRisk + 0.28);
    reasonCodes.push(POPS_MVP_REASON.SURVEY_IMPOSSIBLE_SPEED);
  }

  if (strictFraudMode) {
    fraudRisk = clamp01(fraudRisk + 0.08);
    reasonCodes.push(POPS_MVP_REASON.STRICT_FRAUD_ESCALATION);
  }

  if (requiredDurationMs > 0 && spanMs > 0 && spanMs < requiredDurationMs * 0.2 && progressDelta > 80) {
    fraudRisk = clamp01(fraudRisk + 0.15);
    reasonCodes.push(POPS_MVP_REASON.IMPOSSIBLE_PROGRESS);
  }

  return {
    presenceConfidence,
    attentionConfidence,
    intentConfidence,
    continuityConfidence,
    fraudRisk,
    reasonCodes
  };
}

export function completionLevelFromTiming(params: {
  observedDurationMs: number;
  requiredDurationMs: number;
}): PopsCompletionLevel {
  const { observedDurationMs, requiredDurationMs } = params;
  if (requiredDurationMs <= 0) return POPS_COMPLETION_LEVEL.COMPLETED_REQUIRED;
  const ratio = observedDurationMs / requiredDurationMs;
  if (ratio >= 1) return POPS_COMPLETION_LEVEL.COMPLETED_REQUIRED;
  if (ratio >= 0.75) return POPS_COMPLETION_LEVEL.MOSTLY_COMPLETED;
  if (ratio >= 0.35) return POPS_COMPLETION_LEVEL.PARTIALLY_COMPLETED;
  return POPS_COMPLETION_LEVEL.NOT_COMPLETED;
}
