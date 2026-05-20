import { beforeEach, describe, expect, it } from "vitest";
import {
  createGrantEligibilityRecord,
  evaluateStoredGrantEligibility,
  getGrantEligibilityRecord,
  getGrantEvaluationResult,
  listGrantEligibilityRecordsForUser,
  resetGrantStoreForTests,
  updateGrantAuditStatus,
  updateGrantReviewStatus,
  updateGrantTreasuryStatus
} from "../grant-store";

describe("grant-store", () => {
  beforeEach(() => {
    resetGrantStoreForTests();
  });

  function createBaseRecord() {
    return createGrantEligibilityRecord({
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      grantType: "rare_reward",
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
      grantAmount: 1000,
      rewardCoinCode: "I",
      ageBand: "18_plus",
      regionCode: "US",
      secrecyMode: true
    });
  }

  it("creates grant eligibility record", () => {
    const record = createBaseRecord();
    expect(record.status).toBe("eligibility_created");
    const stored = getGrantEligibilityRecord(record.grantEligibilityId);
    expect(stored?.grantEligibilityId).toBe(record.grantEligibilityId);
  });

  it("updates review audit and treasury statuses", () => {
    const record = createBaseRecord();
    updateGrantReviewStatus({
      grantEligibilityId: record.grantEligibilityId,
      reviewStatus: "approved"
    });
    updateGrantAuditStatus({
      grantEligibilityId: record.grantEligibilityId,
      auditStatus: "complete"
    });
    const treasury = updateGrantTreasuryStatus({
      grantEligibilityId: record.grantEligibilityId,
      treasuryStatus: "funded"
    });
    expect(treasury.treasuryStatus).toBe("funded");
  });

  it("evaluates stored grant and issues", () => {
    const record = createBaseRecord();
    updateGrantReviewStatus({
      grantEligibilityId: record.grantEligibilityId,
      reviewStatus: "approved"
    });
    updateGrantAuditStatus({
      grantEligibilityId: record.grantEligibilityId,
      auditStatus: "complete"
    });
    updateGrantTreasuryStatus({
      grantEligibilityId: record.grantEligibilityId,
      treasuryStatus: "funded"
    });

    const result = evaluateStoredGrantEligibility({
      grantEligibilityId: record.grantEligibilityId,
      fraudRisk: 0.01,
      safetyRisk: 0.01,
      paymentRisk: 0.01,
      reputationRisk: 0.01,
      complianceRisk: 0.01,
      regionEligible: true,
      treasuryBudgetAvailable: 10000,
      treasuryReserveRequested: true,
      treasuryReserveApproved: true,
      guardianApprovalRequired: false,
      guardianApprovalReceived: false,
      manualGrantRequested: false,
      adminApproved: false,
      issueRequested: true,
      completeRequested: false,
      cancelRequested: false
    });

    expect(result.status).toBe("grant_issued");

    const updated = getGrantEligibilityRecord(record.grantEligibilityId);
    expect(updated?.status).toBe("issued");

    const storedResult = getGrantEvaluationResult(record.grantEligibilityId);
    expect(storedResult?.status).toBe("grant_issued");
  });

  it("lists grants for user", () => {
    const record = createBaseRecord();
    expect(listGrantEligibilityRecordsForUser(record.userId)).toHaveLength(1);
  });

  it("marks review required when review missing", () => {
    const record = createBaseRecord();

    const result = evaluateStoredGrantEligibility({
      grantEligibilityId: record.grantEligibilityId,
      fraudRisk: 0.01,
      safetyRisk: 0.01,
      paymentRisk: 0.01,
      reputationRisk: 0.01,
      complianceRisk: 0.01,
      regionEligible: true,
      treasuryBudgetAvailable: 10000,
      treasuryReserveRequested: true,
      treasuryReserveApproved: true,
      guardianApprovalRequired: false,
      guardianApprovalReceived: false,
      manualGrantRequested: false,
      adminApproved: false,
      issueRequested: false,
      completeRequested: false,
      cancelRequested: false
    });

    expect(result.status).toBe("grant_review_required");
  });
});
