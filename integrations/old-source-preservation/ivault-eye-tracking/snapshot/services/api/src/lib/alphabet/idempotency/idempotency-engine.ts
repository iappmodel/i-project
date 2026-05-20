import { randomUUID } from "node:crypto";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  IdempotencyEvaluationResult,
  IdempotencyKeyRecord,
  IdempotencyOutcomeStatus,
  IdempotencySignalInput
} from "@/types/alphabet/idempotency.types";

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function isExpired(input: IdempotencySignalInput): boolean {
  const expiresAt = input.existingRecord?.expiresAt ?? input.expiresAt;
  if (!expiresAt) return false;
  return new Date(input.now).getTime() > new Date(expiresAt).getTime();
}

function calculateMatchScore(input: IdempotencySignalInput): number {
  if (!input.idempotencyKey) return 0;
  if (!input.existingRecord) return 1;

  let score = 0;

  score += input.existingRecord.idempotencyKey === input.idempotencyKey ? 0.35 : 0;
  score += input.existingRecord.scope === input.scope ? 0.2 : 0;
  score += input.existingRecord.userId === input.userId ? 0.15 : 0;
  score += input.existingRecord.objectId === input.objectId ? 0.1 : 0;
  score += input.existingRecord.requestHash === input.requestHash ? 0.2 : 0;

  return clamp(score);
}

function calculateRequestHashConfidenceScore(input: IdempotencySignalInput): number {
  if (!input.requestHash || input.requestHash.length < 32) return 0.2;
  if (!input.existingRecord) return 1;

  return input.existingRecord.requestHash === input.requestHash ? 1 : 0;
}

function calculateDuplicateRiskScore(input: IdempotencySignalInput): number {
  if (!input.idempotencyKey) return input.financialMutation ? 0.9 : 0.4;
  if (!input.existingRecord) return 0.05;

  let risk = 0.2;

  if (input.existingRecord.requestHash !== input.requestHash) risk += 0.55;
  if (input.existingRecord.status === "in_progress") risk += 0.25;
  if (input.existingRecord.status === "completed") risk += 0.15;
  if (input.existingRecord.status === "blocked" || input.existingRecord.status === "conflict") risk += 0.4;
  if (isExpired(input)) risk += 0.2;

  return clamp(risk);
}

function createIdempotencyEvent(params: {
  input: IdempotencySignalInput;
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
    objectType: "idempotency_key",
    objectId: params.input.idempotencyKey ?? "missing",
    sourceContext: "idempotency",
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
      requestHash: params.input.requestHash,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

function buildNewRecord(input: IdempotencySignalInput): IdempotencyKeyRecord | null {
  if (!input.idempotencyKey) return null;

  return {
    idempotencyKey: input.idempotencyKey,
    scope: input.scope,
    status: "new",
    userId: input.userId ?? null,
    objectId: input.objectId ?? null,
    requestHash: input.requestHash,
    responseSnapshot: input.responseSnapshot ?? null,
    linkedObjectIds: {},
    firstSeenAt: input.now,
    lastSeenAt: input.now,
    expiresAt: input.expiresAt ?? null,
    metadata: input.metadata ?? {}
  };
}

function decideIdempotencyOutcome(input: IdempotencySignalInput, reasons: string[]): IdempotencyOutcomeStatus {
  if (!input.idempotencyKey) {
    reasons.push("idempotency_key_missing");
    return input.financialMutation ? "idempotency_blocked" : "idempotency_new";
  }

  if (!input.existingRecord) {
    reasons.push("idempotency_key_new");
    return "idempotency_new";
  }

  if (isExpired(input)) {
    reasons.push("idempotency_key_expired");
    return "idempotency_expired";
  }

  if (input.existingRecord.requestHash !== input.requestHash) {
    reasons.push("idempotency_key_hash_conflict");
    return "idempotency_conflict";
  }

  if (input.existingRecord.status === "in_progress") {
    reasons.push("idempotency_key_in_progress");
    return "idempotency_in_progress";
  }

  if (input.existingRecord.status === "blocked" || input.existingRecord.status === "conflict") {
    reasons.push("idempotency_key_blocked");
    return "idempotency_blocked";
  }

  if (input.existingRecord.status === "completed" && input.allowReplay) {
    reasons.push("idempotency_safe_replay");
    return "idempotency_replay";
  }

  if (input.existingRecord.status === "seen" || input.existingRecord.status === "new") {
    reasons.push("idempotency_key_seen");
    return "idempotency_in_progress";
  }

  reasons.push("idempotency_key_blocked_default");
  return "idempotency_blocked";
}

export function evaluateIdempotency(input: IdempotencySignalInput): IdempotencyEvaluationResult {
  const reasons: string[] = [];

  const matchScore = calculateMatchScore(input);
  const requestHashConfidenceScore = calculateRequestHashConfidenceScore(input);
  const duplicateRiskScore = calculateDuplicateRiskScore(input);

  const status = decideIdempotencyOutcome(input, reasons);

  const newKey = status === "idempotency_new";
  const replay = status === "idempotency_replay";
  const conflict = status === "idempotency_conflict";
  const inProgress = status === "idempotency_in_progress";
  const expired = status === "idempotency_expired";
  const blocked = status === "idempotency_blocked";

  const safeToCreate = newKey;
  const safeToReplay = replay && Boolean(input.existingRecord?.responseSnapshot);

  const record = input.existingRecord ?? buildNewRecord(input);

  const idempotencyKeyCreatedEvent = newKey
    ? createIdempotencyEvent({
        input,
        eventType: "idempotency_key_created",
        rawScore: matchScore,
        qualityScore: requestHashConfidenceScore,
        riskScore: duplicateRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const idempotencyKeyReplayedEvent = replay
    ? createIdempotencyEvent({
        input,
        eventType: "idempotency_key_replayed",
        rawScore: matchScore,
        qualityScore: requestHashConfidenceScore,
        riskScore: duplicateRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const idempotencyConflictDetectedEvent = conflict
    ? createIdempotencyEvent({
        input,
        eventType: "idempotency_conflict_detected",
        rawScore: matchScore,
        qualityScore: requestHashConfidenceScore,
        riskScore: duplicateRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const idempotencyInProgressEvent = inProgress
    ? createIdempotencyEvent({
        input,
        eventType: "idempotency_in_progress",
        rawScore: matchScore,
        qualityScore: requestHashConfidenceScore,
        riskScore: duplicateRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const idempotencyBlockedEvent =
    blocked || expired
      ? createIdempotencyEvent({
          input,
          eventType: "idempotency_blocked",
          rawScore: matchScore,
          qualityScore: requestHashConfidenceScore,
          riskScore: duplicateRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  return {
    status,
    idempotencyKey: input.idempotencyKey ?? null,
    scope: input.scope,
    matchScore,
    requestHashConfidenceScore,
    duplicateRiskScore,
    newKey,
    replay,
    conflict,
    inProgress,
    expired,
    blocked,
    safeToCreate,
    safeToReplay,
    responseSnapshot: input.existingRecord?.responseSnapshot ?? null,
    record,
    reasons,
    idempotencyKeyCreatedEvent,
    idempotencyKeyReplayedEvent,
    idempotencyConflictDetectedEvent,
    idempotencyInProgressEvent,
    idempotencyBlockedEvent,
    metadata: input.metadata ?? {}
  };
}
