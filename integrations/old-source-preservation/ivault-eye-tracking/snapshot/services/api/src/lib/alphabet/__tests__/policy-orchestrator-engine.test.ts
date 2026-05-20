import type {
  PolicyGateResult,
  PolicyOrchestratorSignalInput
} from "../../../types/alphabet/policy-orchestrator.types";
import { describe, expect, it } from "vitest";
import { evaluatePolicyDecision } from "../policy-orchestrator-engine";

function gate(
  gateName: PolicyGateResult["gateName"],
  decision: PolicyGateResult["decision"] = "pass",
  overrides: Partial<PolicyGateResult> = {}
): PolicyGateResult {
  return {
    gateName,
    decision,
    score: decision === "pass" ? 0.95 : decision === "limited" ? 0.7 : 0.2,
    riskScore: decision === "fail" ? 0.8 : 0.05,
    hardBlock: false,
    reasonCodes: [`${gateName}_${decision}`],
    sourceObjectId: crypto.randomUUID(),
    sourceEventId: crypto.randomUUID(),
    ...overrides
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

function makeInput(
  overrides: Partial<PolicyOrchestratorSignalInput> = {}
): PolicyOrchestratorSignalInput {
  return {
    policyDecisionId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    creatorId: null,
    businessId: null,
    walletId: crypto.randomUUID(),
    contentId: crypto.randomUUID(),
    campaignId: null,
    grantEligibilityId: null,
    actionType: "view_content",
    primaryDomain: "safety",
    gateResults: [gate("age"), gate("safety")],
    riskSignals: lowRisk(),
    ageBand: "18_plus",
    trustScore: 80,
    uValueScore: 40,
    walletStatus: "active",
    contentSafetyStatus: "safety_allowed",
    contentRightsStatus: null,
    treasuryReserveStatus: null,
    reviewStatus: null,
    auditStatus: null,
    adminCommandStatus: null,
    actionRequested: true,
    reviewRequested: false,
    auditRequested: false,
    treasuryRequested: false,
    notificationRequested: true,
    metadata: {},
    ...overrides
  };
}

describe("policy-orchestrator-engine", () => {
  it("allows clean content view", () => {
    const result = evaluatePolicyDecision(makeInput());

    expect(result.status).toBe("policy_allowed");
    expect(result.allowed).toBe(true);
    expect(result.policyAllowedEvent?.eventType).toBe("policy_allowed");
  });

  it("blocks when safety gate fails", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        gateResults: [gate("age"), gate("safety", "fail")]
      })
    );

    expect(result.status).toBe("policy_blocked");
    expect(result.blocked).toBe(true);
    expect(result.reasons).toContain("safety_gate_failed");
  });

  it("requires guardian when age gate requires it", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        gateResults: [gate("age", "required"), gate("safety")],
        ageBand: "13_15"
      })
    );

    expect(result.status).toBe("policy_guardian_required");
    expect(result.guardianRequired).toBe(true);
  });

  it("requires verification when required gate is missing", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        gateResults: [gate("age")]
      })
    );

    expect(result.status).toBe("policy_verification_required");
    expect(result.requiredGatesMissing).toContain("safety");
  });

  it("requires verification for unknown age on sensitive action", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        ageBand: "unknown"
      })
    );

    expect(result.status).toBe("policy_verification_required");
  });

  it("blocks monetization when rights fail", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        actionType: "monetize_content",
        primaryDomain: "rights",
        gateResults: [
          gate("age"),
          gate("safety"),
          gate("rights", "fail"),
          gate("trust"),
          gate("wallet")
        ],
        trustScore: 80,
        uValueScore: 40
      })
    );

    expect(result.status).toBe("policy_blocked");
    expect(result.reasons).toContain("rights_gate_failed");
  });

  it("requires audit for clean withdrawal when audit gate is required", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        actionType: "withdraw",
        primaryDomain: "payment",
        gateResults: [
          gate("age"),
          gate("trust"),
          gate("wallet"),
          gate("payment"),
          gate("audit", "required")
        ],
        trustScore: 90,
        uValueScore: 40
      })
    );

    expect(result.status).toBe("policy_audit_required");
    expect(result.auditRequired).toBe(true);
  });

  it("requires treasury for grant issuance when treasury gate is required", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        actionType: "issue_grant",
        primaryDomain: "grant",
        grantEligibilityId: crypto.randomUUID(),
        gateResults: [
          gate("age"),
          gate("trust"),
          gate("wallet"),
          gate("payment"),
          gate("treasury", "required"),
          gate("grant"),
          gate("review"),
          gate("audit")
        ],
        trustScore: 90,
        uValueScore: 80
      })
    );

    expect(result.status).toBe("policy_treasury_required");
    expect(result.treasuryRequired).toBe(true);
  });

  it("escalates high compliance risk", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        riskSignals: {
          ...lowRisk(),
          complianceRisk: 0.9
        }
      })
    );

    expect(result.status).toBe("policy_escalated");
    expect(result.escalated).toBe(true);
  });

  it("limits when gate is limited", () => {
    const result = evaluatePolicyDecision(
      makeInput({
        gateResults: [gate("age"), gate("safety", "limited")]
      })
    );

    expect(result.status).toBe("policy_limited");
    expect(result.limited).toBe(true);
  });
});
