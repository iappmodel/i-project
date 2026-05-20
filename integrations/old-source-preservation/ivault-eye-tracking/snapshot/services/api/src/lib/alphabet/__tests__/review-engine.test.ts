import { describe, expect, it } from "vitest";
import { evaluateReviewCase } from "../review-engine";
import type { ReviewSignalInput } from "../../../types/alphabet/review.types";

function makeInput(overrides: Partial<ReviewSignalInput> = {}): ReviewSignalInput {
  return {
    reviewCaseId: crypto.randomUUID(),

    subjectType: "content_safety",
    subjectId: crypto.randomUUID(),
    subjectOwnerUserId: crypto.randomUUID(),

    reason: "safety_risk",
    priority: "high",
    currentStatus: "in_review",

    assignedReviewerRole: "safety_specialist",
    assignedReviewerUserId: crypto.randomUUID(),

    decision: "approve",
    decisionSummary: "Safety review completed. Content is eligible with controls.",

    evidencePacketId: crypto.randomUUID(),
    sourceEventIds: [crypto.randomUUID()],

    appealCount: 0,
    allowedAppealLimit: 1,
    appealRequested: false,

    slaDeadlineAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    now: new Date().toISOString(),

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
        targetObjectId: crypto.randomUUID(),
        action: "approve",
        reasonCode: "review_approved"
      }
    ],

    requesterIsSubjectOwner: true,
    requesterUserId: crypto.randomUUID(),

    metadata: {},
    ...overrides
  };
}

describe("review-engine", () => {
  it("resolves clean review decision with correction", () => {
    const result = evaluateReviewCase(makeInput());

    expect(result.status).toBe("review_resolved");
    expect(result.resolved).toBe(true);
    expect(result.downstreamCorrectionRequired).toBe(true);
    expect(result.reviewDecisionMadeEvent?.eventType).toBe("review_decision_made");
    expect(result.reviewDownstreamCorrectionRequiredEvent?.eventType).toBe(
      "review_downstream_correction_required"
    );
  });

  it("requires evidence for high-risk subject", () => {
    const result = evaluateReviewCase(
      makeInput({
        evidencePacketId: null
      })
    );

    expect(result.status).toBe("review_needs_evidence");
    expect(result.requiresEvidence).toBe(true);
    expect(result.reasons).toContain("evidence_packet_required");
  });

  it("queues when reviewer is missing", () => {
    const result = evaluateReviewCase(
      makeInput({
        assignedReviewerRole: null,
        assignedReviewerUserId: null
      })
    );

    expect(result.status).toBe("review_queued");
    expect(result.requiresAssignment).toBe(true);
  });

  it("escalates critical case without specialist", () => {
    const result = evaluateReviewCase(
      makeInput({
        priority: "critical",
        assignedReviewerRole: "reviewer",
        riskScore: 0.8,
        severityScore: 0.8
      })
    );

    expect(result.status).toBe("review_escalated");
    expect(result.requiresSpecialist).toBe(true);
    expect(result.reasons).toContain("specialist_reviewer_required");
  });

  it("creates appeal when eligible", () => {
    const result = evaluateReviewCase(
      makeInput({
        appealRequested: true,
        currentStatus: "decision_made",
        assignedReviewerRole: "senior_reviewer",
        decision: "reject",
        decisionSummary: "Initial rejection is eligible for appeal review."
      })
    );

    expect(result.status).toBe("review_appealable");
    expect(result.appealCreated).toBe(true);
    expect(result.reviewAppealCreatedEvent?.eventType).toBe("review_appeal_created");
  });

  it("blocks appeal after appeal limit", () => {
    const result = evaluateReviewCase(
      makeInput({
        appealRequested: true,
        appealCount: 1,
        allowedAppealLimit: 1,
        decision: "reject"
      })
    );

    expect(result.status).toBe("review_resolved");
    expect(result.appealCreated).toBe(false);
    expect(result.reasons).toContain("appeal_not_allowed_or_limit_reached");
  });

  it("expires unresolved case past SLA", () => {
    const result = evaluateReviewCase(
      makeInput({
        decision: "none",
        slaDeadlineAt: new Date(Date.now() - 60_000).toISOString()
      })
    );

    expect(result.status).toBe("review_expired");
    expect(result.expired).toBe(true);
  });

  it("needs more evidence when reviewer requests it", () => {
    const result = evaluateReviewCase(
      makeInput({
        decision: "request_more_evidence",
        decisionSummary: "Need more source documents before final decision."
      })
    );

    expect(result.status).toBe("review_needs_evidence");
    expect(result.requiresEvidence).toBe(true);
  });

  it("escalates weak decision quality", () => {
    const result = evaluateReviewCase(
      makeInput({
        decisionConfidenceScore: 0.2,
        reviewerConfidenceScore: 0.2,
        decisionSummary: "No."
      })
    );

    expect(result.status).toBe("review_escalated");
  });
});
