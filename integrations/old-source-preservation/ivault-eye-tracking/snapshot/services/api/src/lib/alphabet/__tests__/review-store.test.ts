import { beforeEach, describe, expect, it } from "vitest";
import {
  assignReviewCase,
  attachReviewEvidence,
  createReviewAppeal,
  createReviewCase,
  evaluateStoredReviewCase,
  getReviewCase,
  getReviewEvaluationResult,
  listReviewCases,
  recordReviewDecision,
  resetReviewStoreForTests,
  startReviewCase
} from "../review-store";

describe("review-store", () => {
  beforeEach(() => {
    resetReviewStoreForTests();
  });

  it("creates review case", () => {
    const reviewCase = createReviewCase({
      subjectType: "content_safety",
      subjectId: crypto.randomUUID(),
      subjectOwnerUserId: crypto.randomUUID(),
      reason: "safety_risk",
      priority: "high",
      evidencePacketId: crypto.randomUUID()
    });

    expect(reviewCase.status).toBe("queued");

    const stored = getReviewCase(reviewCase.reviewCaseId);
    expect(stored?.reviewCaseId).toBe(reviewCase.reviewCaseId);
  });

  it("assigns review case", () => {
    const reviewCase = createReviewCase({
      subjectType: "content_safety",
      subjectId: crypto.randomUUID(),
      subjectOwnerUserId: crypto.randomUUID(),
      reason: "safety_risk",
      evidencePacketId: crypto.randomUUID()
    });

    const assigned = assignReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerRole: "safety_specialist",
      reviewerUserId: crypto.randomUUID()
    });

    expect(assigned.status).toBe("assigned");
    expect(assigned.assignedReviewerRole).toBe("safety_specialist");
  });

  it("starts review case", () => {
    const reviewCase = createReviewCase({
      subjectType: "campaign",
      subjectId: crypto.randomUUID(),
      reason: "campaign_suspension",
      evidencePacketId: crypto.randomUUID()
    });

    assignReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerRole: "reviewer",
      reviewerUserId: crypto.randomUUID()
    });

    const started = startReviewCase(reviewCase.reviewCaseId);
    expect(started.status).toBe("in_review");
  });

  it("attaches evidence", () => {
    const reviewCase = createReviewCase({
      subjectType: "withdrawal",
      subjectId: crypto.randomUUID(),
      reason: "withdrawal_hold"
    });

    expect(reviewCase.status).toBe("awaiting_evidence");

    const updated = attachReviewEvidence({
      reviewCaseId: reviewCase.reviewCaseId,
      evidencePacketId: crypto.randomUUID(),
      sourceEventIds: [crypto.randomUUID()]
    });

    expect(updated.evidencePacketId).toBeTruthy();
    expect(updated.status).toBe("queued");
  });

  it("records decision", () => {
    const reviewCase = createReviewCase({
      subjectType: "campaign",
      subjectId: crypto.randomUUID(),
      reason: "campaign_suspension",
      evidencePacketId: crypto.randomUUID()
    });

    const decided = recordReviewDecision({
      reviewCaseId: reviewCase.reviewCaseId,
      decision: "release_hold",
      decisionSummary: "Campaign may resume after review."
    });

    expect(decided.status).toBe("decision_made");
    expect(decided.decision).toBe("release_hold");
  });

  it("creates appeal", () => {
    const reviewCase = createReviewCase({
      subjectType: "content_safety",
      subjectId: crypto.randomUUID(),
      subjectOwnerUserId: "user_1",
      reason: "safety_risk",
      evidencePacketId: crypto.randomUUID()
    });

    recordReviewDecision({
      reviewCaseId: reviewCase.reviewCaseId,
      decision: "reject",
      decisionSummary: "Rejected for policy reasons."
    });

    const appealed = createReviewAppeal({
      reviewCaseId: reviewCase.reviewCaseId,
      requesterUserId: "user_1"
    });

    expect(appealed.status).toBe("appealed");
    expect(appealed.appealCount).toBe(1);
  });

  it("evaluates stored review case", () => {
    const ownerUserId = crypto.randomUUID();

    const reviewCase = createReviewCase({
      subjectType: "content_safety",
      subjectId: crypto.randomUUID(),
      subjectOwnerUserId: ownerUserId,
      reason: "safety_risk",
      priority: "high",
      evidencePacketId: crypto.randomUUID()
    });

    assignReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerRole: "safety_specialist",
      reviewerUserId: crypto.randomUUID()
    });

    startReviewCase(reviewCase.reviewCaseId);

    recordReviewDecision({
      reviewCaseId: reviewCase.reviewCaseId,
      decision: "approve",
      decisionSummary: "Safety issue resolved; content can be restored."
    });

    const result = evaluateStoredReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,

      appealRequested: false,

      decisionConfidenceScore: 0.9,
      reviewerConfidenceScore: 0.9,
      evidenceCompletenessScore: 0.9,

      riskScore: 0.2,
      severityScore: 0.25,

      fraudRisk: 0.02,
      safetyRisk: 0.2,
      complianceRisk: 0.02,
      paymentRisk: 0.02,
      rightsRisk: 0.02,

      downstreamCorrectionRequested: true,
      correctionInstructions: [
        {
          targetSystem: "content_safety",
          targetObjectId: reviewCase.subjectId,
          action: "restore",
          reasonCode: "review_approved_restore"
        }
      ],

      requesterIsSubjectOwner: true,
      requesterUserId: ownerUserId
    });

    expect(result.status).toBe("review_resolved");
    expect(result.downstreamCorrectionRequired).toBe(true);

    const storedResult = getReviewEvaluationResult(reviewCase.reviewCaseId);
    expect(storedResult?.status).toBe("review_resolved");

    const updated = getReviewCase(reviewCase.reviewCaseId);
    expect(updated?.status).toBe("resolved");
  });

  it("lists review cases", () => {
    const reviewerUserId = crypto.randomUUID();

    const reviewCase = createReviewCase({
      subjectType: "campaign",
      subjectId: crypto.randomUUID(),
      reason: "campaign_suspension",
      evidencePacketId: crypto.randomUUID()
    });

    assignReviewCase({
      reviewCaseId: reviewCase.reviewCaseId,
      reviewerRole: "reviewer",
      reviewerUserId
    });

    expect(listReviewCases({ assignedReviewerUserId: reviewerUserId })).toHaveLength(1);
    expect(listReviewCases({ status: "assigned" })).toHaveLength(1);
  });
});
