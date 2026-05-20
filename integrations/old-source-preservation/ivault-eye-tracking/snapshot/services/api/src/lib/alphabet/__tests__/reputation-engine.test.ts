import { describe, expect, it } from "vitest";
import type { ReputationSignalInput } from "../../../types/alphabet/reputation.types";
import { verifyReputationProfile } from "../reputation-engine";

function makeInput(
  overrides: Partial<ReputationSignalInput> = {}
): ReputationSignalInput {
  return {
    reputationProfileId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    identityProofLevel: "document_verified",
    accountAgeDays: 120,
    trustScore: 82,
    uValueScore: 55,
    walletIntegrityScore: 0.9,
    accountIntegrityScore: 0.92,
    contributionScore: 0.75,
    creatorReputationScore: 0.6,
    workerReputationScore: 0.7,
    helperReputationScore: 0.75,
    safetyReputationScore: 0.7,
    judgmentReputationScore: 0.72,
    learningReputationScore: 0.8,
    masteryReputationScore: 0.65,
    exchangeReliabilityScore: 0.85,
    verifiedEventCount: 80,
    negativeEventCount: 1,
    severeNegativeEventCount: 0,
    impersonationRisk: 0.02,
    syntheticIdentityRisk: 0.02,
    reputationFarmingRisk: 0.03,
    banEvasionRisk: 0.01,
    deviceIntegrityScore: 0.9,
    ageBand: "18_plus",
    metadata: {},
    ...overrides
  };
}

describe("reputation-engine", () => {
  it("verifies strong reputation", () => {
    const result = verifyReputationProfile(makeInput());

    expect(result.status).toBe("reputation_verified");
    expect(result.identityStrengthScore).toBeGreaterThan(0.55);
    expect(result.reputationScore).toBeGreaterThan(0.55);
    expect(result.credibilityScore).toBeGreaterThan(0.6);
    expect(result.reputationVerifiedEvent?.eventType).toBe("reputation_verified");
    expect(result.identityStrengthenedEvent?.eventType).toBe("identity_strengthened");
  });

  it("returns emerging profile for new account", () => {
    const result = verifyReputationProfile(
      makeInput({
        accountAgeDays: 1
      })
    );

    expect(result.status).toBe("emerging_profile");
    expect(result.reasons).toContain("account_age_below_minimum");
  });

  it("returns emerging profile for too few verified events", () => {
    const result = verifyReputationProfile(
      makeInput({
        verifiedEventCount: 1
      })
    );

    expect(result.status).toBe("emerging_profile");
    expect(result.reasons).toContain("verified_event_count_below_minimum");
  });

  it("needs review for low trust", () => {
    const result = verifyReputationProfile(
      makeInput({
        trustScore: 5
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("trust_score_below_minimum");
  });

  it("detects impersonation risk", () => {
    const result = verifyReputationProfile(
      makeInput({
        impersonationRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.impersonationRiskEvent?.eventType).toBe("impersonation_risk_detected");
  });

  it("detects synthetic identity risk", () => {
    const result = verifyReputationProfile(
      makeInput({
        syntheticIdentityRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.syntheticIdentityRiskEvent?.eventType).toBe("synthetic_identity_detected");
  });

  it("detects reputation farming", () => {
    const result = verifyReputationProfile(
      makeInput({
        reputationFarmingRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("reputation_farming_risk_above_maximum");
  });

  it("restricts ban evasion", () => {
    const result = verifyReputationProfile(
      makeInput({
        banEvasionRisk: 0.95
      })
    );

    expect(result.status).toBe("restricted");
    expect(result.reasons).toContain("ban_evasion_risk_above_maximum");
  });

  it("requires guardian for under 13 unless guardian verified", () => {
    const result = verifyReputationProfile(
      makeInput({
        ageBand: "under_13",
        identityProofLevel: "email_verified",
        metadata: {
          guardianApproved: false
        }
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("under_13_guardian_required");
  });

  it("allows under 13 guardian verified reputation", () => {
    const result = verifyReputationProfile(
      makeInput({
        ageBand: "under_13",
        identityProofLevel: "guardian_verified",
        metadata: {
          guardianApproved: true
        }
      })
    );

    expect(["identity_strengthened", "reputation_verified", "credible_profile"]).toContain(
      result.status
    );
  });
});
