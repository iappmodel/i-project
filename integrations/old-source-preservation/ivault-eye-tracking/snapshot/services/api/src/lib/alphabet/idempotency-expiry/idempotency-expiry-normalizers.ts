import type {
  IdempotencyExpiryKeyMetadata,
  IdempotencyExpiryLinkedObjectIds
} from "@/types/alphabet/idempotency-expiry.types";

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function isPast(value?: string | null, now?: string): boolean {
  if (!value) return false;

  const target = new Date(value).getTime();
  const current = new Date(now ?? new Date().toISOString()).getTime();

  if (!Number.isFinite(target) || !Number.isFinite(current)) return false;

  return target <= current;
}

export function secondsSince(value?: string | null, now?: string): number {
  if (!value) return 0;

  const start = new Date(value).getTime();
  const end = new Date(now ?? new Date().toISOString()).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;

  return Math.max(0, Math.floor((end - start) / 1000));
}

export function isMoneyScope(scope?: string | null, objectType?: string | null): boolean {
  const haystack = `${scope ?? ""}:${objectType ?? ""}`.toLowerCase();

  return (
    haystack.includes("wallet") ||
    haystack.includes("ledger") ||
    haystack.includes("withdraw") ||
    haystack.includes("payout") ||
    haystack.includes("transfer") ||
    haystack.includes("payment") ||
    haystack.includes("compensation")
  );
}

export function buildKeyMetadata(
  row: Record<string, unknown>,
  keyType: "idempotency" | "dedupe"
): IdempotencyExpiryKeyMetadata {
  const keyValue =
    keyType === "idempotency"
      ? String(row.idempotency_key ?? row.key_value ?? row.key ?? "")
      : String(row.dedupe_key ?? row.key_value ?? row.key ?? "");

  return {
    keyId: String(row.id ?? row.key_id ?? keyValue),
    keyType,
    scope: String(row.scope ?? ""),
    keyValue,
    objectType: row.object_type ? String(row.object_type) : null,
    objectId: row.object_id ? String(row.object_id) : null,
    status: row.status ? String(row.status) : null,
    firstSeenAt: row.first_seen_at ? String(row.first_seen_at) : null,
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    lockedAt: row.locked_at ? String(row.locked_at) : null,
    lockExpiresAt: row.lock_expires_at ? String(row.lock_expires_at) : null,
    hitCount: toNumber(row.hit_count),
    conflictCount: toNumber(row.conflict_count),
    replayCount: toNumber(row.replay_count)
  };
}

export function extractLinkedObjectIds(row: Record<string, unknown>): IdempotencyExpiryLinkedObjectIds {
  return {
    userId: row.user_id ? String(row.user_id) : null,
    walletId: row.wallet_id ? String(row.wallet_id) : null,
    walletAccountId: row.wallet_account_id ? String(row.wallet_account_id) : null,
    ledgerEntryId: row.ledger_entry_id ? String(row.ledger_entry_id) : null,
    externalTransferId: row.external_transfer_id ? String(row.external_transfer_id) : null,
    compensationId: row.compensation_id ? String(row.compensation_id) : null,
    reviewCaseId: row.review_case_id ? String(row.review_case_id) : null,
    policyDecisionId: row.policy_decision_id ? String(row.policy_decision_id) : null,
    pipelineId: row.pipeline_id ? String(row.pipeline_id) : null,
    sagaId: row.saga_id ? String(row.saga_id) : null,
    executionRequestId: row.execution_request_id ? String(row.execution_request_id) : null,
    notificationId: row.notification_id ? String(row.notification_id) : null,
    alphabetEventId: row.alphabet_event_id ? String(row.alphabet_event_id) : null
  };
}
