import { describe, expect, it } from "vitest";
import { evaluateAdminReview } from "../admin-review-engine";
import type { AdminReviewSignalInput } from "@/types/alphabet/admin-review.types";

function scores() {
  return {
    evidenceCompletenessScore: 0.95,
    reviewerAuthorityScore: 0.95,
    decisionConfidenceScore: 0.95,
    downstreamSafetyScore: 0.95,
    userImpactScore: 0.5,
    platformRiskScore: 0.05
  };
}

function makeInput(overrides: Partial<AdminReviewSignalInput> = {}): AdminReviewSignalInput {
  return {
    reviewCaseId: crypto.randomUUID(),
    reviewCaseType: "external_transfer_review",
    reviewTrigger: "external_transfer_unknown",
    currentStatus: "review_created",
    decision: null,

    subjectIds: {
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      externalTransferId: crypto.randomUUID()
    },

    rawEvidence: {
      externalTransferStatus: "provider_unknown"
    },
    redactedEvidence: {
      externalTransferStatus: "provider_unknown"
    },
    publicSummary: "External transfer needs review.",
    internalSummary: "Provider status is unknown.",

    assignedReviewerId: crypto.randomUUID(),
    assignedTeam: "payments",

    decidedByUserId: null,
    decisionReasonCodes: [],
    decisionNotes: null,

    severity: "high",
    priority: "urgent",

    dueAt: new Date(Date.now() + 3600000).toISOString(),
    breachedAt: null,

    idempotencyKey: crypto.randomUUID(),
    dedupeKey: crypto.randomUUID(),

    sourceEventIds: [crypto.randomUUID()],

    safetyScores: scores(),

    assignmentRequested: false,
    reviewStarted: false,
    moreInfoRequested: false,
    decisionSubmitted: false,
    closeRequested: false,
    cancelRequested: false,

    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("admin-review-engine", () => {
  it("marks review ready", () => {
    const result = evaluateAdminReview(makeInput());

    expect(result.status).toBe("review_ready");
    expect(result.ready).toBe(true);
    expect(result.adminReviewQueuedEvent).not.toBeNull();
  });

  it("requires assignment for high severity", () => {
    const result = evaluateAdminReview(
      makeInput({
        assignedReviewerId: null
      })
    );

    expect(result.status).toBe("review_requires_assignment");
    expect(result.adminReviewQueuedEvent).not.toBeNull();
  });

  it("allows approved decision", () => {
    const result = evaluateAdminReview(
      makeInput({
        decision: "approve_continue",
        decisionSubmitted: true,
        decidedByUserId: crypto.randomUUID(),
        decisionReasonCodes: ["provider_status_manually_verified"]
      })
    );

    expect(result.status).toBe("review_decision_allowed");
  });

  it("treats freeze_wallet as decision allowed (restrictive)", () => {
    const result = evaluateAdminReview(
      makeInput({
        decision: "freeze_wallet",
        decisionSubmitted: true,
        decidedByUserId: crypto.randomUUID(),
        decisionReasonCodes: ["risk_hold"],
        subjectIds: {
          userId: crypto.randomUUID(),
          walletId: crypto.randomUUID()
        }
      })
    );

    expect(result.status).toBe("review_decision_allowed");
    expect(result.reasons).toContain("admin_review_restrictive_action_allowed");
  });

  it("blocks rejected decision", () => {
    const result = evaluateAdminReview(
      makeInput({
        decision: "reject_block",
        decisionSubmitted: true,
        decidedByUserId: crypto.randomUUID(),
        decisionReasonCodes: ["provider_status_invalid"]
      })
    );

    expect(result.status).toBe("review_decision_blocked");
  });

  it("escalates low authority reviewer", () => {
    const result = evaluateAdminReview(
      makeInput({
        decision: "approve_continue",
        decisionSubmitted: true,
        decidedByUserId: crypto.randomUUID(),
        decisionReasonCodes: ["manual_check"],
        safetyScores: {
          ...scores(),
          reviewerAuthorityScore: 0.4
        }
      })
    );

    expect(result.status).toBe("review_escalation_required");
  });

  it("requests more info when evidence completeness is low", () => {
    const result = evaluateAdminReview(
      makeInput({
        rawEvidence: { ok: true },
        redactedEvidence: { ok: true },
        safetyScores: {
          ...scores(),
          evidenceCompletenessScore: 0.1
        }
      })
    );

    expect(result.status).toBe("review_requires_more_info");
  });
});
