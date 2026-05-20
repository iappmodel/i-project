import type { YieldSignalInput } from "../../../types/alphabet/yield.types";
import { describe, expect, it } from "vitest";
import { verifyYieldProfile } from "../yield-engine";

function makeInput(overrides: Partial<YieldSignalInput> = {}): YieldSignalInput {
  return {
    yieldProfileId: crypto.randomUUID(),
    userId: crypto.randomUUID(),

    accountAgeDays: 365,

    uValueScore: 78,
    trustScore: 88,

    verifiedContributionCount: 180,
    verifiedContributionScore: 0.86,

    learningScore: 0.75,
    growthScore: 0.8,
    masteryScore: 0.7,
    helpScore: 0.88,
    nobilityScore: 0.82,
    safetyScore: 0.78,
    creationScore: 0.72,
    originalityScore: 0.68,
    workScore: 0.75,
    exchangeScore: 0.82,
    reputationScore: 0.84,
    identityStrengthScore: 0.82,

    consistencyScore: 0.86,
    longTermReliabilityScore: 0.88,
    communityBenefitScore: 0.86,

    recentPenaltyCount: 0,
    recentSeverePenaltyCount: 0,
    cooldownDaysRemaining: 0,

    volatilityScore: 0.08,
    gamingPatternScore: 0.03,

    fraudRisk: 0.02,
    grantGamingRisk: 0.02,
    collusionRisk: 0.02,
    fakeNobilityRisk: 0.01,
    reputationFarmingRisk: 0.02,
    identityRisk: 0.02,
    deviceIntegrityScore: 0.9,

    priorGrantCount: 0,
    daysSinceLastGrant: null,

    ageBand: "18_plus",

    metadata: {},
    ...overrides
  };
}

describe("yield-engine", () => {
  it("selects rare grant candidate for strong long-term value", () => {
    const result = verifyYieldProfile(makeInput());

    expect(result.status).toBe("rare_grant_candidate");
    expect(result.grantTier).not.toBe("none");
    expect(result.yieldScore).toBeGreaterThan(0.55);
    expect(result.grantEligibilityScore).toBeGreaterThan(0.82);
    expect(result.moralWeightScore).toBeGreaterThan(0.78);
    expect(result.rareGrantCandidateEvent?.eventType).toBe(
      "rare_grant_candidate_selected"
    );
  });

  it("creates value grant awarded event only when explicitly approved", () => {
    const result = verifyYieldProfile(
      makeInput({
        metadata: {
          grantApproved: true
        }
      })
    );

    expect(result.status).toBe("rare_grant_candidate");
    expect(result.valueGrantAwardedEvent?.eventType).toBe("value_grant_awarded");
  });

  it("does not award value grant without approval", () => {
    const result = verifyYieldProfile(makeInput());

    expect(result.valueGrantAwardedEvent).toBeNull();
  });

  it("returns not yet eligible for young account", () => {
    const result = verifyYieldProfile(
      makeInput({
        accountAgeDays: 5
      })
    );

    expect(result.status).toBe("not_yet_eligible");
    expect(result.reasons).toContain("account_age_below_minimum");
  });

  it("returns not yet eligible for low trust", () => {
    const result = verifyYieldProfile(
      makeInput({
        trustScore: 20
      })
    );

    expect(result.status).toBe("not_yet_eligible");
    expect(result.reasons).toContain("trust_score_below_minimum");
  });

  it("returns not yet eligible for low U Value", () => {
    const result = verifyYieldProfile(
      makeInput({
        uValueScore: 10
      })
    );

    expect(result.status).toBe("not_yet_eligible");
    expect(result.reasons).toContain("u_value_below_minimum");
  });

  it("returns cooling down for recent penalties", () => {
    const result = verifyYieldProfile(
      makeInput({
        recentPenaltyCount: 5
      })
    );

    expect(result.status).toBe("cooling_down");
    expect(result.reasons).toContain("recent_penalty_count_above_maximum");
  });

  it("disqualifies recent severe penalties", () => {
    const result = verifyYieldProfile(
      makeInput({
        recentSeverePenaltyCount: 1
      })
    );

    expect(result.status).toBe("disqualified");
    expect(result.reasons).toContain("recent_severe_penalty_blocks_yield");
  });

  it("flags grant gaming", () => {
    const result = verifyYieldProfile(
      makeInput({
        grantGamingRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.grantGamingDetectedEvent?.eventType).toBe("grant_gaming_detected");
  });

  it("flags fake nobility", () => {
    const result = verifyYieldProfile(
      makeInput({
        fakeNobilityRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("fake_nobility_risk_above_maximum");
  });

  it("requires guardian approval for minor grants", () => {
    const result = verifyYieldProfile(
      makeInput({
        ageBand: "13_15",
        metadata: {
          guardianApproved: false
        }
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("minor_grant_requires_guardian_approval");
  });

  it("allows minor with guardian approval", () => {
    const result = verifyYieldProfile(
      makeInput({
        ageBand: "13_15",
        metadata: {
          guardianApproved: true
        }
      })
    );

    expect([
      "yield_accrued",
      "grant_eligible",
      "rare_grant_candidate"
    ]).toContain(result.status);
  });
});
