import { describe, expect, it } from "vitest";
import type { GrantSignalInput } from "../../../types/alphabet/grant.types";
import { evaluateGrantEligibility } from "../grant-engine";

function makeInput(overrides: Partial<GrantSignalInput> = {}): GrantSignalInput {
  return {
    grantEligibilityId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    creatorId: null,
    businessId: null,
    walletId: crypto.randomUUID(),
    grantType: "rare_reward",
    currentStatus: "eligibility_created",
    uValueScore: 90,
    trustScore: 90,
    contributionScore: 80,
    learningScore: 85,
    creationScore: 80,
    helpScore: 75,
    safetyScore: 95,
    originalityScore: 85,
    economicNeedScore: 30,
    communityImpactScore: 80,
    consistencyScore: 0.9,
    rarityScore: 0.95,
    fraudRisk: 0.01,
    safetyRisk: 0.01,
    paymentRisk: 0.01,
    reputationRisk: 0.01,
    complianceRisk: 0.01,
    ageBand: "18_plus",
    regionCode: "US",
    regionEligible: true,
    treasuryBudgetAvailable: 10000,
    requestedGrantAmount: 1000,
    treasuryStatus: "funded",
    treasuryReserveRequested: true,
    treasuryReserveApproved: true,
    reviewStatus: "approved",
    auditStatus: "complete",
    rewardCoinCode: "I",
    realWorldRewardDescription: null,
    guardianApprovalRequired: false,
    guardianApprovalReceived: false,
    secrecyMode: true,
    manualGrantRequested: false,
    adminApproved: false,
    issueRequested: true,
    completeRequested: false,
    cancelRequested: false,
    metadata: {},
    ...overrides
  };
}

describe("grant-engine", () => {
  it("issues clean rare reward grant", () => {
    const result = evaluateGrantEligibility(makeInput());
    expect(result.status).toBe("grant_issued");
    expect(result.issueAuthorized).toBe(true);
    expect(result.walletCreditAuthorized).toBe(true);
    expect(result.grantIssuedEvent?.eventType).toBe("grant_issued");
  });

  it("requires review when review is not approved", () => {
    const result = evaluateGrantEligibility(makeInput({ reviewStatus: "pending" }));
    expect(result.status).toBe("grant_review_required");
    expect(result.reviewRequired).toBe(true);
  });

  it("requires audit when audit is incomplete", () => {
    const result = evaluateGrantEligibility(makeInput({ auditStatus: "created" }));
    expect(result.status).toBe("grant_review_required");
    expect(result.auditRequired).toBe(true);
  });

  it("rejects high fraud risk", () => {
    const result = evaluateGrantEligibility(makeInput({ fraudRisk: 0.9 }));
    expect(result.status).toBe("grant_rejected");
    expect(result.grantRiskDetectedEvent?.eventType).toBe("grant_risk_detected");
  });

  it("marks treasury pending when budget is unavailable", () => {
    const result = evaluateGrantEligibility(
      makeInput({
        treasuryBudgetAvailable: 100,
        treasuryStatus: "pending",
        treasuryReserveApproved: false
      })
    );
    expect(result.status).toBe("grant_treasury_pending");
    expect(result.treasuryReserveRequired).toBe(true);
  });

  it("blocks minor cash grant", () => {
    const result = evaluateGrantEligibility(
      makeInput({
        grantType: "cash_grant",
        ageBand: "16_17"
      })
    );
    expect(result.status).toBe("grant_ineligible");
    expect(result.reasons).toContain("grant_not_available_to_minors");
  });

  it("requires guardian approval for youth grant", () => {
    const result = evaluateGrantEligibility(
      makeInput({
        grantType: "youth_grant",
        ageBand: "13_15",
        guardianApprovalRequired: true,
        guardianApprovalReceived: false,
        uValueScore: 60,
        trustScore: 70,
        contributionScore: 40,
        consistencyScore: 0.7,
        rarityScore: 0.6
      })
    );
    expect(result.status).toBe("grant_review_required");
    expect(result.guardianApprovalRequired).toBe(true);
  });

  it("requires admin approval for platform blessing", () => {
    const result = evaluateGrantEligibility(
      makeInput({
        grantType: "platform_blessing",
        adminApproved: false,
        uValueScore: 99,
        trustScore: 99,
        contributionScore: 90,
        learningScore: 95,
        creationScore: 95,
        helpScore: 95,
        safetyScore: 99,
        originalityScore: 98,
        economicNeedScore: 100,
        communityImpactScore: 100,
        consistencyScore: 0.99,
        rarityScore: 1
      })
    );
    expect(result.status).toBe("grant_review_required");
    expect(result.reasons).toContain("admin_approval_required");
  });

  it("creates real-world fulfillment instruction", () => {
    const result = evaluateGrantEligibility(
      makeInput({
        rewardCoinCode: null,
        walletId: null,
        realWorldRewardDescription: "Laptop for education",
        grantType: "education_grant",
        uValueScore: 80,
        trustScore: 80,
        contributionScore: 50,
        consistencyScore: 0.8,
        rarityScore: 0.7
      })
    );
    expect(result.issueAuthorized).toBe(true);
    expect(result.realWorldFulfillmentRequired).toBe(true);
    expect(result.fulfillmentInstructions[0]?.fulfillmentType).toBe(
      "scholarship_payment"
    );
  });

  it("cancels grant", () => {
    const result = evaluateGrantEligibility(makeInput({ cancelRequested: true }));
    expect(result.status).toBe("grant_canceled");
  });
});
