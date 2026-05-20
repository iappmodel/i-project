import type { PopsReasonCode } from "../constants/pops-reason-codes";
import type { PopsSession } from "../types/pops.types";
import type { PopsEventDropReason } from "./pops-event-quality-reason-codes";

/**
 * Slim row for Stage 93 normalization only (distinct from capture `PopsEvent` in `pops-events.types`).
 */
export interface PopsQualityInputEvent {
  eventId: string;
  eventType: string;
  clientTimestampMs: number;
  payload?: Record<string, unknown>;
}

export interface PopsDroppedEvent {
  eventId: string;
  eventType: string;
  reason: PopsEventDropReason;
  createdAt: string;
}

export interface NormalizePopsEventsInput {
  session: PopsSession;
  events: PopsQualityInputEvent[];
  /** Wall clock for deterministic tests; defaults to `Date.now()` only when omitted in browser callers. */
  referenceNowMs?: number;
}

export interface NormalizePopsEventsOutput {
  normalizedEvents: PopsQualityInputEvent[];
  droppedEvents: PopsDroppedEvent[];
  warnings: PopsReasonCode[];
  qualityScore: number;
}
