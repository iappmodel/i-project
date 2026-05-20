import type { PolicyGateResult } from "../../../types/alphabet/policy-orchestrator.types";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createPolicyDecisionRecord,
  evaluateStoredPolicyDecision,
  getPolicyDecisionRecord,
  getPolicyEvaluationResult,
  listPolicyDecisionRecords,
  resetPolicyOrchestratorStoreForTests
} from "../policy-orchestrator-store";

function gate(
  gateName: PolicyGateResult["gateName"],
  decision: PolicyGateResult["decision"] = "pass"
): PolicyGateResult {
  return {
    gateName,
    decision,
    score: decision === "pass" ? 0.95 : 0.3,
    riskScore: decision === "fail" ? 0.8 : 0.05,
    hardBlock: false,
    reasonCodes: [`${gateName}_${decision}`]
  };
}

function lowRisk() {
  return {
    ageRisk: 0.01,
    safetyRisk: 0.01,
    rightsRisk: 0.01,
    fraudRisk: 0.01,
    paymentRisk: 0.01,
    treasuryRisk: 0.01,
    privacyRisk: 0.01,
    complianceRisk: 0.01,
    reputationRisk: 0.01
  };
}

describe("policy-orchestrator-store", () => {
  beforeEach(() => {
    resetPolicyOrchestratorStoreForTests();
  });

  it("creates policy decision record", () => {
    const record = createPolicyDecisionRecord({
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      contentId: crypto.randomUUID(),
      actionType: "view_content",
      primaryDomain: "safety",
      gateResults: [gate("age"), gate("safety")],
      riskSignals: lowRisk(),
      ageBand: "18_plus",
      trustScore: 80,
      uValueScore: 40
    });

    expect(record.status).toBe("policy_held");

    const stored = getPolicyDecisionRecord(record.policyDecisionId);
    expect(stored?.policyDecisionId).toBe(record.policyDecisionId);
  });

  it("evaluates stored policy decision", () => {
    const record = createPolicyDecisionRecord({
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      contentId: crypto.randomUUID(),
      actionType: "view_content",
      primaryDomain: "safety",
      gateResults: [gate("age"), gate("safety")],
      riskSignals: lowRisk(),
      ageBand: "18_plus",
      trustScore: 80,
      uValueScore: 40
    });

    const result = evaluateStoredPolicyDecision({
      policyDecisionId: record.policyDecisionId,
      actionRequested: true,
      reviewRequested: false,
      auditRequested: false,
      treasuryRequested: false,
      notificationRequested: true
    });

    expect(result.status).toBe("policy_allowed");

    const updated = getPolicyDecisionRecord(record.policyDecisionId);
    expect(updated?.status).toBe("policy_allowed");

    const storedResult = getPolicyEvaluationResult(record.policyDecisionId);
    expect(storedResult?.status).toBe("policy_allowed");
  });

  it("lists policy decisions", () => {
    const userId = crypto.randomUUID();

    createPolicyDecisionRecord({
      userId,
      actionType: "view_content",
      primaryDomain: "safety",
      gateResults: [gate("age"), gate("safety")],
      riskSignals: lowRisk(),
      ageBand: "18_plus",
      trustScore: 80,
      uValueScore: 40
    });

    expect(listPolicyDecisionRecords({ userId })).toHaveLength(1);
    expect(listPolicyDecisionRecords({ actionType: "view_content" })).toHaveLength(1);
  });

  it("stores blocked decision", () => {
    const record = createPolicyDecisionRecord({
      userId: crypto.randomUUID(),
      contentId: crypto.randomUUID(),
      actionType: "view_content",
      primaryDomain: "safety",
      gateResults: [gate("age"), gate("safety", "fail")],
      riskSignals: lowRisk(),
      ageBand: "18_plus",
      trustScore: 80,
      uValueScore: 40
    });

    const result = evaluateStoredPolicyDecision({
      policyDecisionId: record.policyDecisionId,
      actionRequested: true,
      reviewRequested: false,
      auditRequested: false,
      treasuryRequested: false,
      notificationRequested: true
    });

    expect(result.status).toBe("policy_blocked");

    const updated = getPolicyDecisionRecord(record.policyDecisionId);
    expect(updated?.decision).toBe("block");
  });
});
