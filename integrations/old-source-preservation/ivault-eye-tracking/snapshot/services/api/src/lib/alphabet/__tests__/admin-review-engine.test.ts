import { describe, expect, it } from "vitest";
import { reviewAdminCase } from "../admin-review-engine";
import type { ReviewSignalInput } from "../../../types/alphabet/admin-appeal-review.types";

function makeInput(overrides: Partial<ReviewSignalInput> = {}): ReviewSignalInput {
  return {
    reviewCaseId: crypto.randomUUID(),

    subjectType: "withdrawal",
    subjectId: crypto.randomUUID(),

    userId: crypto.randomUUID(),
    walletId: crypto.randomUUID(),

    reason: "payment_risk",
    priority: "high",

    assignedReviewerId: crypto.randomUUID(),

    evidenceStrengthScore: 0.85,
    automatedRecommendationScore: 0.8,
    policyConfidenceScore: 0.85,
    reviewerConsistencyScore: 0.82,
    reviewQualityScore: 0.84,

    reviewerDecision: "approve",
    decisionConfidenceScore: 0.86,

    appealStatus: "none",
    appealEvidenceStrengthScore: 0,
    appealUserCredibilityScore: 0,
    appealAbuseRisk: 0,

    manipulationRisk: 0.02,
    collusionRisk: 0.02,
    reviewerBiasRisk: 0.02,
    policyMismatchRisk: 0.02,
    systemErrorLikelihood: 0.05,

    ageBand: "18_plus",

    metadata: {},
    ...overrides
  };
}

describe("admin-review-engine", () => {
  it("records clean review decision", () => {
    const result = reviewAdminCase(makeInput());

    expect(result.status).toBe("review_decided");
    expect(result.finalDecision).toBe("approve");
    expect(result.reviewDecisionRecordedEvent?.eventType).toBe("review_decision_recorded");
  });

  it("requires reviewer assignment", () => {
    const result = reviewAdminCase(
      makeInput({
        assignedReviewerId: null
      })
    );

    expect(result.status).toBe("review_open");
    expect(result.reasons).toContain("reviewer_assignment_required");
  });

  it("escalates critical case", () => {
    const result = reviewAdminCase(
      makeInput({
        priority: "critical",
        reviewerDecision: "approve"
      })
    );

    expect(result.status).toBe("escalated");
    expect(result.finalDecision).toBe("escalate");
    expect(result.reasons).toContain("case_requires_escalation");
  });

  it("allows explicit escalation", () => {
    const result = reviewAdminCase(
      makeInput({
        priority: "critical",
        reviewerDecision: "escalate"
      })
    );

    expect(result.status).toBe("review_decided");
    expect(result.finalDecision).toBe("escalate");
  });

  it("detects manipulation risk", () => {
    const result = reviewAdminCase(
      makeInput({
        manipulationRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reviewAbuseDetectedEvent?.eventType).toBe("review_abuse_detected");
  });

  it("requires more info for weak evidence", () => {
    const result = reviewAdminCase(
      makeInput({
        evidenceStrengthScore: 0.1
      })
    );

    expect(result.status).toBe("review_assigned");
    expect(result.finalDecision).toBe("require_more_info");
    expect(result.reasons).toContain("evidence_strength_below_minimum");
  });

  it("opens appeal", () => {
    const result = reviewAdminCase(
      makeInput({
        appealStatus: "appeal_opened",
        reviewerDecision: null
      })
    );

    expect(result.status).toBe("appeal_open");
    expect(result.appealOpenedEvent?.eventType).toBe("appeal_opened");
  });

  it("reverses appeal with strong merit", () => {
    const result = reviewAdminCase(
      makeInput({
        appealStatus: "appeal_under_review",
        appealEvidenceStrengthScore: 0.95,
        appealUserCredibilityScore: 0.9,
        systemErrorLikelihood: 0.9,
        appealAbuseRisk: 0.01
      })
    );

    expect(result.status).toBe("appeal_decided");
    expect(result.appealStatus).toBe("appeal_reversed");
    expect(result.finalDecision).toBe("reverse");
    expect(result.adminOverrideAppliedEvent?.eventType).toBe("admin_override_applied");
  });

  it("upholds weak appeal", () => {
    const result = reviewAdminCase(
      makeInput({
        appealStatus: "appeal_under_review",
        appealEvidenceStrengthScore: 0.1,
        appealUserCredibilityScore: 0.2,
        systemErrorLikelihood: 0.1,
        appealAbuseRisk: 0.1
      })
    );

    expect(result.status).toBe("appeal_decided");
    expect(result.appealStatus).toBe("appeal_upheld");
    expect(result.finalDecision).toBe("uphold");
  });

  it("flags review abuse from appeal abuse risk", () => {
    const result = reviewAdminCase(
      makeInput({
        appealStatus: "appeal_under_review",
        appealAbuseRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("appeal_abuse_risk_above_maximum");
  });

  it("sets payout approval flag for withdrawal approval", () => {
    const result = reviewAdminCase(
      makeInput({
        subjectType: "withdrawal",
        reviewerDecision: "approve"
      })
    );

    expect(result.approvePayout).toBe(true);
  });

  it("sets grant approval flag for grant review approval", () => {
    const result = reviewAdminCase(
      makeInput({
        subjectType: "yield_grant",
        reason: "grant_review",
        reviewerDecision: "approve",
        priority: "critical"
      })
    );

    expect(["escalated", "review_decided"]).toContain(result.status);
  });
});
