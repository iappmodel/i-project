import type { Json } from "@/types/alphabet/database.types";
import type {
  IdempotencyExpiryScannerResult,
  IdempotencyExpirySignalInput,
  IdempotencyExpiryType
} from "@/types/alphabet/idempotency-expiry.types";
import {
  fetchDedupeExpiryRowsDb,
  fetchIdempotencyExpiryRowsDb
} from "../db-repositories/idempotency-expiry.repository";
import { evaluateAndPersistIdempotencyExpiry } from "./idempotency-expiry-store";
import {
  buildKeyMetadata,
  extractLinkedObjectIds,
  isMoneyScope,
  isPast,
  secondsSince
} from "./idempotency-expiry-normalizers";

type PersistOutcome = Awaited<ReturnType<typeof evaluateAndPersistIdempotencyExpiry>>;

function collectSidecarIds(out: PersistOutcome): {
  alertIds: string[];
  reviewCaseIds: string[];
  eventIds: string[];
} {
  const alertIds: string[] = [];
  const reviewCaseIds: string[] = [];
  const eventIds = [...out.eventIds];

  const alertRow = out.operationalAlert?.alert as Record<string, unknown> | undefined;
  if (alertRow?.alert_id) {
    alertIds.push(String(alertRow.alert_id));
  }

  const opReview = out.operationalAlert?.reviewCase as Record<string, unknown> | undefined;
  if (opReview?.review_case_id) {
    reviewCaseIds.push(String(opReview.review_case_id));
  }

  const manual = out.manualReview?.case as Record<string, unknown> | undefined;
  if (manual?.review_case_id && !out.manualReview?.deduped) {
    reviewCaseIds.push(String(manual.review_case_id));
  }

  return { alertIds, reviewCaseIds, eventIds };
}

export function classifyIdempotencyExpiryRow(params: {
  row: Record<string, unknown>;
  keyType: "idempotency" | "dedupe";
  now: string;
}): IdempotencyExpiryType {
  const conflictCount = Number(params.row.conflict_count ?? 0);
  const replayCount = Number(params.row.replay_count ?? 0);
  const hitCount = Number(params.row.hit_count ?? 0);
  const expiresAt = params.row.expires_at ? String(params.row.expires_at) : null;
  const lastSeenAt = params.row.last_seen_at ? String(params.row.last_seen_at) : null;
  const lockExpiresAt = params.row.lock_expires_at ? String(params.row.lock_expires_at) : null;
  const lockedAt = params.row.locked_at ? String(params.row.locked_at) : null;
  const resultHash = params.row.result_hash ?? params.row.response_hash ?? null;
  const expectedResultHash = params.row.expected_result_hash ?? null;
  const objectId = params.row.object_id ?? null;

  const lockHeldPastExpiry =
    Boolean(lockExpiresAt && lockedAt && isPast(lockExpiresAt, params.now));

  if (params.keyType === "idempotency") {
    if (expectedResultHash && resultHash && expectedResultHash !== resultHash) {
      return "idempotency_key_result_mismatch";
    }
    if (conflictCount >= 3) return "idempotency_key_conflict_spike";
    if (replayCount >= 3 || hitCount >= 20) return "idempotency_key_replay_spike";
    if (lockHeldPastExpiry) return "idempotency_key_locked_too_long";
    if (!resultHash && objectId) return "idempotency_key_missing_result";
    if (expiresAt && isPast(expiresAt, params.now)) return "idempotency_key_expired";
    if (lastSeenAt && secondsSince(lastSeenAt, params.now) > 24 * 60 * 60) {
      return "idempotency_key_stale";
    }
    return "idempotency_key_stale";
  }

  if (conflictCount >= 3 || hitCount >= 20) return "dedupe_duplicate_spike";
  if (replayCount >= 3) return "dedupe_replay_spike";
  if (lockHeldPastExpiry) return "dedupe_key_locked_too_long";
  if (!objectId) return "dedupe_key_missing_object";
  if (expiresAt && isPast(expiresAt, params.now)) return "dedupe_key_expired";
  if (lastSeenAt && secondsSince(lastSeenAt, params.now) > 24 * 60 * 60) {
    return "dedupe_key_stale";
  }
  return "dedupe_key_stale";
}

function buildSignal(params: {
  row: Record<string, unknown>;
  keyType: "idempotency" | "dedupe";
  now: string;
}): IdempotencyExpirySignalInput {
  const keyMetadata = buildKeyMetadata(params.row, params.keyType);
  const linkedObjectIds = extractLinkedObjectIds(params.row);
  const expiryType = classifyIdempotencyExpiryRow(params);
  const moneyScoped = isMoneyScope(keyMetadata.scope, keyMetadata.objectType);

  const expired = Boolean(keyMetadata.expiresAt && isPast(keyMetadata.expiresAt, params.now));
  const lockExpired = Boolean(
    keyMetadata.lockExpiresAt &&
      keyMetadata.lockedAt &&
      isPast(keyMetadata.lockExpiresAt, params.now)
  );
  const stale = secondsSince(keyMetadata.lastSeenAt, params.now) > 24 * 60 * 60;

  const conflictSpike = keyMetadata.conflictCount >= 3;
  const replaySpike = keyMetadata.replayCount >= 3;
  const duplicateSpike = keyMetadata.hitCount >= 20 || expiryType === "dedupe_duplicate_spike";

  const missingResult = expiryType === "idempotency_key_missing_result";
  const resultMismatch = expiryType === "idempotency_key_result_mismatch";

  const abuseRisk = Math.min(
    1,
    (keyMetadata.conflictCount + keyMetadata.replayCount + keyMetadata.hitCount / 10) / 10
  );

  return {
    expiryType,
    expiryScope: params.keyType,
    keyMetadata,
    linkedObjectIds,
    riskScores: {
      conflictRiskScore: Math.min(1, keyMetadata.conflictCount / 5),
      replayRiskScore: Math.min(1, keyMetadata.replayCount / 5),
      abuseRiskScore: abuseRisk,
      financialRiskScore: moneyScoped ? 0.9 : 0.25,
      auditPreservationScore: 0.95,
      confidenceScore: 0.92
    },
    evidence: params.row as Json,
    redactedEvidence: {
      keyType: params.keyType,
      scope: keyMetadata.scope,
      objectType: keyMetadata.objectType,
      objectId: keyMetadata.objectId,
      status: keyMetadata.status,
      firstSeenAt: keyMetadata.firstSeenAt,
      lastSeenAt: keyMetadata.lastSeenAt,
      expiresAt: keyMetadata.expiresAt,
      hitCount: keyMetadata.hitCount,
      conflictCount: keyMetadata.conflictCount,
      replayCount: keyMetadata.replayCount
    } as Json,
    sourceEventIds: [],
    expired,
    stale,
    conflictSpike,
    replaySpike,
    duplicateSpike,
    missingResult,
    resultMismatch,
    lockExpired,
    moneyScoped,
    auditCritical: moneyScoped || Boolean(keyMetadata.objectId),
    now: params.now,
    metadata: {
      scanner: params.keyType
    } as Json
  };
}

async function runRows(params: {
  rows: Record<string, unknown>[];
  keyType: "idempotency" | "dedupe";
  now: string;
}): Promise<PersistOutcome[]> {
  const results: PersistOutcome[] = [];

  for (const row of params.rows) {
    const signal = buildSignal({
      row,
      keyType: params.keyType,
      now: params.now
    });
    results.push(await evaluateAndPersistIdempotencyExpiry(signal));
  }

  return results;
}

function aggregateScanResults(
  results: PersistOutcome[],
  rowsLength: number,
  keyCountLabel: "idempotencyKeys" | "dedupeKeys",
  completedCode: string,
  failuresCode: string
): IdempotencyExpiryScannerResult {
  const sourceEventIds: string[] = [];
  const createdAlertIds: string[] = [];
  const createdReviewCaseIds: string[] = [];

  for (const result of results) {
    const ids = collectSidecarIds(result);
    sourceEventIds.push(...ids.eventIds);
    createdAlertIds.push(...ids.alertIds);
    createdReviewCaseIds.push(...ids.reviewCaseIds);
  }

  const failedCount = results.filter((item) => item.evaluation.failed || item.evaluation.critical).length;

  return {
    ok: failedCount === 0,
    resultPayload: {
      scannedKeys: rowsLength,
      expiryResultsCreated: results.length,
      failedCount
    } as Json,
    scannedObjectCounts: {
      [keyCountLabel]: rowsLength
    },
    mutationCounts: {
      expiryResultsCreated: results.length,
      alertsCreated: createdAlertIds.length,
      reviewCasesCreated: createdReviewCaseIds.length
    },
    sourceEventIds,
    createdAlertIds,
    createdReviewCaseIds,
    reasonCodes: failedCount > 0 ? [failuresCode] : [completedCode],
    retryable: false
  };
}

export async function runIdempotencyExpiryScan(params?: {
  limit?: number;
}): Promise<IdempotencyExpiryScannerResult> {
  const now = new Date().toISOString();
  const rows = (await fetchIdempotencyExpiryRowsDb({
    limit: params?.limit ?? 250
  })) as Record<string, unknown>[];

  const results = await runRows({
    rows,
    keyType: "idempotency",
    now
  });

  return aggregateScanResults(
    results,
    rows.length,
    "idempotencyKeys",
    "idempotency_expiry_scan_completed",
    "idempotency_expiry_scan_completed_with_failures"
  );
}

export async function runDedupeExpiryScan(params?: {
  limit?: number;
}): Promise<IdempotencyExpiryScannerResult> {
  const now = new Date().toISOString();
  const rows = (await fetchDedupeExpiryRowsDb({
    limit: params?.limit ?? 250
  })) as Record<string, unknown>[];

  const results = await runRows({
    rows,
    keyType: "dedupe",
    now
  });

  return aggregateScanResults(
    results,
    rows.length,
    "dedupeKeys",
    "dedupe_expiry_scan_completed",
    "dedupe_expiry_scan_completed_with_failures"
  );
}
