import type { AgeBand } from "../../types/alphabet/age-guardian.types";
import type {
  PolicyActionType,
  PolicyDecision,
  PolicyDecisionRecord,
  PolicyDomain,
  PolicyGateResult,
  PolicyOrchestratorEvaluationResult,
  PolicyOrchestratorSignalInput,
  PolicyOutcomeStatus,
  PolicyRiskSignals
} from "../../types/alphabet/policy-orchestrator.types";
import { evaluatePolicyDecision } from "./policy-orchestrator-engine";

type PolicyOrchestratorStoreState = {
  records: Map<string, PolicyDecisionRecord>;
  results: Map<string, PolicyOrchestratorEvaluationResult>;
};

const store: PolicyOrchestratorStoreState = {
  records: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapStatus(status: PolicyOutcomeStatus): PolicyDecision {
  switch (status) {
    case "policy_allowed":
      return "allow";
    case "policy_limited":
      return "allow_with_limits";
    case "policy_held":
      return "hold";
    case "policy_guardian_required":
      return "require_guardian";
    case "policy_review_required":
      return "require_review";
    case "policy_audit_required":
      return "require_audit";
    case "policy_treasury_required":
      return "require_treasury";
    case "policy_verification_required":
      return "require_verification";
    case "policy_escalated":
      return "escalate";
    default:
      return "block";
  }
}

export function createPolicyDecisionRecord(params: {
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  actionType: PolicyActionType;
  primaryDomain: PolicyDomain;

  gateResults: PolicyGateResult[];
  riskSignals: PolicyRiskSignals;

  ageBand: AgeBand;
  trustScore: number;
  uValueScore: number;

  walletStatus?: string | null;
  contentSafetyStatus?: string | null;
  contentRightsStatus?: string | null;
  treasuryReserveStatus?: string | null;
  reviewStatus?: string | null;
  auditStatus?: string | null;
  adminCommandStatus?: string | null;
}): PolicyDecisionRecord {
  const now = nowIso();

  const record: PolicyDecisionRecord = {
    policyDecisionId: createId("policy_decision"),
    userId: params.userId,
    creatorId: params.creatorId ?? null,
    businessId: params.businessId ?? null,
    walletId: params.walletId ?? null,
    contentId: params.contentId ?? null,
    campaignId: params.campaignId ?? null,
    grantEligibilityId: params.grantEligibilityId ?? null,
    actionType: params.actionType,
    primaryDomain: params.primaryDomain,
    decision: "hold",
    status: "policy_held",
    gateResults: params.gateResults,
    riskSignals: params.riskSignals,
    ageBand: params.ageBand,
    trustScore: params.trustScore,
    uValueScore: params.uValueScore,
    walletStatus: params.walletStatus ?? null,
    contentSafetyStatus: params.contentSafetyStatus ?? null,
    contentRightsStatus: params.contentRightsStatus ?? null,
    treasuryReserveStatus: params.treasuryReserveStatus ?? null,
    reviewStatus: params.reviewStatus ?? null,
    auditStatus: params.auditStatus ?? null,
    adminCommandStatus: params.adminCommandStatus ?? null,
    createdAt: now,
    updatedAt: now
  };

  store.records.set(record.policyDecisionId, record);

  return record;
}

export function getPolicyDecisionRecord(
  policyDecisionId: string
): PolicyDecisionRecord | null {
  return store.records.get(policyDecisionId) ?? null;
}

export function evaluateStoredPolicyDecision(
  input: Omit<
    PolicyOrchestratorSignalInput,
    | "policyDecisionId"
    | "userId"
    | "creatorId"
    | "businessId"
    | "walletId"
    | "contentId"
    | "campaignId"
    | "grantEligibilityId"
    | "actionType"
    | "primaryDomain"
    | "gateResults"
    | "riskSignals"
    | "ageBand"
    | "trustScore"
    | "uValueScore"
    | "walletStatus"
    | "contentSafetyStatus"
    | "contentRightsStatus"
    | "treasuryReserveStatus"
    | "reviewStatus"
    | "auditStatus"
    | "adminCommandStatus"
  > & {
    policyDecisionId: string;
  }
): PolicyOrchestratorEvaluationResult {
  const record = getPolicyDecisionRecord(input.policyDecisionId);

  if (!record) {
    throw new Error("Policy decision record not found.");
  }

  const result = evaluatePolicyDecision({
    ...input,
    policyDecisionId: record.policyDecisionId,
    userId: record.userId,
    creatorId: record.creatorId,
    businessId: record.businessId,
    walletId: record.walletId,
    contentId: record.contentId,
    campaignId: record.campaignId,
    grantEligibilityId: record.grantEligibilityId,
    actionType: record.actionType,
    primaryDomain: record.primaryDomain,
    gateResults: record.gateResults,
    riskSignals: record.riskSignals,
    ageBand: record.ageBand,
    trustScore: record.trustScore,
    uValueScore: record.uValueScore,
    walletStatus: record.walletStatus,
    contentSafetyStatus: record.contentSafetyStatus,
    contentRightsStatus: record.contentRightsStatus,
    treasuryReserveStatus: record.treasuryReserveStatus,
    reviewStatus: record.reviewStatus,
    auditStatus: record.auditStatus,
    adminCommandStatus: record.adminCommandStatus,
    metadata: {
      ...input.metadata
    }
  });

  const next: PolicyDecisionRecord = {
    ...record,
    decision: mapStatus(result.status),
    status: result.status,
    updatedAt: nowIso()
  };

  store.records.set(next.policyDecisionId, next);
  store.results.set(result.policyDecisionId, result);

  return result;
}

export function listPolicyDecisionRecords(params?: {
  userId?: string;
  actionType?: PolicyActionType;
  status?: PolicyOutcomeStatus;
}): PolicyDecisionRecord[] {
  return Array.from(store.records.values()).filter((record) => {
    if (params?.userId && record.userId !== params.userId) return false;
    if (params?.actionType && record.actionType !== params.actionType) return false;
    if (params?.status && record.status !== params.status) return false;
    return true;
  });
}

export function getPolicyEvaluationResult(
  policyDecisionId: string
): PolicyOrchestratorEvaluationResult | null {
  return store.results.get(policyDecisionId) ?? null;
}

export function resetPolicyOrchestratorStoreForTests(): void {
  store.records.clear();
  store.results.clear();
}
