import { beforeEach, describe, expect, it } from "vitest";
import {
  addReviewerNotes,
  assignReviewCase,
  createReviewCase,
  decideStoredReviewCase,
  getAdminReviewResult,
  getReviewCase,
  openAppeal,
  resetAdminReviewStoreForTests
} from "../admin-review-store";

describe("admin-review-store", () => {
  beforeEach(() => {
    resetAdminReviewStoreForTests();
  });

  it("creates review case", () => {
    const reviewCase = createReviewCase({
      subjectType: "withdrawal",
      subjectId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      reason: "payment_risk",
      priority: "high",
      evidencePacket: {
        sourceEventIds: [crypto.randomUUID()],
        sourceObjectType: "withdrawal_request",
        sourceObjectId: crypto.randomUUID(),
        machineSummary: "Withdrawal flagged for review."
      }
    });

    expect(reviewCase.status).toBe("review_open");

    const stored = getReviewCase(reviewCase.reviewCaseId);
    expect(stored?.reviewCaseId).toBe(reviewCase.reviewCaseId);
  });

  it("assigns review case", () => {
    const reviewCase = createReviewCase({
      subjectType: "withdrawal",
      subjectId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      reason: "payment_risk",
      priority: "high",
      evidencePacket: {
        sourceEventIds: []
      }
    });

    const assigned = assignReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerId: crypto.randomUUID()
    });

    expect(assigned.status).toBe("review_assigned");
    expect(assigned.assignedReviewerId).toBeTruthy();
  });

  it("adds reviewer notes", () => {
    const reviewCase = createReviewCase({
      subjectType: "withdrawal",
      subjectId: crypto.randomUUID(),
      reason: "payment_risk",
      priority: "high",
      evidencePacket: {
        sourceEventIds: []
      }
    });

    const updated = addReviewerNotes({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerNotes: "Reviewed payout details."
    });

    expect(updated.evidencePacket.reviewerNotes).toBe("Reviewed payout details.");
  });

  it("opens appeal", () => {
    const reviewCase = createReviewCase({
      subjectType: "withdrawal",
      subjectId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      reason: "user_appeal",
      priority: "normal",
      evidencePacket: {
        sourceEventIds: []
      }
    });

    const appealed = openAppeal({
      reviewCaseId: reviewCase.reviewCaseId,
      userExplanation: "This decision was incorrect."
    });

    expect(appealed.status).toBe("appeal_open");
    expect(appealed.appealStatus).toBe("appeal_opened");
    expect(appealed.evidencePacket.userExplanation).toBe("This decision was incorrect.");
  });

  it("decides stored review case", () => {
    const reviewCase = createReviewCase({
      subjectType: "withdrawal",
      subjectId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      reason: "payment_risk",
      priority: "high",
      evidencePacket: {
        sourceEventIds: [crypto.randomUUID()]
      }
    });

    assignReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerId: crypto.randomUUID()
    });

    const result = decideStoredReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,

      evidenceStrengthScore: 0.85,
      automatedRecommendationScore: 0.8,
      policyConfidenceScore: 0.85,
      reviewerConsistencyScore: 0.82,
      reviewQualityScore: 0.84,

      reviewerDecision: "approve",
      decisionConfidenceScore: 0.86,

      appealEvidenceStrengthScore: 0,
      appealUserCredibilityScore: 0,
      appealAbuseRisk: 0,

      manipulationRisk: 0.02,
      collusionRisk: 0.02,
      reviewerBiasRisk: 0.02,
      policyMismatchRisk: 0.02,
      systemErrorLikelihood: 0.05,

      ageBand: "18_plus"
    });

    expect(result.status).toBe("review_decided");

    const storedResult = getAdminReviewResult(reviewCase.reviewCaseId);
    expect(storedResult?.status).toBe("review_decided");

    const updatedCase = getReviewCase(reviewCase.reviewCaseId);
    expect(updatedCase?.status).toBe("review_decided");
  });

  it("decides appeal through stored case", () => {
    const reviewCase = createReviewCase({
      subjectType: "withdrawal",
      subjectId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      reason: "user_appeal",
      priority: "normal",
      evidencePacket: {
        sourceEventIds: [crypto.randomUUID()]
      }
    });

    assignReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerId: crypto.randomUUID()
    });

    openAppeal({
      reviewCaseId: reviewCase.reviewCaseId,
      userExplanation: "System made an error."
    });

    const result = decideStoredReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,

      evidenceStrengthScore: 0.85,
      automatedRecommendationScore: 0.8,
      policyConfidenceScore: 0.8,
      reviewerConsistencyScore: 0.82,
      reviewQualityScore: 0.84,

      reviewerDecision: null,
      decisionConfidenceScore: 0.86,

      appealStatus: "appeal_under_review",
      appealEvidenceStrengthScore: 0.95,
      appealUserCredibilityScore: 0.9,
      appealAbuseRisk: 0.01,

      manipulationRisk: 0.02,
      collusionRisk: 0.02,
      reviewerBiasRisk: 0.02,
      policyMismatchRisk: 0.02,
      systemErrorLikelihood: 0.9,

      ageBand: "18_plus"
    });

    expect(result.status).toBe("appeal_decided");
    expect(result.appealStatus).toBe("appeal_reversed");
  });
});
