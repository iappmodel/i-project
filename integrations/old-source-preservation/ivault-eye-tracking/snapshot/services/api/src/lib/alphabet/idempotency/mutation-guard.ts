import { randomUUID } from "node:crypto";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  MutationGuardInput,
  MutationGuardOutcomeStatus,
  MutationGuardResult
} from "@/types/alphabet/idempotency.types";
import { getIdempotencyRule } from "@/data/alphabet/idempotency-rules";
import { evaluateIdempotency } from "./idempotency-engine";
import { evaluateDedupe } from "./dedupe-engine";

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function createMutationGuardEvent(params: {
  input: MutationGuardInput;
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
    objectType: "mutation_guard",
    objectId: params.input.idempotencyKey ?? params.input.dedupeKey ?? "missing",
    sourceContext: "mutation_guard",
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
      idempotencyKey: params.input.idempotencyKey ?? null,
      dedupeKey: params.input.dedupeKey ?? null,
      ...params.metadata,
      ...(params.input.metadata as Record<string, unknown> | undefined)
    },
    createdAt: new Date().toISOString()
  };
}

function calculateMutationSafetyScore(params: {
  idempotencySafe: boolean;
  dedupeSafe: boolean;
  financialMutation: boolean;
  hasIdempotencyKey: boolean;
  hasDedupeKey: boolean;
  duplicateRiskScore: number;
}): number {
  let score = 1;

  if (!params.idempotencySafe) score -= 0.35;
  if (!params.dedupeSafe) score -= 0.35;
  if (params.financialMutation && !params.hasIdempotencyKey) score -= 0.25;
  if (params.financialMutation && !params.hasDedupeKey) score -= 0.2;

  score -= params.duplicateRiskScore * 0.25;

  return clamp(score);
}

function decideMutationOutcome(params: {
  input: MutationGuardInput;
  idempotencyReplay: boolean;
  idempotencyConflict: boolean;
  idempotencyInProgress: boolean;
  idempotencyExpired: boolean;
  idempotencyBlocked: boolean;
  dedupeDuplicate: boolean;
  dedupeBlocked: boolean;
  missingRequiredKey: boolean;
  mutationSafetyScore: number;
  minMutationSafetyScore: number;
  reasons: string[];
}): MutationGuardOutcomeStatus {
  const {
    input,
    idempotencyReplay,
    idempotencyConflict,
    idempotencyInProgress,
    idempotencyExpired,
    idempotencyBlocked,
    dedupeDuplicate,
    dedupeBlocked,
    missingRequiredKey,
    mutationSafetyScore,
    minMutationSafetyScore,
    reasons
  } = params;

  if (missingRequiredKey) {
    reasons.push("mutation_guard_missing_required_key");
    return "mutation_blocked_missing_key";
  }

  if (idempotencyReplay && input.allowReplay) {
    reasons.push("mutation_guard_replay_allowed");
    return "mutation_replay";
  }

  if (idempotencyConflict) {
    reasons.push("mutation_guard_idempotency_conflict");
    return "mutation_blocked_conflict";
  }

  if (idempotencyInProgress) {
    reasons.push("mutation_guard_idempotency_in_progress");
    return "mutation_blocked_in_progress";
  }

  if (idempotencyExpired) {
    reasons.push("mutation_guard_idempotency_expired");
    return "mutation_blocked_expired";
  }

  if (idempotencyBlocked) {
    reasons.push("mutation_guard_idempotency_blocked");
    return "mutation_blocked_conflict";
  }

  if (dedupeDuplicate || dedupeBlocked) {
    reasons.push("mutation_guard_dedupe_duplicate_or_blocked");
    return "mutation_blocked_duplicate";
  }

  if (mutationSafetyScore < minMutationSafetyScore) {
    reasons.push("mutation_guard_safety_score_below_minimum");
    return "mutation_blocked_conflict";
  }

  reasons.push("mutation_guard_allowed");
  return "mutation_allowed";
}

export function evaluateMutationGuard(input: MutationGuardInput): MutationGuardResult {
  const reasons: string[] = [];
  const rule = getIdempotencyRule(input.scope);

  const requiresIdempotencyKey = rule?.requiresIdempotencyKey ?? input.financialMutation;

  const requiresDedupeKey = rule?.requiresDedupeKey ?? input.financialMutation;

  const idempotencyResult = evaluateIdempotency({
    idempotencyKey: input.idempotencyKey ?? null,
    scope: input.scope,
    userId: input.userId ?? null,
    objectId: input.objectId ?? null,
    requestHash: input.requestHash,
    existingRecord: input.existingIdempotencyRecord ?? null,
    financialMutation: input.financialMutation,
    allowReplay: input.allowReplay,
    now: input.now,
    expiresAt: input.expiresAt ?? null,
    metadata: input.metadata
  });

  const dedupeResult = evaluateDedupe({
    dedupeKey: input.dedupeKey ?? null,
    scope: input.scope,
    userId: input.userId ?? null,
    objectId: input.objectId ?? null,
    existingRecord: input.existingDedupeRecord ?? null,
    financialMutation: input.financialMutation,
    blockWhileActive: input.blockDuplicate,
    releaseRequested: false,
    now: input.now,
    expiresAt: input.expiresAt ?? null,
    metadata: input.metadata
  });

  const missingRequiredKey =
    (requiresIdempotencyKey && !input.idempotencyKey) || (requiresDedupeKey && !input.dedupeKey);

  const mutationSafetyScore = calculateMutationSafetyScore({
    idempotencySafe: idempotencyResult.newKey || idempotencyResult.replay,
    dedupeSafe:
      dedupeResult.newKey || dedupeResult.active || dedupeResult.expired || dedupeResult.released,
    financialMutation: input.financialMutation,
    hasIdempotencyKey: Boolean(input.idempotencyKey),
    hasDedupeKey: Boolean(input.dedupeKey),
    duplicateRiskScore: Math.max(idempotencyResult.duplicateRiskScore, dedupeResult.duplicateRiskScore)
  });

  const status = decideMutationOutcome({
    input,
    idempotencyReplay: idempotencyResult.replay,
    idempotencyConflict: idempotencyResult.conflict,
    idempotencyInProgress: idempotencyResult.inProgress,
    idempotencyExpired: idempotencyResult.expired,
    idempotencyBlocked: idempotencyResult.blocked,
    dedupeDuplicate: dedupeResult.duplicate,
    dedupeBlocked: dedupeResult.blocked,
    missingRequiredKey,
    mutationSafetyScore,
    minMutationSafetyScore: rule?.minMutationSafetyScore ?? 0.8,
    reasons
  });

  const allowed = status === "mutation_allowed";
  const replay = status === "mutation_replay";
  const blocked = !allowed && !replay;

  const mutationGuardAllowedEvent =
    allowed || replay
      ? createMutationGuardEvent({
          input,
          eventType: "mutation_guard_allowed",
          rawScore: mutationSafetyScore,
          qualityScore: mutationSafetyScore,
          riskScore: 1 - mutationSafetyScore,
          verificationStatus: "verified",
          metadata: {
            status,
            reasons,
            idempotencyStatus: idempotencyResult.status,
            dedupeStatus: dedupeResult.status
          }
        })
      : null;

  const mutationGuardBlockedEvent = blocked
    ? createMutationGuardEvent({
        input,
        eventType: "mutation_guard_blocked",
        rawScore: mutationSafetyScore,
        qualityScore: mutationSafetyScore,
        riskScore: 1 - mutationSafetyScore,
        verificationStatus: "rejected",
        metadata: {
          status,
          reasons,
          idempotencyStatus: idempotencyResult.status,
          dedupeStatus: dedupeResult.status
        }
      })
    : null;

  return {
    status,
    scope: input.scope,
    allowed,
    replay,
    blocked,
    idempotencyResult,
    dedupeResult,
    mutationSafetyScore,
    responseSnapshot: idempotencyResult.responseSnapshot ?? null,
    reasons: [...reasons, ...idempotencyResult.reasons, ...dedupeResult.reasons],
    mutationGuardAllowedEvent,
    mutationGuardBlockedEvent,
    metadata: input.metadata ?? {}
  };
}
