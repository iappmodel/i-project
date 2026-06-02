import type { ProofReviewStatus } from "../../types/proof-packet-v0.types.js";
import {
  normalizePendingHoldRecord,
  type PendingHoldRecord,
  type PendingHoldReviewAudit
} from "../pending-hold.js";
import type { SettlementAmountBreakdown } from "../settlement-amount.types.js";

export const PENDING_HOLD_RECORD_STORAGE_VERSION = 1 as const;

export interface PendingHoldStoredRecordV1 {
  storageVersion: typeof PENDING_HOLD_RECORD_STORAGE_VERSION;
  sessionId: string;
  userId?: string | null;
  localUserRef: string;
  contentId: string;
  offerId: string;
  packetId?: string | null;
  artifactId?: string | null;
  amount: number | null;
  amountBreakdown: SettlementAmountBreakdown | null;
  status: PendingHoldRecord["status"];
  releaseStatus: PendingHoldRecord["releaseStatus"];
  createdAt: string;
  reviewAudit: PendingHoldReviewAudit;
  releaseEligibleAt?: string | null;
  appealExpiresAt?: string | null;
  reverifyUsed?: boolean;
}

export class PendingHoldRecordStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PendingHoldRecordStorageError";
  }
}

export function toStoredRecord(record: PendingHoldRecord): PendingHoldStoredRecordV1 {
  assertAmountConsistency(record.amount, record.amountBreakdown);

  return {
    storageVersion: PENDING_HOLD_RECORD_STORAGE_VERSION,
    sessionId: record.sessionId,
    userId: record.userId,
    localUserRef: record.localUserRef,
    contentId: record.contentId,
    offerId: record.offerId,
    packetId: record.packetId,
    artifactId: record.artifactId,
    amount: record.amount,
    amountBreakdown: record.amountBreakdown,
    status: record.status,
    releaseStatus: record.releaseStatus,
    createdAt: record.createdAt,
    reviewAudit: record.reviewAudit,
    releaseEligibleAt: record.releaseEligibleAt ?? null,
    appealExpiresAt: record.appealExpiresAt ?? null,
    reverifyUsed: record.reverifyUsed ?? false
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertStringField(stored: Record<string, unknown>, field: string): string {
  const value = stored[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new PendingHoldRecordStorageError(`Missing or invalid string field: ${field}`);
  }

  return value;
}

function assertNumberField(stored: Record<string, unknown>, field: string): number {
  const value = stored[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PendingHoldRecordStorageError(`Missing or invalid number field: ${field}`);
  }

  return value;
}

function parseAmountBreakdown(value: unknown): SettlementAmountBreakdown {
  if (!isRecord(value)) {
    throw new PendingHoldRecordStorageError("Missing or invalid amountBreakdown object");
  }

  return {
    policyVersion: assertStringField(value, "policyVersion"),
    currency: assertStringField(value, "currency") as SettlementAmountBreakdown["currency"],
    offerId: assertStringField(value, "offerId"),
    baseRewardMinor: assertNumberField(value, "baseRewardMinor"),
    statusMultiplier: assertNumberField(value, "statusMultiplier"),
    computedAmountMinor: assertNumberField(value, "computedAmountMinor"),
    presenceUnits:
      value.presenceUnits === undefined ? undefined : (value.presenceUnits as number | null)
  };
}

function parseReviewAudit(value: unknown): PendingHoldReviewAudit {
  if (!isRecord(value)) {
    throw new PendingHoldRecordStorageError("Missing or invalid reviewAudit object");
  }

  return {
    sessionId: assertStringField(value, "sessionId"),
    reviewedAt: assertStringField(value, "reviewedAt"),
    reviewStatus: assertStringField(value, "reviewStatus") as ProofReviewStatus,
    artifactId: value.artifactId === undefined ? undefined : (value.artifactId as string | null),
    packetId: value.packetId === undefined ? undefined : (value.packetId as string | null),
    lifecycleEventCount: assertNumberField(value, "lifecycleEventCount")
  };
}

function assertAmountConsistency(amount: number | null, amountBreakdown: SettlementAmountBreakdown | null): void {
  if (amount !== null && amountBreakdown !== null && amount !== amountBreakdown.computedAmountMinor) {
    throw new PendingHoldRecordStorageError(
      `amount (${amount}) does not match amountBreakdown.computedAmountMinor (${amountBreakdown.computedAmountMinor})`
    );
  }
}

export function fromStoredRecord(stored: unknown): PendingHoldRecord {
  if (!isRecord(stored)) {
    throw new PendingHoldRecordStorageError("Stored record must be a JSON object");
  }

  if (stored.storageVersion !== PENDING_HOLD_RECORD_STORAGE_VERSION) {
    throw new PendingHoldRecordStorageError(
      `Unsupported storageVersion: ${String(stored.storageVersion)}`
    );
  }

  const status = assertStringField(stored, "status");
  if (status !== "pending" && status !== "appeal_pending") {
    throw new PendingHoldRecordStorageError(`Unsupported status: ${status}`);
  }

  const releaseStatus = assertStringField(stored, "releaseStatus");
  if (
    releaseStatus !== "not_released" &&
    releaseStatus !== "release_blocked"
  ) {
    throw new PendingHoldRecordStorageError(`Unsupported releaseStatus: ${releaseStatus}`);
  }

  const amount =
    stored.amount === null
      ? null
      : stored.amount === undefined
        ? (() => {
            throw new PendingHoldRecordStorageError("Missing or invalid amount field");
          })()
        : assertNumberField(stored, "amount");

  const amountBreakdown =
    stored.amountBreakdown === null
      ? null
      : stored.amountBreakdown === undefined
        ? (() => {
            throw new PendingHoldRecordStorageError("Missing or invalid amountBreakdown field");
          })()
        : parseAmountBreakdown(stored.amountBreakdown);

  assertAmountConsistency(amount, amountBreakdown);

  return normalizePendingHoldRecord({
    sessionId: assertStringField(stored, "sessionId"),
    userId: stored.userId === undefined ? undefined : (stored.userId as string | null),
    localUserRef: assertStringField(stored, "localUserRef"),
    contentId: assertStringField(stored, "contentId"),
    offerId: assertStringField(stored, "offerId"),
    packetId: stored.packetId === undefined ? undefined : (stored.packetId as string | null),
    artifactId: stored.artifactId === undefined ? undefined : (stored.artifactId as string | null),
    amount,
    amountBreakdown,
    status: status as PendingHoldRecord["status"],
    releaseStatus: releaseStatus as PendingHoldRecord["releaseStatus"],
    createdAt: assertStringField(stored, "createdAt"),
    reviewAudit: parseReviewAudit(stored.reviewAudit),
    releaseEligibleAt:
      stored.releaseEligibleAt === undefined
        ? undefined
        : (stored.releaseEligibleAt as string | null),
    appealExpiresAt:
      stored.appealExpiresAt === undefined
        ? undefined
        : (stored.appealExpiresAt as string | null),
    reverifyUsed:
      stored.reverifyUsed === undefined ? undefined : Boolean(stored.reverifyUsed)
  });
}
