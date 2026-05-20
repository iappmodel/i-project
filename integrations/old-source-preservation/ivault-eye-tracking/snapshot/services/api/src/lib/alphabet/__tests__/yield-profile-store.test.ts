import { beforeEach, describe, expect, it } from "vitest";
import {
  createYieldProfile,
  getYieldProfileByUserId,
  getYieldVerificationResult,
  resetYieldProfileStoreForTests,
  verifyStoredYieldProfile
} from "../yield-profile-store";

describe("yield-profile-store", () => {
  beforeEach(() => {
    resetYieldProfileStoreForTests();
  });

  it("creates yield profile", () => {
    const userId = crypto.randomUUID();

    const profile = createYieldProfile({
      userId,
      ageBand: "18_plus"
    });

    expect(profile.status).toBe("created");

    const stored = getYieldProfileByUserId(userId);
    expect(stored?.yieldProfileId).toBe(profile.yieldProfileId);
  });

  it("returns existing profile for duplicate user", () => {
    const userId = crypto.randomUUID();

    const first = createYieldProfile({
      userId,
      ageBand: "18_plus"
    });

    const second = createYieldProfile({
      userId,
      ageBand: "18_plus"
    });

    expect(second.yieldProfileId).toBe(first.yieldProfileId);
  });

  it("verifies stored yield profile", () => {
    const userId = crypto.randomUUID();

    const profile = createYieldProfile({
      userId,
      ageBand: "18_plus"
    });

    const result = verifyStoredYieldProfile({
      userId,

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
      daysSinceLastGrant: null
    });

    expect(result.status).toBe("rare_grant_candidate");

    const storedResult = getYieldVerificationResult(profile.yieldProfileId);
    expect(storedResult?.status).toBe("rare_grant_candidate");

    const updatedProfile = getYieldProfileByUserId(userId);
    expect(updatedProfile?.status).toBe("rare_candidate");
  });

  it("updates lastGrantAt when grant is awarded", () => {
    const userId = crypto.randomUUID();

    createYieldProfile({
      userId,
      ageBand: "18_plus"
    });

    verifyStoredYieldProfile({
      userId,

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

      metadata: {
        grantApproved: true
      }
    });

    const updatedProfile = getYieldProfileByUserId(userId);
    expect(updatedProfile?.lastGrantAt).toBeTruthy();
  });
});
