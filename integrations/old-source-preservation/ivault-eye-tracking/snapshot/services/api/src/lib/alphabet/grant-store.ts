import type {
  GrantAgeBand,
  GrantAuditStatus,
  GrantEligibilityRecord,
  GrantEvaluationResult,
  GrantRecordStatus,
  GrantReviewStatus,
  GrantSignalInput,
  GrantTreasuryStatus,
  GrantType
} from "../../types/alphabet/grant.types";
import type { CoinCode } from "../../types/alphabet/coin.types";
import { evaluateGrantEligibility } from "./grant-engine";

type GrantStoreState = {
  records: Map<string, GrantEligibilityRecord>;
  results: Map<string, GrantEvaluationResult>;
};

const store: GrantStoreState = {
  records: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapStatus(status: GrantEvaluationResult["status"]): GrantRecordStatus {
  switch (status) {
    case "grant_eligible":
      return "eligible";
    case "grant_ineligible":
      return "ineligible";
    case "grant_review_required":
      return "review_required";
    case "grant_approved":
      return "approved";
    case "grant_rejected":
      return "rejected";
    case "grant_treasury_pending":
      return "treasury_pending";
    case "grant_funded":
      return "funded";
    case "grant_issued":
      return "issued";
    case "grant_canceled":
      return "canceled";
    default:
      return "eligibility_created";
  }
}

export function createGrantEligibilityRecord(params: {
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  grantType: GrantType;
  uValueScore: number;
  trustScore: number;
  contributionScore: number;
  learningScore: number;
  creationScore: number;
  helpScore: number;
  safetyScore: number;
  originalityScore: number;
  economicNeedScore: number;
  communityImpactScore: number;
  consistencyScore: number;
  rarityScore: number;
  grantAmount: number;
  rewardCoinCode?: CoinCode | null;
  realWorldRewardDescription?: string | null;
  ageBand: GrantAgeBand;
  regionCode?: string | null;
  secrecyMode?: boolean;
}): GrantEligibilityRecord {
  const now = nowIso();

  const record: GrantEligibilityRecord = {
    grantEligibilityId: createId("grant_eligibility"),
    userId: params.userId,
    creatorId: params.creatorId ?? null,
    businessId: params.businessId ?? null,
    walletId: params.walletId ?? null,
    grantType: params.grantType,
    status: "eligibility_created",
    uValueScore: params.uValueScore,
    trustScore: params.trustScore,
    contributionScore: params.contributionScore,
    learningScore: params.learningScore,
    creationScore: params.creationScore,
    helpScore: params.helpScore,
    safetyScore: params.safetyScore,
    originalityScore: params.originalityScore,
    economicNeedScore: params.economicNeedScore,
    communityImpactScore: params.communityImpactScore,
    consistencyScore: params.consistencyScore,
    rarityScore: params.rarityScore,
    grantAmount: params.grantAmount,
    rewardCoinCode: params.rewardCoinCode ?? null,
    realWorldRewardDescription: params.realWorldRewardDescription ?? null,
    ageBand: params.ageBand,
    regionCode: params.regionCode ?? null,
    reviewStatus: "none",
    auditStatus: "none",
    treasuryStatus: "none",
    secrecyMode: params.secrecyMode ?? false,
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
    issuedAt: null,
    completedAt: null
  };

  store.records.set(record.grantEligibilityId, record);
  return record;
}

export function getGrantEligibilityRecord(
  grantEligibilityId: string
): GrantEligibilityRecord | null {
  return store.records.get(grantEligibilityId) ?? null;
}

export function updateGrantReviewStatus(params: {
  grantEligibilityId: string;
  reviewStatus: GrantReviewStatus;
}): GrantEligibilityRecord {
  const record = getGrantEligibilityRecord(params.grantEligibilityId);
  if (!record) throw new Error("Grant eligibility record not found.");

  const next: GrantEligibilityRecord = {
    ...record,
    reviewStatus: params.reviewStatus,
    updatedAt: nowIso()
  };

  store.records.set(next.grantEligibilityId, next);
  return next;
}

export function updateGrantAuditStatus(params: {
  grantEligibilityId: string;
  auditStatus: GrantAuditStatus;
}): GrantEligibilityRecord {
  const record = getGrantEligibilityRecord(params.grantEligibilityId);
  if (!record) throw new Error("Grant eligibility record not found.");

  const next: GrantEligibilityRecord = {
    ...record,
    auditStatus: params.auditStatus,
    updatedAt: nowIso()
  };

  store.records.set(next.grantEligibilityId, next);
  return next;
}

export function updateGrantTreasuryStatus(params: {
  grantEligibilityId: string;
  treasuryStatus: GrantTreasuryStatus;
}): GrantEligibilityRecord {
  const record = getGrantEligibilityRecord(params.grantEligibilityId);
  if (!record) throw new Error("Grant eligibility record not found.");

  const next: GrantEligibilityRecord = {
    ...record,
    treasuryStatus: params.treasuryStatus,
    updatedAt: nowIso()
  };

  store.records.set(next.grantEligibilityId, next);
  return next;
}

export function evaluateStoredGrantEligibility(
  input: Omit<
    GrantSignalInput,
    | "grantEligibilityId"
    | "userId"
    | "creatorId"
    | "businessId"
    | "walletId"
    | "grantType"
    | "currentStatus"
    | "uValueScore"
    | "trustScore"
    | "contributionScore"
    | "learningScore"
    | "creationScore"
    | "helpScore"
    | "safetyScore"
    | "originalityScore"
    | "economicNeedScore"
    | "communityImpactScore"
    | "consistencyScore"
    | "rarityScore"
    | "ageBand"
    | "regionCode"
    | "requestedGrantAmount"
    | "treasuryStatus"
    | "reviewStatus"
    | "auditStatus"
    | "rewardCoinCode"
    | "realWorldRewardDescription"
    | "secrecyMode"
  > & { grantEligibilityId: string }
): GrantEvaluationResult {
  const record = getGrantEligibilityRecord(input.grantEligibilityId);
  if (!record) throw new Error("Grant eligibility record not found.");

  const result = evaluateGrantEligibility({
    ...input,
    grantEligibilityId: record.grantEligibilityId,
    userId: record.userId,
    creatorId: record.creatorId,
    businessId: record.businessId,
    walletId: record.walletId,
    grantType: record.grantType,
    currentStatus: record.status,
    uValueScore: record.uValueScore,
    trustScore: record.trustScore,
    contributionScore: record.contributionScore,
    learningScore: record.learningScore,
    creationScore: record.creationScore,
    helpScore: record.helpScore,
    safetyScore: record.safetyScore,
    originalityScore: record.originalityScore,
    economicNeedScore: record.economicNeedScore,
    communityImpactScore: record.communityImpactScore,
    consistencyScore: record.consistencyScore,
    rarityScore: record.rarityScore,
    ageBand: record.ageBand,
    regionCode: record.regionCode,
    requestedGrantAmount: record.grantAmount,
    treasuryStatus: record.treasuryStatus,
    reviewStatus: record.reviewStatus,
    auditStatus: record.auditStatus,
    rewardCoinCode: record.rewardCoinCode,
    realWorldRewardDescription: record.realWorldRewardDescription,
    secrecyMode: record.secrecyMode,
    metadata: { ...input.metadata }
  });

  const now = nowIso();
  const next: GrantEligibilityRecord = {
    ...record,
    status: mapStatus(result.status),
    approvedAt: result.approved && !record.approvedAt ? now : record.approvedAt,
    issuedAt: result.issueAuthorized && !record.issuedAt ? now : record.issuedAt,
    completedAt:
      input.completeRequested && result.issueAuthorized && !record.completedAt
        ? now
        : record.completedAt,
    updatedAt: now
  };

  store.records.set(next.grantEligibilityId, next);
  store.results.set(result.grantEligibilityId, result);
  return result;
}

export function listGrantEligibilityRecordsForUser(
  userId: string
): GrantEligibilityRecord[] {
  return Array.from(store.records.values()).filter(
    (record) => record.userId === userId
  );
}

export function getGrantEvaluationResult(
  grantEligibilityId: string
): GrantEvaluationResult | null {
  return store.results.get(grantEligibilityId) ?? null;
}

export function resetGrantStoreForTests(): void {
  store.records.clear();
  store.results.clear();
}
