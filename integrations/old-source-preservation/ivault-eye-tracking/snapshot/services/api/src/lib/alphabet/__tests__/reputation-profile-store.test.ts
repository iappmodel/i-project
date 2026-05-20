import { beforeEach, describe, expect, it } from "vitest";
import {
  createReputationProfile,
  getReputationProfileByUserId,
  getReputationVerificationResult,
  resetReputationProfileStoreForTests,
  updateIdentityProofLevel,
  verifyStoredReputationProfile
} from "../reputation-profile-store";

describe("reputation-profile-store", () => {
  beforeEach(() => {
    resetReputationProfileStoreForTests();
  });

  it("creates reputation profile", () => {
    const userId = crypto.randomUUID();

    const profile = createReputationProfile({
      userId,
      identityProofLevel: "email_verified",
      ageBand: "18_plus"
    });

    expect(profile.status).toBe("created");

    const stored = getReputationProfileByUserId(userId);
    expect(stored?.reputationProfileId).toBe(profile.reputationProfileId);
  });

  it("returns existing profile for duplicate user", () => {
    const userId = crypto.randomUUID();

    const first = createReputationProfile({
      userId,
      identityProofLevel: "email_verified",
      ageBand: "18_plus"
    });

    const second = createReputationProfile({
      userId,
      identityProofLevel: "document_verified",
      ageBand: "18_plus"
    });

    expect(second.reputationProfileId).toBe(first.reputationProfileId);
  });

  it("updates identity proof level", () => {
    const userId = crypto.randomUUID();

    createReputationProfile({
      userId,
      identityProofLevel: "email_verified",
      ageBand: "18_plus"
    });

    const updated = updateIdentityProofLevel({
      userId,
      identityProofLevel: "document_verified"
    });

    expect(updated.identityProofLevel).toBe("document_verified");
  });

  it("verifies stored reputation profile", () => {
    const userId = crypto.randomUUID();

    const profile = createReputationProfile({
      userId,
      identityProofLevel: "document_verified",
      ageBand: "18_plus"
    });

    const result = verifyStoredReputationProfile({
      userId,
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
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("reputation_verified");

    const storedResult = getReputationVerificationResult(profile.reputationProfileId);
    expect(storedResult?.status).toBe("reputation_verified");

    const updatedProfile = getReputationProfileByUserId(userId);
    expect(updatedProfile?.status).toBe("reputation_verified");
  });
});
