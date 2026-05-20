import type { PopsEvent } from "../types/pops-events.types";
import type { PopsSession, PopsSessionAggregate } from "../types/pops.types";
import type { PopsReasonCode } from "../constants/pops-reason-codes";
import { POPS_REASON_CODES } from "../constants/pops-reason-codes";
import { normalizePopsEvents } from "../normalization/pops-event-normalizer";
import type { PopsQualityInputEvent } from "../normalization/pops-event-quality.types";
import { getProgressPayload } from "../events/pops-payload-helpers";
import { clamp01 } from "../scoring/pops-score-utils";
import type { BuildLocalSponsoredWatchAggregateInput } from "./pops-local-aggregate.types";

/** Sanitized event factory (re-exported for callers that bundle aggregate + events). */
export { createPopsEvent } from "../events/pops-event-factory";

function popsEventsToQuality(events: readonly PopsEvent[]): PopsQualityInputEvent[] {
  return events.map((e) => ({
    eventId: e.eventId,
    eventType: e.eventType,
    clientTimestampMs: e.clientTimestampMs,
    payload: e.payload,
  }));
}

function applyEventState(
  eventType: string,
  state: {
    isPaused: boolean;
    isBackgrounded: boolean;
    screenActive: boolean;
    maxProgress: number;
    progressAtBackgroundEnter: number | null;
    progressWhileBackgrounded: boolean;
    tapCount: number;
    scrollCount: number;
    pauseCount: number;
    resumeCount: number;
    appBackgroundCount: number;
    appForegroundCount: number;
    contentCompleted: boolean;
    deviceIntegrityLow: boolean;
    impossibleSpeedSimulated: boolean;
    backgroundFraudSimulated: boolean;
  },
): void {
  switch (eventType) {
    case "SESSION_PAUSED":
      state.isPaused = true;
      state.pauseCount += 1;
      break;
    case "SESSION_RESUMED":
      state.isPaused = false;
      state.resumeCount += 1;
      break;
    case "APP_BACKGROUNDED":
      state.isBackgrounded = true;
      state.appBackgroundCount += 1;
      state.progressAtBackgroundEnter = state.maxProgress;
      break;
    case "APP_FOREGROUNDED":
      state.isBackgrounded = false;
      state.appForegroundCount += 1;
      state.progressAtBackgroundEnter = null;
      break;
    case "SCREEN_ACTIVE":
      state.screenActive = true;
      break;
    case "SCREEN_INACTIVE":
      state.screenActive = false;
      break;
    case "CONTENT_PROGRESS":
      break;
    case "CONTENT_COMPLETED":
      state.contentCompleted = true;
      break;
    case "TOUCH_TAP":
      state.tapCount += 1;
      break;
    case "TOUCH_SCROLL":
      state.scrollCount += 1;
      break;
    case "SIMULATED_DEVICE_WARNING":
      state.deviceIntegrityLow = true;
      break;
    case "SIMULATED_IMPOSSIBLE_SPEED":
      state.impossibleSpeedSimulated = true;
      break;
    case "SIMULATED_BACKGROUND_FRAUD":
      state.backgroundFraudSimulated = true;
      state.progressWhileBackgrounded = true;
      break;
    default:
      break;
  }
}

function accumulateDuration(
  prevTs: number,
  t: number,
  state: { isPaused: boolean; isBackgrounded: boolean; screenActive: boolean },
  buckets: {
    pausedMs: number;
    backgroundMs: number;
    foregroundMs: number;
    screenActiveForegroundMs: number;
  },
): void {
  const dt = Math.max(0, t - prevTs);
  if (dt === 0) return;
  if (state.isPaused) {
    buckets.pausedMs += dt;
    return;
  }
  if (state.isBackgrounded) {
    buckets.backgroundMs += dt;
    return;
  }
  buckets.foregroundMs += dt;
  if (state.screenActive) {
    buckets.screenActiveForegroundMs += dt;
  }
}

/**
 * Deterministic local aggregate: normalizes capture events, then folds them into {@link PopsSessionAggregate}.
 */
export function buildLocalSponsoredWatchAggregate(
  input: BuildLocalSponsoredWatchAggregateInput,
): PopsSessionAggregate {
  const { session, events, referenceNowMs } = input;
  const startMs = Date.parse(session.startedAt);
  const endMs = session.endedAt ? Date.parse(session.endedAt) : referenceNowMs;
  const totalDurationMs = Math.max(0, endMs - startMs);

  const normalized = normalizePopsEvents({
    session,
    events: popsEventsToQuality(events),
    referenceNowMs: endMs,
  });

  const sorted = [...normalized.normalizedEvents].sort((a, b) => {
    const d = a.clientTimestampMs - b.clientTimestampMs;
    if (d !== 0) return d;
    return a.eventId.localeCompare(b.eventId);
  });

  const state = {
    isPaused: false,
    isBackgrounded: false,
    screenActive: true,
    maxProgress: 0,
    progressAtBackgroundEnter: null as number | null,
    progressWhileBackgrounded: false,
    tapCount: 0,
    scrollCount: 0,
    pauseCount: 0,
    resumeCount: 0,
    appBackgroundCount: 0,
    appForegroundCount: 0,
    contentCompleted: false,
    deviceIntegrityLow: false,
    impossibleSpeedSimulated: false,
    backgroundFraudSimulated: false,
  };

  const buckets = {
    pausedMs: 0,
    backgroundMs: 0,
    foregroundMs: 0,
    screenActiveForegroundMs: 0,
  };

  let prevTs = startMs;
  for (const ev of sorted) {
    const t = Math.min(Math.max(ev.clientTimestampMs, startMs), endMs);
    accumulateDuration(prevTs, t, state, buckets);
    prevTs = t;

    if (ev.eventType === "CONTENT_PROGRESS") {
      const pct = getProgressPayload(ev.payload);
      if (state.isBackgrounded) {
        const baseline = state.progressAtBackgroundEnter ?? state.maxProgress;
        if (pct > baseline + 0.01) {
          state.progressWhileBackgrounded = true;
        }
      }
      if (state.progressAtBackgroundEnter !== null && pct > state.progressAtBackgroundEnter + 0.01) {
        state.progressWhileBackgrounded = true;
      }
      state.maxProgress = Math.max(state.maxProgress, pct);
    }

    if (ev.eventType === "pops.session.progress") {
      const p = ev.payload;
      if (p && typeof p === "object") {
        const rec = p as Record<string, unknown>;
        const rp = rec.progressPct;
        if (typeof rp === "number" && Number.isFinite(rp)) {
          const pct100 = rp * 100;
          if (state.isBackgrounded && pct100 > state.maxProgress + 0.01) {
            state.progressWhileBackgrounded = true;
          }
          state.maxProgress = Math.max(state.maxProgress, pct100);
        }
        if (rec.backgroundProgressDetected === true) {
          state.progressWhileBackgrounded = true;
        }
      }
    }

    applyEventState(ev.eventType, state);
  }
  accumulateDuration(prevTs, endMs, state, buckets);

  const foregroundOrBgMs = buckets.foregroundMs + buckets.backgroundMs;
  const appForegroundRatio =
    foregroundOrBgMs > 0 ? Math.max(0, Math.min(1, buckets.foregroundMs / foregroundOrBgMs)) : 1;
  const screenDenom = buckets.foregroundMs > 0 ? buckets.foregroundMs : 1;
  const screenActiveRatio = Math.max(0, Math.min(1, buckets.screenActiveForegroundMs / screenDenom));

  const impliedActiveMs = Math.max(0, totalDurationMs - buckets.pausedMs - buckets.backgroundMs);
  const activeDurationMs = Math.max(buckets.foregroundMs, impliedActiveMs);

  const requiredMs = session.requiredDurationMs;
  const activePlusHalfPause = activeDurationMs + 0.5 * buckets.pausedMs;
  const completionTooFast =
    state.impossibleSpeedSimulated ||
    (state.contentCompleted &&
      state.maxProgress >= session.requiredCompletionPct &&
      activePlusHalfPause < session.requiredDurationMs * 0.8);

  const deviceIntegrityScore = state.deviceIntegrityLow ? 0.35 : 0.95;
  const accountContinuityScore = 0.9;
  const sessionConsistencyScore = clamp01(1 - Math.min(1, state.pauseCount * 0.08 + state.appBackgroundCount * 0.1));

  let reasonCodes: PopsReasonCode[] = [...normalized.warnings];
  if (state.progressWhileBackgrounded) {
    reasonCodes = [...reasonCodes, POPS_REASON_CODES.BACKGROUND_PROGRESS_DETECTED];
  }
  if (completionTooFast) {
    reasonCodes = [...reasonCodes, POPS_REASON_CODES.IMPOSSIBLE_COMPLETION_SPEED];
  }
  if (state.deviceIntegrityLow) {
    reasonCodes = [...reasonCodes, POPS_REASON_CODES.DEVICE_INTEGRITY_SIGNAL_LOW];
  }

  const dedupedReasons: PopsReasonCode[] = [];
  for (const c of reasonCodes) {
    if (!dedupedReasons.includes(c)) dedupedReasons.push(c);
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    totalDurationMs,
    activeDurationMs,
    foregroundDurationMs: buckets.foregroundMs,
    backgroundDurationMs: buckets.backgroundMs,
    pausedDurationMs: buckets.pausedMs,
    contentProgressPct: state.maxProgress,
    contentCompleted: state.contentCompleted,
    pauseCount: state.pauseCount,
    resumeCount: state.resumeCount,
    tapCount: state.tapCount,
    scrollCount: state.scrollCount,
    appBackgroundCount: state.appBackgroundCount,
    appForegroundCount: state.appForegroundCount,
    screenActiveRatio,
    appForegroundRatio,
    progressWhileBackgrounded: state.progressWhileBackgrounded,
    completionTooFast,
    deviceIntegrityScore,
    accountContinuityScore,
    sessionConsistencyScore,
    reasonCodes: dedupedReasons,
  };
}
