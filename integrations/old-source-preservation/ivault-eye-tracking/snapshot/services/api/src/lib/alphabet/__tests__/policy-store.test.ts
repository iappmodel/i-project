import { beforeEach, describe, expect, it } from "vitest";
import {
  createPolicyCheck,
  evaluateStoredPolicyCheck,
  getPolicyCheck,
  getPolicyDecisionResult,
  resetPolicyStoreForTests
} from "../policy-store";

describe("policy-store", () => {
  beforeEach(() => {
    resetPolicyStoreForTests();
  });

  it("creates policy check", () => {
    const check = createPolicyCheck({
      userId: crypto.randomUUID(),
      ageBand: "18_plus",
      userRole: "user",
      context: "withdrawal",
      actionType: "request_withdrawal",
      riskCategory: "financial",
      region: "US",
      countryCode: "US"
    });

    expect(check.status).toBe("requires_review");

    const stored = getPolicyCheck(check.policyCheckId);
    expect(stored?.policyCheckId).toBe(check.policyCheckId);
  });

  it("evaluates stored policy check", () => {
    const check = createPolicyCheck({
      userId: crypto.randomUUID(),
      ageBand: "18_plus",
      userRole: "user",
      context: "withdrawal",
      actionType: "request_withdrawal",
      riskCategory: "financial",
      region: "US",
      countryCode: "US"
    });

    const result = evaluateStoredPolicyCheck({
      policyCheckId: check.policyCheckId,
      guardianApproved: false,
      schoolApproved: false,
      businessApproved: false,
      kycStatus: "verified",
      taxProfileStatus: "verified",
      complianceStatus: "clear",
      trustScore: 80,
      uValueScore: 40,
      safetyRisk: 0.02,
      financialRisk: 0.02,
      privacyRisk: 0.02,
      contentRisk: 0.02,
      locationRisk: 0.02,
      messagingRisk: 0.02,
      laborRisk: 0.02,
      identityRisk: 0.02,
      regionRestricted: false,
      regionRequiresKyc: false,
      regionRequiresTaxProfile: false,
      regionRequiresGuardianForMinors: false
    });

    expect(["allowed", "allowed_with_limits"]).toContain(result.status);

    const storedResult = getPolicyDecisionResult(check.policyCheckId);
    expect(storedResult?.policyCheckId).toBe(check.policyCheckId);

    const updated = getPolicyCheck(check.policyCheckId);
    expect(updated?.status).toBe(result.status);
  });

  it("stores blocked region decision", () => {
    const check = createPolicyCheck({
      userId: crypto.randomUUID(),
      ageBand: "18_plus",
      userRole: "user",
      context: "withdrawal",
      actionType: "request_withdrawal",
      riskCategory: "financial",
      region: "Blocked Region",
      countryCode: "XX"
    });

    const result = evaluateStoredPolicyCheck({
      policyCheckId: check.policyCheckId,
      guardianApproved: false,
      schoolApproved: false,
      businessApproved: false,
      kycStatus: "verified",
      taxProfileStatus: "verified",
      complianceStatus: "clear",
      trustScore: 80,
      uValueScore: 40,
      safetyRisk: 0.02,
      financialRisk: 0.02,
      privacyRisk: 0.02,
      contentRisk: 0.02,
      locationRisk: 0.02,
      messagingRisk: 0.02,
      laborRisk: 0.02,
      identityRisk: 0.02,
      regionRestricted: true,
      regionRequiresKyc: false,
      regionRequiresTaxProfile: false,
      regionRequiresGuardianForMinors: false
    });

    expect(result.status).toBe("blocked_region");

    const updated = getPolicyCheck(check.policyCheckId);
    expect(updated?.status).toBe("blocked_region");
  });
});
