import { describe, expect, it } from "vitest";
import type { PolicySignalInput } from "@/types/alphabet/policy.types";
import { evaluatePolicy } from "../policy-engine";

function makeInput(overrides: Partial<PolicySignalInput> = {}): PolicySignalInput {
  return {
    policyCheckId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    ageBand: "18_plus",
    userRole: "user",
    context: "withdrawal",
    actionType: "request_withdrawal",
    riskCategory: "financial",
    region: "US",
    countryCode: "US",
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
    regionRequiresGuardianForMinors: false,
    metadata: {},
    ...overrides
  };
}

describe("policy-engine", () => {
  it("allows clean adult withdrawal policy", () => {
    const result = evaluatePolicy(makeInput());

    expect(["allowed", "allowed_with_limits"]).toContain(result.status);
    expect(result.allowAction).toBe(true);
    expect(result.blockAction).toBe(false);
  });

  it("blocks under 13 withdrawal", () => {
    const result = evaluatePolicy(
      makeInput({
        ageBand: "under_13",
        guardianApproved: true
      })
    );

    expect(result.status).toBe("blocked_age");
    expect(result.blockAction).toBe(true);
    expect(result.reasons).toContain("under_13_not_allowed");
  });

  it("allows teen conversion with guardian limits", () => {
    const result = evaluatePolicy(
      makeInput({
        context: "conversion",
        actionType: "convert_to_icoin",
        ageBand: "13_15",
        guardianApproved: true,
        kycStatus: "not_required",
        taxProfileStatus: "not_required"
      })
    );

    expect(["allowed_with_guardian", "allowed_with_limits"]).toContain(
      result.status
    );
    expect(result.allowAction).toBe(true);
  });

  it("blocks region restricted action", () => {
    const result = evaluatePolicy(
      makeInput({
        regionRestricted: true
      })
    );

    expect(result.status).toBe("blocked_region");
    expect(result.reasons).toContain("region_restricted");
  });

  it("blocks compliance status", () => {
    const result = evaluatePolicy(
      makeInput({
        complianceStatus: "sanctions_match"
      })
    );

    expect(result.status).toBe("blocked_compliance");
    expect(result.reasons).toContain("compliance_status_blocked");
  });

  it("requires review when KYC is required but missing", () => {
    const result = evaluatePolicy(
      makeInput({
        kycStatus: "not_started"
      })
    );

    expect(result.status).toBe("requires_review");
    expect(result.requireKyc).toBe(true);
    expect(result.reasons).toContain("kyc_required");
  });

  it("requires review when tax profile is required but missing", () => {
    const result = evaluatePolicy(
      makeInput({
        taxProfileStatus: "missing"
      })
    );

    expect(result.status).toBe("requires_review");
    expect(result.requireTaxProfile).toBe(true);
    expect(result.reasons).toContain("tax_profile_required");
  });

  it("blocks high financial risk", () => {
    const result = evaluatePolicy(
      makeInput({
        financialRisk: 0.95
      })
    );

    expect(result.status).toBe("blocked_risk");
    expect(result.reasons).toContain("financial_risk_above_maximum");
  });

  it("allows under 13 learning with guardian/school", () => {
    const result = evaluatePolicy(
      makeInput({
        context: "learning",
        actionType: "start_learning_session",
        riskCategory: "none",
        ageBand: "under_13",
        guardianApproved: true,
        schoolApproved: true,
        kycStatus: "not_required",
        taxProfileStatus: "not_required",
        trustScore: 10,
        uValueScore: 0
      })
    );

    expect(["allowed_with_limits", "allowed_with_guardian", "allowed"]).toContain(
      result.status
    );
    expect(result.allowAction).toBe(true);
  });

  it("blocks unknown age for withdrawal", () => {
    const result = evaluatePolicy(
      makeInput({
        ageBand: "unknown"
      })
    );

    expect(result.status).toBe("blocked_age");
    expect(result.reasons).toContain("unknown_age_not_allowed");
  });

  it("blocks under 13 messaging", () => {
    const result = evaluatePolicy(
      makeInput({
        context: "messaging",
        actionType: "send_message",
        riskCategory: "messaging",
        ageBand: "under_13",
        guardianApproved: true,
        kycStatus: "not_required",
        taxProfileStatus: "not_required"
      })
    );

    expect(result.status).toBe("blocked_age");
    expect(result.blockAction).toBe(true);
  });

  it("requires adult/admin checks for admin review", () => {
    const result = evaluatePolicy(
      makeInput({
        context: "admin_review",
        actionType: "review_case",
        riskCategory: "sensitive",
        userRole: "reviewer",
        ageBand: "16_17",
        guardianApproved: true,
        kycStatus: "verified",
        taxProfileStatus: "not_required"
      })
    );

    expect(result.status).toBe("blocked_age");
    expect(result.reasons).toContain("age_16_17_not_allowed");
  });
});
