import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../db-repositories/audits.repository", () => ({
  insertAuditRecordDb: vi.fn().mockResolvedValue({ audit_id: "a1" })
}));

vi.mock("../../db-repositories/notifications.repository", () => ({
  insertNotificationRecordDb: vi.fn().mockResolvedValue({})
}));

vi.mock("../../db-client", () => ({
  createServiceDbClient: () => ({
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null })
    })
  })
}));

import { insertAuditRecordDb } from "../../db-repositories/audits.repository";
import { applyReviewDecision } from "../review-decision-applier";
import type { AdminReviewEvaluationResult } from "@/types/alphabet/admin-review.types";

function baseEvaluation(
  overrides: Partial<AdminReviewEvaluationResult> = {}
): AdminReviewEvaluationResult {
  return {
    reviewCaseId: "rc1",
    reviewCaseType: "policy_review",
    reviewTrigger: "policy_requires_review",
    status: "review_decision_allowed",
    decision: "approve_continue",
    reviewReadinessScore: 0.9,
    decisionSafetyScore: 0.9,
    ready: false,
    requiresAssignment: false,
    requiresMoreInfo: false,
    decisionAllowed: true,
    decisionBlocked: false,
    escalationRequired: false,
    closed: false,
    canceled: false,
    auditRequired: true,
    notificationRequired: false,
    reasons: [],
    adminReviewCreatedEvent: {} as never,
    adminReviewQueuedEvent: null,
    adminReviewAssignedEvent: null,
    adminReviewStartedEvent: null,
    adminReviewMoreInfoRequestedEvent: null,
    adminReviewApprovedEvent: null,
    adminReviewRejectedEvent: null,
    adminReviewEscalatedEvent: null,
    adminReviewClosedEvent: null,
    adminReviewCanceledEvent: null,
    metadata: {},
    ...overrides
  };
}

describe("review-decision-applier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always appends an audit record for a decision", async () => {
    await applyReviewDecision({
      reviewCase: {
        review_case_id: "rc1",
        user_id: "u1",
        wallet_id: null,
        source_event_ids: []
      },
      evaluation: baseEvaluation(),
      decision: "approve_continue",
      decidedByUserId: "admin1",
      decisionReasonCodes: ["ok"]
    });

    expect(insertAuditRecordDb).toHaveBeenCalledTimes(1);
    expect(insertAuditRecordDb).toHaveBeenCalledWith(
      expect.objectContaining({
        auditType: "admin_review_decision",
        actorUserId: "admin1"
      })
    );
  });
});
