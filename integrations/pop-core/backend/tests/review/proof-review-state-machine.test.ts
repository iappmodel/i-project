import { describe, expect, it } from "vitest";
import { popsRewardEligibilityToProofReviewStatus } from "../../adapters/proof-review-status-map.js";
import {
  ProofReviewInvalidTransitionError,
  ProofReviewStateMachine
} from "../../review/proof-review-state-machine.js";
import {
  POPS_REWARD_ELIGIBILITY,
  type PopsRewardEligibility
} from "../../types/pops-decisions.types.js";

function authorityCompletedEvent(
  eligibility: PopsRewardEligibility,
  sessionId = "sess_test"
) {
  return {
    type: "AUTHORITY_REVIEW_COMPLETED" as const,
    sessionId,
    occurredAt: "2026-05-20T18:08:42.000Z",
    reasonCodes: ["test_reason"],
    decisionId: "decision_test",
    rewardEligibility: eligibility,
    targetStatus: popsRewardEligibilityToProofReviewStatus(eligibility)
  };
}

function authorityDeferredEvent(sessionId = "sess_test") {
  return {
    type: "AUTHORITY_REVIEW_DEFERRED" as const,
    sessionId,
    occurredAt: "2026-05-20T18:08:42.000Z",
    reasonCodes: ["confidence_pending"],
    decisionId: "decision_test",
    rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING
  };
}

function manualReviewEvent(
  targetStatus: "approved" | "partial" | "rejected",
  sessionId = "sess_test"
) {
  return {
    type: "MANUAL_REVIEW_COMPLETED" as const,
    sessionId,
    occurredAt: "2026-05-20T19:00:00.000Z",
    reasonCodes: ["manual_resolution"],
    targetStatus,
    reviewerRef: "reviewer-001"
  };
}

describe("ProofReviewStateMachine classifiers", () => {
  it("returns pending as initial status", () => {
    expect(ProofReviewStateMachine.initialStatus()).toBe("pending");
  });

  it.each([
    ["approved", true, true],
    ["partial", true, true],
    ["rejected", true, false],
    ["pending", false, false],
    ["escalated", false, false]
  ] as const)("classifies %s terminal=%s settlementEligible=%s", (status, terminal, settlementEligible) => {
    expect(ProofReviewStateMachine.isTerminal(status)).toBe(terminal);
    expect(ProofReviewStateMachine.isSettlementEligible(status)).toBe(settlementEligible);
  });

  it("detects authority-deferred pending via lifecycle events", () => {
    const deferred = authorityDeferredEvent();
    expect(ProofReviewStateMachine.isAuthorityDeferred("pending", [deferred])).toBe(true);
    expect(ProofReviewStateMachine.isAuthorityDeferred("pending", [])).toBe(false);
    expect(ProofReviewStateMachine.isAuthorityDeferred("approved", [deferred])).toBe(false);
  });
});

describe("ProofReviewStateMachine allowed transitions", () => {
  it.each([
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL, "approved"],
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL, "partial"],
    [POPS_REWARD_ELIGIBILITY.DENIED, "rejected"],
    [POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE, "rejected"],
    [POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW, "escalated"]
  ] as const)("pending + AUTHORITY_REVIEW_COMPLETED (%s) -> %s", (eligibility, expected) => {
    const event = authorityCompletedEvent(eligibility);
    expect(ProofReviewStateMachine.canTransition("pending", event)).toBe(true);

    const result = ProofReviewStateMachine.transition("pending", event);
    expect(result.to).toBe(expected);
    expect(result.isTerminal).toBe(expected !== "escalated");
    expect(result.isSettlementEligible).toBe(expected === "approved" || expected === "partial");
  });

  it("pending + AUTHORITY_REVIEW_DEFERRED -> pending", () => {
    const event = authorityDeferredEvent();
    expect(ProofReviewStateMachine.canTransition("pending", event)).toBe(true);

    const result = ProofReviewStateMachine.transition("pending", event);
    expect(result.to).toBe("pending");
    expect(result.isTerminal).toBe(false);
    expect(result.isSettlementEligible).toBe(false);
  });

  it.each([
    ["approved" as const],
    ["partial" as const],
    ["rejected" as const]
  ])("escalated + MANUAL_REVIEW_COMPLETED -> %s", (targetStatus) => {
    const event = manualReviewEvent(targetStatus);
    expect(ProofReviewStateMachine.canTransition("escalated", event)).toBe(true);

    const result = ProofReviewStateMachine.transition("escalated", event);
    expect(result.to).toBe(targetStatus);
    expect(result.isTerminal).toBe(true);
    expect(result.isSettlementEligible).toBe(targetStatus === "approved" || targetStatus === "partial");
  });
});

describe("ProofReviewStateMachine invalid transitions", () => {
  it.each(["approved", "partial", "rejected"] as const)(
    "rejects any event from terminal state %s",
    (from) => {
      const event = authorityCompletedEvent(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);
      expect(ProofReviewStateMachine.canTransition(from, event)).toBe(false);
      expect(() => ProofReviewStateMachine.transition(from, event)).toThrow(
        ProofReviewInvalidTransitionError
      );
    }
  );

  it("rejects MANUAL_REVIEW_COMPLETED from pending", () => {
    const event = manualReviewEvent("approved");
    expect(ProofReviewStateMachine.canTransition("pending", event)).toBe(false);
    expect(() => ProofReviewStateMachine.transition("pending", event)).toThrow(
      ProofReviewInvalidTransitionError
    );
  });

  it("rejects AUTHORITY_REVIEW_COMPLETED to pending (must use DEFERRED)", () => {
    const event = {
      ...authorityCompletedEvent(POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING),
      targetStatus: "pending" as const
    };
    expect(ProofReviewStateMachine.canTransition("pending", event)).toBe(false);
  });

  it("rejects authority events from escalated", () => {
    const event = authorityCompletedEvent(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL);
    expect(ProofReviewStateMachine.canTransition("escalated", event)).toBe(false);
    expect(() => ProofReviewStateMachine.transition("escalated", event)).toThrow(
      ProofReviewInvalidTransitionError
    );
  });

  it("rejects AUTHORITY_REVIEW_DEFERRED from escalated", () => {
    const event = authorityDeferredEvent();
    expect(ProofReviewStateMachine.canTransition("escalated", event)).toBe(false);
  });

  it("rejects PACKET_EMITTED as a transition event", () => {
    const event = {
      type: "PACKET_EMITTED" as const,
      sessionId: "sess_test",
      occurredAt: "2026-05-20T18:08:42.000Z",
      reasonCodes: [] as string[]
    };
    expect(ProofReviewStateMachine.canTransition("pending", event)).toBe(false);
  });

  it("rejects mismatched targetStatus payload", () => {
    const event = {
      ...authorityCompletedEvent(POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL),
      targetStatus: "rejected" as const
    };
    expect(ProofReviewStateMachine.canTransition("pending", event)).toBe(false);
  });
});

describe("targetStatusForAuthorityEligibility", () => {
  it.each([
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL, "approved"],
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL, "partial"],
    [POPS_REWARD_ELIGIBILITY.DENIED, "rejected"],
    [POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE, "rejected"],
    [POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING, "pending"],
    [POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW, "escalated"]
  ] as const)("maps %s to %s", (eligibility, status) => {
    expect(ProofReviewStateMachine.targetStatusForAuthorityEligibility(eligibility)).toBe(status);
  });
});
