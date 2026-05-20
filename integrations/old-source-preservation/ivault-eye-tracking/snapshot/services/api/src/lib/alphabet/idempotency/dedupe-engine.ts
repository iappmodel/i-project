import { randomUUID } from "node:crypto";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  DedupeEvaluationResult,
  DedupeKeyRecord,
  DedupeOutcomeStatus,
  DedupeSignalInput
} from "@/types/alphabet/idempotency.types";

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function isExpired(input: DedupeSignalInput): boolean {
  const expiresAt = input.existingRecord?.expiresAt ?? input.expiresAt;
  if (!expiresAt) return false;
  return new Date(input.now).getTime() > new Date(expiresAt).getTime();
}

function calculateDuplicateRiskScore(input: DedupeSignalInput): number {
  if (!input.dedupeKey) return input.financialMutation ? 0.75 : 0.25;
  if (!input.existingRecord) return 0.05;

  let risk = 0.2;

  if (input.existingRecord.status === "active") risk += 0.45;
  if (input.existingRecord.status === "duplicate") risk += 0.35;
  if (input.existingRecord.status === "blocked") risk += 0.5;
  if (input.existingRecord.duplicateCount > 0)
    risk += Math.min(0.25, input.existingRecord.duplicateCount * 0.08);
  if (isExpired(input)) risk -= 0.15;

  return clamp(risk);
}

function createDedupeEvent(params: {
  input: DedupeSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId ?? "system",
    coinCode: "J",
    eventType: params.eventType,
    objectType: "dedupe_key",
    objectId: params.input.dedupeKey ?? "missing",
    sourceContext: "dedupe",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      scope: params.input.scope,
      userId: params.input.userId ?? null,
      objectId: params.input.objectId ?? null,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

function buildNewRecord(input: DedupeSignalInput): DedupeKeyRecord | null {
  if (!input.dedupeKey) return null;

  return {
    dedupeKey: input.dedupeKey,
    scope: input.scope,
    status: "new",
    userId: input.userId ?? null,
    objectId: input.objectId ?? null,
    duplicateCount: 0,
    firstSeenAt: input.now,
    lastSeenAt: input.now,
    expiresAt: input.expiresAt ?? null,
    metadata: input.metadata ?? {}
  };
}

function decideDedupeOutcome(input: DedupeSignalInput, reasons: string[]): DedupeOutcomeStatus {
  if (!input.dedupeKey) {
    reasons.push("dedupe_key_missing");
    return input.financialMutation ? "dedupe_blocked" : "dedupe_new";
  }

  if (input.releaseRequested && input.existingRecord) {
    reasons.push("dedupe_key_released");
    return "dedupe_released";
  }

  if (!input.existingRecord) {
    reasons.push("dedupe_key_new");
    return "dedupe_new";
  }

  if (isExpired(input)) {
    reasons.push("dedupe_key_expired");
    return "dedupe_expired";
  }

  if (input.existingRecord.status === "blocked") {
    reasons.push("dedupe_key_blocked");
    return "dedupe_blocked";
  }

  if (input.existingRecord.status === "released") {
    reasons.push("dedupe_key_released_state");
    return "dedupe_released";
  }

  if (input.existingRecord.status === "active" && input.blockWhileActive) {
    reasons.push("active_dedupe_duplicate_detected");
    return "dedupe_duplicate";
  }

  if (input.existingRecord.status === "duplicate") {
    reasons.push("dedupe_duplicate_detected");
    return "dedupe_duplicate";
  }

  reasons.push("dedupe_key_active");
  return "dedupe_active";
}

export function evaluateDedupe(input: DedupeSignalInput): DedupeEvaluationResult {
  const reasons: string[] = [];

  const duplicateRiskScore = calculateDuplicateRiskScore(input);
  const status = decideDedupeOutcome(input, reasons);

  const newKey = status === "dedupe_new";
  const active = status === "dedupe_active";
  const duplicate = status === "dedupe_duplicate";
  const blocked = status === "dedupe_blocked";
  const expired = status === "dedupe_expired";
  const released = status === "dedupe_released";

  const safeToCreate = newKey;
  const safeToProceed = newKey || active || expired || released;

  const record = input.existingRecord ?? buildNewRecord(input);

  const dedupeKeyCreatedEvent = newKey
    ? createDedupeEvent({
        input,
        eventType: "dedupe_key_created",
        rawScore: 1 - duplicateRiskScore,
        qualityScore: 1,
        riskScore: duplicateRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const dedupeDuplicateDetectedEvent = duplicate
    ? createDedupeEvent({
        input,
        eventType: "dedupe_duplicate_detected",
        rawScore: 1 - duplicateRiskScore,
        qualityScore: 0.5,
        riskScore: duplicateRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const dedupeBlockedEvent = blocked
    ? createDedupeEvent({
        input,
        eventType: "dedupe_blocked",
        rawScore: 1 - duplicateRiskScore,
        qualityScore: 0.3,
        riskScore: duplicateRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  return {
    status,
    dedupeKey: input.dedupeKey ?? null,
    scope: input.scope,
    duplicateRiskScore,
    newKey,
    active,
    duplicate,
    blocked,
    expired,
    released,
    safeToCreate,
    safeToProceed,
    record,
    reasons,
    dedupeKeyCreatedEvent,
    dedupeDuplicateDetectedEvent,
    dedupeBlockedEvent,
    metadata: input.metadata ?? {}
  };
}
