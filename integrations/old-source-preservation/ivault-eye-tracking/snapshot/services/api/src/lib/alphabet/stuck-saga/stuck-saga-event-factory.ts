import type { StuckSagaEvaluationResult } from "@/types/alphabet/stuck-saga.types";
import type { TrustImpactEvent } from "@/types/alphabet/trust.types";
import type { UValueImpactEvent } from "@/types/alphabet/u-value.types";
import { ALPHABET_SYSTEM_USER_ID } from "../db-repositories/alphabet-events.repository";
import { createTrustImpactEvent } from "../trust-event-factory";
import { createUValueImpactEvent } from "../u-value-event-factory";

export function createTrustEventFromStuckSagaResult(
  result: StuckSagaEvaluationResult
): TrustImpactEvent | null {
  if (result.passed) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "stuck_saga_clean",
      category: "reputation",
      severity: "positive_small",
      sourceEventId: result.stuckSagaPassedEvent?.eventId ?? null,
      confidence: result.stuckConfidenceScore,
      metadata: {
        stuckType: result.stuckType,
        scanScope: result.scanScope
      }
    });
  }

  if (result.failed || result.critical) {
    return createTrustImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "stuck_saga_failed",
      category: "reputation",
      severity: result.critical ? "negative_medium" : "negative_small",
      sourceEventId:
        result.stuckSagaCriticalEvent?.eventId ??
        result.stuckSagaFailedEvent?.eventId ??
        null,
      confidence: result.stuckConfidenceScore,
      metadata: {
        stuckType: result.stuckType,
        scanScope: result.scanScope,
        reasons: result.reasons
      }
    });
  }

  return null;
}

export function createUValueEventFromStuckSagaResult(
  result: StuckSagaEvaluationResult
): UValueImpactEvent | null {
  if (result.passed) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "stuck_saga_passed",
      category: "trust",
      severity: "positive_small",
      coinCode: "J",
      sourceEventId: result.stuckSagaPassedEvent?.eventId ?? null,
      confidence: result.stuckConfidenceScore,
      metadata: {
        stuckType: result.stuckType
      }
    });
  }

  if (result.failed || result.critical) {
    return createUValueImpactEvent({
      userId: ALPHABET_SYSTEM_USER_ID,
      eventType: "stuck_saga_failed",
      category: "trust",
      severity: "negative_small",
      coinCode: "J",
      sourceEventId:
        result.stuckSagaCriticalEvent?.eventId ??
        result.stuckSagaFailedEvent?.eventId ??
        null,
      confidence: result.stuckConfidenceScore,
      metadata: {
        stuckType: result.stuckType,
        reasons: result.reasons
      }
    });
  }

  return null;
}
