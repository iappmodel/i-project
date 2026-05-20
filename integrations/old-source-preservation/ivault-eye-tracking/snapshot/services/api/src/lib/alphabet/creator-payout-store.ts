import { CREATOR_PAYOUT_RULES } from "../../data/alphabet/creator-payout-rules";
import type {
  CreatorContentSafetyStatus,
  CreatorDisputeStatus,
  CreatorPayoutRecord,
  CreatorPayoutRecordStatus,
  CreatorPayoutResult,
  CreatorPayoutSignalInput,
  CreatorRevenueSource,
  CreatorSplitRecipient
} from "../../types/alphabet/creator-payout.types";
import {
  calculateCreatorPayoutAmounts,
  calculateCreatorSplits,
  evaluateCreatorPayout
} from "./creator-payout-engine";

type CreatorPayoutStoreState = {
  records: Map<string, CreatorPayoutRecord>;
  results: Map<string, CreatorPayoutResult>;
};

const store: CreatorPayoutStoreState = {
  records: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addHours(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function getRule(revenueSource: CreatorRevenueSource) {
  return CREATOR_PAYOUT_RULES.find(
    (rule) => rule.active && rule.revenueSource === revenueSource
  );
}

function mapStatus(status: CreatorPayoutResult["status"]): CreatorPayoutRecordStatus {
  switch (status) {
    case "payout_created":
      return "created";
    case "payout_pending_hold":
      return "pending_hold";
    case "payout_approved":
      return "approved";
    case "payout_rejected":
      return "rejected";
    case "payout_disputed":
      return "disputed";
    case "payout_reversed":
      return "reversed";
    case "payout_pool_unavailable":
      return "pool_unavailable";
    case "payout_suspicious":
      return "suspicious";
    default:
      return "created";
  }
}

export function createCreatorPayoutRecord(params: {
  creatorId: string;
  userId: string;
  walletId: string;
  revenueSource: CreatorRevenueSource;
  sourceObjectId?: string | null;
  grossRevenue: number;
  taxWithholdingRate?: number;
  collaborators: Array<Omit<CreatorSplitRecipient, "splitAmount">>;
  disputeStatus?: CreatorDisputeStatus;
  contentSafetyStatus?: CreatorContentSafetyStatus;
}): CreatorPayoutRecord {
  const rule = getRule(params.revenueSource);

  if (!rule) {
    throw new Error("Creator payout rule not found.");
  }

  const amounts = calculateCreatorPayoutAmounts({
    grossRevenue: params.grossRevenue,
    platformFeeRate: rule.platformFeeRate,
    taxWithholdingRate: params.taxWithholdingRate ?? 0
  });

  const collaborators = calculateCreatorSplits({
    distributableAmount: amounts.distributableAmount,
    recipients: params.collaborators
  });

  const now = nowIso();

  const record: CreatorPayoutRecord = {
    creatorPayoutId: createId("creator_payout"),
    creatorId: params.creatorId,
    userId: params.userId,
    walletId: params.walletId,
    revenueSource: params.revenueSource,
    sourceObjectId: params.sourceObjectId ?? null,
    grossRevenue: params.grossRevenue,
    platformFeeRate: rule.platformFeeRate,
    platformFeeAmount: amounts.platformFeeAmount,
    taxWithholdingEstimate: amounts.taxWithholdingEstimate,
    creatorNetRevenue: amounts.creatorNetRevenue,
    distributableAmount: amounts.distributableAmount,
    collaborators,
    payoutHoldHours: rule.defaultPayoutHoldHours,
    holdUntil: rule.defaultPayoutHoldHours > 0 ? addHours(rule.defaultPayoutHoldHours) : null,
    disputeStatus: params.disputeStatus ?? "none",
    contentSafetyStatus: params.contentSafetyStatus ?? "clear",
    status: "created",
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
    completedAt: null
  };

  store.records.set(record.creatorPayoutId, record);

  return record;
}

export function getCreatorPayoutRecord(
  creatorPayoutId: string
): CreatorPayoutRecord | null {
  return store.records.get(creatorPayoutId) ?? null;
}

export function listCreatorPayoutRecordsForCreator(
  creatorId: string
): CreatorPayoutRecord[] {
  return Array.from(store.records.values()).filter(
    (record) => record.creatorId === creatorId
  );
}

export function evaluateStoredCreatorPayout(
  input: Omit<
    CreatorPayoutSignalInput,
    | "creatorPayoutId"
    | "creatorId"
    | "userId"
    | "walletId"
    | "revenueSource"
    | "sourceObjectId"
    | "grossRevenue"
    | "platformFeeRate"
    | "platformFeeAmount"
    | "taxWithholdingEstimate"
    | "creatorNetRevenue"
    | "distributableAmount"
    | "collaborators"
    | "payoutHoldHours"
    | "holdExpired"
    | "disputeStatus"
    | "contentSafetyStatus"
  > & {
    creatorPayoutId: string;
    holdExpired?: boolean;
  }
): CreatorPayoutResult {
  const record = getCreatorPayoutRecord(input.creatorPayoutId);

  if (!record) {
    throw new Error("Creator payout record not found.");
  }

  const holdExpired =
    input.holdExpired ??
    (record.holdUntil ? new Date(record.holdUntil).getTime() <= Date.now() : true);

  const result = evaluateCreatorPayout({
    ...input,
    creatorPayoutId: record.creatorPayoutId,
    creatorId: record.creatorId,
    userId: record.userId,
    walletId: record.walletId,
    revenueSource: record.revenueSource,
    sourceObjectId: record.sourceObjectId,
    grossRevenue: record.grossRevenue,
    platformFeeRate: record.platformFeeRate,
    platformFeeAmount: record.platformFeeAmount,
    taxWithholdingEstimate: record.taxWithholdingEstimate,
    creatorNetRevenue: record.creatorNetRevenue,
    distributableAmount: record.distributableAmount,
    collaborators: record.collaborators,
    payoutHoldHours: record.payoutHoldHours,
    holdExpired,
    disputeStatus: record.disputeStatus,
    contentSafetyStatus: record.contentSafetyStatus,
    metadata: {
      ...input.metadata
    }
  });

  const nextStatus = input.completionRequested && result.status === "payout_approved"
    ? "completed"
    : mapStatus(result.status);

  const now = nowIso();

  const next: CreatorPayoutRecord = {
    ...record,
    status: nextStatus,
    approvedAt:
      result.status === "payout_approved" && !record.approvedAt
        ? now
        : record.approvedAt,
    completedAt:
      nextStatus === "completed" && !record.completedAt
        ? now
        : record.completedAt,
    updatedAt: now
  };

  store.records.set(next.creatorPayoutId, next);
  store.results.set(result.creatorPayoutId, result);

  return result;
}

export function updateCreatorPayoutDisputeStatus(params: {
  creatorPayoutId: string;
  disputeStatus: CreatorDisputeStatus;
}): CreatorPayoutRecord {
  const record = getCreatorPayoutRecord(params.creatorPayoutId);

  if (!record) {
    throw new Error("Creator payout record not found.");
  }

  const next: CreatorPayoutRecord = {
    ...record,
    disputeStatus: params.disputeStatus,
    status:
      params.disputeStatus === "opened" || params.disputeStatus === "under_review"
        ? "disputed"
        : record.status,
    updatedAt: nowIso()
  };

  store.records.set(next.creatorPayoutId, next);
  return next;
}

export function getCreatorPayoutResult(
  creatorPayoutId: string
): CreatorPayoutResult | null {
  return store.results.get(creatorPayoutId) ?? null;
}

export function resetCreatorPayoutStoreForTests(): void {
  store.records.clear();
  store.results.clear();
}
