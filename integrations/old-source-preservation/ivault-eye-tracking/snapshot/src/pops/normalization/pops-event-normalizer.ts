import { POPS_REASON_CODES, type PopsReasonCode } from "../constants/pops-reason-codes";
import type { PopsSession } from "../types/pops.types";
import { POPS_EVENT_DROP_REASONS, type PopsEventDropReason } from "./pops-event-quality-reason-codes";
import type {
  NormalizePopsEventsInput,
  NormalizePopsEventsOutput,
  PopsDroppedEvent,
  PopsQualityInputEvent,
} from "./pops-event-quality.types";

const KNOWN_EVENT_TYPES = new Set<string>([
  "pops.session.started",
  "pops.session.paused",
  "pops.session.resumed",
  "pops.session.backgrounded",
  "pops.session.progress",
  "pops.session.completed",
  "SESSION_STARTED",
  "SESSION_PAUSED",
  "SESSION_RESUMED",
  "SESSION_COMPLETED",
  "APP_BACKGROUNDED",
  "APP_FOREGROUNDED",
  "SCREEN_ACTIVE",
  "SCREEN_INACTIVE",
  "CONTENT_STARTED",
  "CONTENT_PROGRESS",
  "CONTENT_PAUSED",
  "CONTENT_RESUMED",
  "CONTENT_COMPLETED",
  "TOUCH_TAP",
  "TOUCH_SCROLL",
  "SIMULATED_BACKGROUND_FRAUD",
  "SIMULATED_DEVICE_WARNING",
  "SIMULATED_IMPOSSIBLE_SPEED",
]);

const CLIENT_SCORE_KEYS = new Set([
  "presenceConfidence",
  "attentionConfidence",
  "fraudRisk",
  "rewardEligibility",
]);

const BURST_WINDOW_MS = 100;
const BURST_THRESHOLD = 12;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function iso(ts: number): string {
  return new Date(ts).toISOString();
}

function stripClientScores(payload: Record<string, unknown> | undefined): {
  next: Record<string, unknown> | undefined;
  removed: boolean;
} {
  if (!payload) return { next: undefined, removed: false };
  let removed = false;
  const next: Record<string, unknown> = { ...payload };
  for (const k of CLIENT_SCORE_KEYS) {
    if (k in next) {
      delete next[k];
      removed = true;
    }
  }
  return { next: Object.keys(next).length ? next : undefined, removed };
}

function drop(
  out: PopsDroppedEvent[],
  eventId: string,
  eventType: string,
  reason: PopsEventDropReason,
  ts: number,
): void {
  out.push({ eventId, eventType, reason, createdAt: iso(ts) });
}

function sessionStartMs(session: NormalizePopsEventsInput["session"]): number {
  return Date.parse(session.startedAt);
}

function sessionEndMs(session: NormalizePopsEventsInput["session"]): number | undefined {
  if (!session.endedAt) return undefined;
  const t = Date.parse(session.endedAt);
  return Number.isFinite(t) ? t : undefined;
}

export function normalizePopsEvents(input: NormalizePopsEventsInput): NormalizePopsEventsOutput {
  const { session, events } = input;
  const referenceNowMs = input.referenceNowMs ?? 0;
  const useNow = referenceNowMs > 0;
  const startedAtMs = sessionStartMs(session);
  const endedAtMs = sessionEndMs(session);

  const droppedEvents: PopsDroppedEvent[] = [];
  const warnings: PopsReasonCode[] = [];

  let duplicateCount = 0;
  let invalidPayloadCount = 0;
  let sequenceInvalid = false;
  let timestampDriftSevere = false;

  const sorted = [...events].sort((a, b) => {
    const dt = a.clientTimestampMs - b.clientTimestampMs;
    if (dt !== 0) return dt;
    return a.eventId.localeCompare(b.eventId);
  });

  const seenIds = new Set<string>();
  const working: PopsQualityInputEvent[] = [];

  for (const ev of sorted) {
    if (!Number.isFinite(ev.clientTimestampMs)) {
      invalidPayloadCount++;
      drop(droppedEvents, ev.eventId, ev.eventType, POPS_EVENT_DROP_REASONS.INVALID_TIMESTAMP, ev.clientTimestampMs);
      timestampDriftSevere = true;
      warnings.push(POPS_REASON_CODES.INVALID_EVENT_DROPPED);
      continue;
    }

    if (seenIds.has(ev.eventId)) {
      duplicateCount++;
      drop(droppedEvents, ev.eventId, ev.eventType, POPS_EVENT_DROP_REASONS.DUPLICATE_EVENT_ID, ev.clientTimestampMs);
      warnings.push(POPS_REASON_CODES.DUPLICATE_EVENT_DROPPED);
      continue;
    }
    seenIds.add(ev.eventId);

    if (!KNOWN_EVENT_TYPES.has(ev.eventType)) {
      invalidPayloadCount++;
      drop(droppedEvents, ev.eventId, ev.eventType, POPS_EVENT_DROP_REASONS.UNKNOWN_EVENT_TYPE, ev.clientTimestampMs);
      warnings.push(POPS_REASON_CODES.INVALID_EVENT_DROPPED);
      continue;
    }

    const lowerBound = startedAtMs - 5000;
    if (ev.clientTimestampMs < lowerBound) {
      timestampDriftSevere = true;
      drop(
        droppedEvents,
        ev.eventId,
        ev.eventType,
        POPS_EVENT_DROP_REASONS.EVENT_BEFORE_SESSION_START,
        ev.clientTimestampMs,
      );
      warnings.push(POPS_REASON_CODES.INVALID_EVENT_DROPPED);
      continue;
    }

    if (endedAtMs !== undefined) {
      const upperBound = endedAtMs + 60_000;
      if (ev.clientTimestampMs > upperBound) {
        timestampDriftSevere = true;
        drop(
          droppedEvents,
          ev.eventId,
          ev.eventType,
          POPS_EVENT_DROP_REASONS.EVENT_AFTER_SESSION_END,
          ev.clientTimestampMs,
        );
        warnings.push(POPS_REASON_CODES.INVALID_EVENT_DROPPED);
        continue;
      }
    } else if (useNow) {
      const upperBound = referenceNowMs + 60_000;
      if (ev.clientTimestampMs > upperBound) {
        timestampDriftSevere = true;
        drop(
          droppedEvents,
          ev.eventId,
          ev.eventType,
          POPS_EVENT_DROP_REASONS.EVENT_AFTER_SESSION_END,
          ev.clientTimestampMs,
        );
        warnings.push(POPS_REASON_CODES.INVALID_EVENT_DROPPED);
        continue;
      }
    }

    let payload = ev.payload;
    if (payload !== undefined && (typeof payload !== "object" || Array.isArray(payload))) {
      invalidPayloadCount++;
      drop(droppedEvents, ev.eventId, ev.eventType, POPS_EVENT_DROP_REASONS.INVALID_PAYLOAD_SHAPE, ev.clientTimestampMs);
      warnings.push(POPS_REASON_CODES.INVALID_EVENT_DROPPED);
      continue;
    }

    const stripped = stripClientScores(payload as Record<string, unknown> | undefined);
    if (stripped.removed) {
      warnings.push(POPS_REASON_CODES.CLIENT_SCORE_FIELD_REMOVED);
    }
    payload = stripped.next;

    if (ev.eventType === "CONTENT_PROGRESS") {
      const pl = payload as { contentProgressPct?: unknown } | undefined;
      if (pl === undefined || typeof pl.contentProgressPct !== "number" || !Number.isFinite(pl.contentProgressPct)) {
        invalidPayloadCount++;
        drop(
          droppedEvents,
          ev.eventId,
          ev.eventType,
          POPS_EVENT_DROP_REASONS.MISSING_REQUIRED_PAYLOAD,
          ev.clientTimestampMs,
        );
        warnings.push(POPS_REASON_CODES.INVALID_EVENT_DROPPED);
        continue;
      }
      const pct = pl.contentProgressPct as number;
      const clamped = Math.max(0, Math.min(100, pct));
      if (clamped !== pct) {
        warnings.push(POPS_REASON_CODES.EVENT_NORMALIZED);
      }
      working.push({
        ...ev,
        payload: { ...pl, contentProgressPct: clamped },
      });
      continue;
    }

    working.push({ ...ev, payload });
  }

  let startedSeen = false;
  let completedBeforeStart = false;
  const orderScan = [...working].sort((a, b) => a.clientTimestampMs - b.clientTimestampMs || a.eventId.localeCompare(b.eventId));
  for (const e of orderScan) {
    if (e.eventType === "CONTENT_STARTED") startedSeen = true;
    if (e.eventType === "CONTENT_COMPLETED" && !startedSeen) {
      completedBeforeStart = true;
      break;
    }
  }
  if (completedBeforeStart) {
    sequenceInvalid = true;
  }

  let maxProg = -Infinity;
  const monotonic: PopsQualityInputEvent[] = [];
  for (const e of working) {
    if (e.eventType === "CONTENT_PROGRESS" && e.payload && typeof (e.payload as { contentProgressPct?: number }).contentProgressPct === "number") {
      const raw = (e.payload as { contentProgressPct: number }).contentProgressPct;
      if (raw < maxProg) {
        warnings.push(POPS_REASON_CODES.EVENT_NORMALIZED);
        monotonic.push({
          ...e,
          payload: { ...e.payload, contentProgressPct: maxProg },
        });
      } else {
        maxProg = raw;
        monotonic.push(e);
      }
    } else {
      monotonic.push(e);
    }
  }

  const byTime = [...monotonic].sort((a, b) => a.clientTimestampMs - b.clientTimestampMs || a.eventId.localeCompare(b.eventId));
  let burst = false;
  for (let i = 0; i < byTime.length; i++) {
    let j = i;
    while (j < byTime.length && byTime[j].clientTimestampMs - byTime[i].clientTimestampMs <= BURST_WINDOW_MS) {
      j++;
    }
    const count = j - i;
    if (count >= BURST_THRESHOLD) {
      burst = true;
      break;
    }
  }
  if (burst) {
    if (!warnings.includes(POPS_REASON_CODES.SENSOR_QUALITY_LOW)) {
      warnings.push(POPS_REASON_CODES.SENSOR_QUALITY_LOW);
    }
    warnings.push(POPS_REASON_CODES.EVENT_BURST_DETECTED);
  }

  const normalizedEvents = [...byTime].sort((a, b) => a.clientTimestampMs - b.clientTimestampMs || a.eventId.localeCompare(b.eventId));

  if (sequenceInvalid && !warnings.includes(POPS_REASON_CODES.EVENT_SEQUENCE_INVALID)) {
    warnings.push(POPS_REASON_CODES.EVENT_SEQUENCE_INVALID);
  }
  if (timestampDriftSevere) {
    warnings.push(POPS_REASON_CODES.TIMESTAMP_DRIFT_SEVERE);
  }

  let qualityScore = 1;
  qualityScore -= Math.min(0.3, duplicateCount * 0.05);
  qualityScore -= Math.min(0.4, invalidPayloadCount * 0.1);
  if (sequenceInvalid) qualityScore -= 0.2;
  if (timestampDriftSevere) qualityScore -= 0.15;
  qualityScore = clamp01(qualityScore);

  const dedupedWarnings = [...new Set(warnings)].sort();

  return {
    normalizedEvents,
    droppedEvents,
    warnings: dedupedWarnings,
    qualityScore,
  };
}
