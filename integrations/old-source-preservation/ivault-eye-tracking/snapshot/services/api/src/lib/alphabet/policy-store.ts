import type {
  PolicyAgeBand,
  PolicyCheck,
  PolicyContext,
  PolicyDecisionResult,
  PolicyRiskCategory,
  PolicySignalInput,
  PolicyUserRole
} from "@/types/alphabet/policy.types";
import { evaluatePolicy } from "./policy-engine";

type PolicyStoreState = {
  checks: Map<string, PolicyCheck>;
  results: Map<string, PolicyDecisionResult>;
};

const store: PolicyStoreState = {
  checks: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createPolicyCheck(params: {
  userId: string;
  ageBand: PolicyAgeBand;
  userRole: PolicyUserRole;
  context: PolicyContext;
  actionType: string;
  riskCategory: PolicyRiskCategory;
  region: string;
  countryCode: string;
}): PolicyCheck {
  const now = nowIso();

  const check: PolicyCheck = {
    policyCheckId: createId("policy_check"),
    userId: params.userId,
    ageBand: params.ageBand,
    userRole: params.userRole,
    context: params.context,
    actionType: params.actionType,
    riskCategory: params.riskCategory,
    region: params.region,
    countryCode: params.countryCode,
    status: "requires_review",
    createdAt: now,
    updatedAt: now
  };

  store.checks.set(check.policyCheckId, check);

  return check;
}

export function getPolicyCheck(policyCheckId: string): PolicyCheck | null {
  return store.checks.get(policyCheckId) ?? null;
}

export function evaluateStoredPolicyCheck(
  input: Omit<
    PolicySignalInput,
    | "policyCheckId"
    | "userId"
    | "ageBand"
    | "userRole"
    | "context"
    | "actionType"
    | "riskCategory"
    | "region"
    | "countryCode"
  > & {
    policyCheckId: string;
  }
): PolicyDecisionResult {
  const check = getPolicyCheck(input.policyCheckId);

  if (!check) {
    throw new Error("Policy check not found.");
  }

  const result = evaluatePolicy({
    ...input,
    policyCheckId: check.policyCheckId,
    userId: check.userId,
    ageBand: check.ageBand,
    userRole: check.userRole,
    context: check.context,
    actionType: check.actionType,
    riskCategory: check.riskCategory,
    region: check.region,
    countryCode: check.countryCode,
    metadata: {
      ...input.metadata
    }
  });

  const next: PolicyCheck = {
    ...check,
    status: result.status,
    updatedAt: nowIso()
  };

  store.checks.set(next.policyCheckId, next);
  store.results.set(result.policyCheckId, result);

  return result;
}

export function getPolicyDecisionResult(
  policyCheckId: string
): PolicyDecisionResult | null {
  return store.results.get(policyCheckId) ?? null;
}

export function resetPolicyStoreForTests(): void {
  store.checks.clear();
  store.results.clear();
}
