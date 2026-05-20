import type {
  IdempotencyKeyRecord,
  IdempotencyScope,
  MutationGuardInput,
  MutationGuardResult
} from "@/types/alphabet/idempotency.types";
import type { Json } from "@/types/alphabet/database.types";
import {
  completeIdempotencyKeyDb,
  getDedupeKeyDb,
  getIdempotencyKeyDb,
  incrementDedupeDuplicateDb,
  releaseDedupeKeyDb,
  upsertDedupeKeyDb,
  upsertIdempotencyKeyDb
} from "../db-repositories/idempotency.repository";
import { createRequestHash } from "./idempotency-key-factory";
import { evaluateMutationGuard } from "./mutation-guard";
import { idempotencyFail } from "./idempotency-errors";

export async function guardMutationDb(params: {
  scope: IdempotencyScope;
  userId?: string | null;
  objectId?: string | null;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  requestPayload: Json | Record<string, unknown>;
  financialMutation: boolean;
  allowReplay?: boolean;
  blockDuplicate?: boolean;
  expiresAt?: string | null;
  metadata?: Json;
}): Promise<MutationGuardResult> {
  const requestHash = createRequestHash(params.requestPayload as never);

  const existingIdempotencyRecord = params.idempotencyKey
    ? await getIdempotencyKeyDb(params.idempotencyKey)
    : null;

  const existingDedupeRecord = params.dedupeKey ? await getDedupeKeyDb(params.dedupeKey) : null;

  const input: MutationGuardInput = {
    scope: params.scope,
    userId: params.userId ?? null,
    objectId: params.objectId ?? null,
    idempotencyKey: params.idempotencyKey ?? null,
    dedupeKey: params.dedupeKey ?? null,
    requestHash,
    financialMutation: params.financialMutation,
    allowReplay: params.allowReplay ?? true,
    blockDuplicate: params.blockDuplicate ?? true,
    existingIdempotencyRecord,
    existingDedupeRecord,
    now: new Date().toISOString(),
    expiresAt: params.expiresAt ?? null,
    metadata: params.metadata
  };

  const result = evaluateMutationGuard(input);

  if (result.allowed) {
    if (params.idempotencyKey) {
      await upsertIdempotencyKeyDb({
        idempotencyKey: params.idempotencyKey,
        scope: params.scope,
        userId: params.userId ?? null,
        objectId: params.objectId ?? null,
        requestHash,
        status: "in_progress",
        expiresAt: params.expiresAt ?? null,
        firstSeenAt: existingIdempotencyRecord?.firstSeenAt ?? null,
        metadata: params.metadata
      });
    }

    if (params.dedupeKey) {
      await upsertDedupeKeyDb({
        dedupeKey: params.dedupeKey,
        scope: params.scope,
        userId: params.userId ?? null,
        objectId: params.objectId ?? null,
        status: "active",
        duplicateCount: existingDedupeRecord?.duplicateCount ?? 0,
        expiresAt: params.expiresAt ?? null,
        firstSeenAt: existingDedupeRecord?.firstSeenAt ?? null,
        metadata: params.metadata
      });
    }
  }

  if (result.status === "mutation_blocked_duplicate" && params.dedupeKey) {
    await incrementDedupeDuplicateDb(params.dedupeKey);
  }

  return result;
}

export async function completeGuardedMutationDb(params: {
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  responseSnapshot: Json;
  linkedObjectIds?: IdempotencyKeyRecord["linkedObjectIds"];
  releaseDedupe?: boolean;
  metadata?: Json;
}): Promise<void> {
  if (params.idempotencyKey) {
    await completeIdempotencyKeyDb({
      idempotencyKey: params.idempotencyKey,
      responseSnapshot: params.responseSnapshot,
      linkedObjectIds: params.linkedObjectIds,
      metadata: params.metadata
    });
  }

  if (params.dedupeKey && params.releaseDedupe) {
    await releaseDedupeKeyDb(params.dedupeKey);
  }
}

export async function assertMutationAllowedDb(params: {
  scope: IdempotencyScope;
  userId?: string | null;
  objectId?: string | null;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  requestPayload: Json | Record<string, unknown>;
  financialMutation: boolean;
  metadata?: Json;
}): Promise<MutationGuardResult> {
  const result = await guardMutationDb(params);

  if (!result.allowed && !result.replay) {
    idempotencyFail({
      code: result.status,
      message: "Mutation blocked by idempotency/dedupe guard.",
      reasonCodes: result.reasons
    });
  }

  return result;
}

/** Safe failure before mutation: release dedupe slot when no ledger mutation occurred. */
export async function releaseDedupeAfterPreflightFailureDb(dedupeKey: string | null | undefined): Promise<void> {
  if (!dedupeKey) return;
  await releaseDedupeKeyDb(dedupeKey);
}
