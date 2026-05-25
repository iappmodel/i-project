import { describe, expect, it } from "vitest";
import {
  PENDING_HOLD_RELEASE_ELIGIBILITY_REASON,
  PendingHoldReleaseEligibilityError
} from "../../settlement/pending-hold-release-eligibility.js";
import {
  PENDING_HOLD_RELEASE_LIFECYCLE_EVENT,
  type PendingHoldReleaseLifecycleEvent
} from "../../settlement/pending-hold-release-lifecycle.types.js";
import type { PendingHoldReleaseStatus } from "../../settlement/pending-hold.js";
import {
  PendingHoldReleaseInvalidTransitionError,
  PendingHoldReleaseStateMachine
} from "../../settlement/pending-hold-release-state-machine.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";

const SESSION_ID = "sess_release_sm_test";
const OCCURRED_AT = "2026-05-23T14:00:00.000Z";

function releaseApprovedEvent(sessionId = SESSION_ID): PendingHoldReleaseLifecycleEvent {
  return {
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_APPROVED,
    sessionId,
    occurredAt: OCCURRED_AT,
    reasonCodes: ["release_approved"]
  };
}

function releaseCompletedEvent(
  executionRef: string,
  sessionId = SESSION_ID
): PendingHoldReleaseLifecycleEvent {
  return {
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_COMPLETED,
    sessionId,
    occurredAt: OCCURRED_AT,
    reasonCodes: ["release_completed"],
    executionRef
  };
}

function releaseCancelledEvent(sessionId = SESSION_ID): PendingHoldReleaseLifecycleEvent {
  return {
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_CANCELLED,
    sessionId,
    occurredAt: OCCURRED_AT,
    reasonCodes: ["release_cancelled"],
    cancelReason: "manual_void"
  };
}

function releaseBlockedEvent(sessionId = SESSION_ID): PendingHoldReleaseLifecycleEvent {
  return {
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_BLOCKED,
    sessionId,
    occurredAt: OCCURRED_AT,
    reasonCodes: ["policy_hold"],
    blockReason: "risk_review"
  };
}

function holdCreatedEvent(sessionId = SESSION_ID): PendingHoldReleaseLifecycleEvent {
  return {
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.HOLD_CREATED,
    sessionId,
    occurredAt: OCCURRED_AT,
    reasonCodes: []
  };
}

describe("PendingHoldReleaseStateMachine classifiers", () => {
  it("returns not_released as initial release status", () => {
    expect(PendingHoldReleaseStateMachine.initialReleaseStatus()).toBe("not_released");
  });

  it.each([
    ["not_released", false, false],
    ["release_ready", false, true],
    ["release_blocked", false, false],
    ["released", true, false],
    ["cancelled", true, false]
  ] as const)(
    "classifies %s terminal=%s releaseReady=%s",
    (status, terminal, releaseReady) => {
      expect(PendingHoldReleaseStateMachine.isTerminal(status)).toBe(terminal);
      expect(PendingHoldReleaseStateMachine.isReleaseReady(status)).toBe(releaseReady);
    }
  );
});

describe("PendingHoldReleaseStateMachine allowed transitions", () => {
  const eligibleHold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });

  it.each([
    ["not_released", "RELEASE_APPROVED", "release_ready"],
    ["release_blocked", "RELEASE_APPROVED", "release_ready"],
    ["not_released", "RELEASE_BLOCKED", "release_blocked"],
    ["release_ready", "RELEASE_BLOCKED", "release_blocked"],
    ["not_released", "RELEASE_CANCELLED", "cancelled"],
    ["release_ready", "RELEASE_CANCELLED", "cancelled"],
    ["release_blocked", "RELEASE_CANCELLED", "cancelled"],
    ["release_ready", "RELEASE_COMPLETED", "released"]
  ] as const)("from %s + %s -> %s", (from, eventKind, expectedTo) => {
    const event =
      eventKind === "RELEASE_APPROVED"
        ? releaseApprovedEvent()
        : eventKind === "RELEASE_BLOCKED"
          ? releaseBlockedEvent()
          : eventKind === "RELEASE_CANCELLED"
            ? releaseCancelledEvent()
            : releaseCompletedEvent("exec-ref-001");

    expect(PendingHoldReleaseStateMachine.canTransition(from, event)).toBe(true);

    const result = PendingHoldReleaseStateMachine.transition(
      from,
      event,
      eventKind === "RELEASE_APPROVED" ? eligibleHold : undefined
    );

    expect(result.to).toBe(expectedTo);
    expect(result.isTerminal).toBe(expectedTo === "released" || expectedTo === "cancelled");
    expect(result.isReleaseReady).toBe(expectedTo === "release_ready");
  });

  it("canApproveRelease is true for eligible hold in not_released", () => {
    expect(
      PendingHoldReleaseStateMachine.canApproveRelease("not_released", eligibleHold)
    ).toBe(true);
  });

  it("canApproveRelease is true for eligible hold in release_blocked", () => {
    expect(
      PendingHoldReleaseStateMachine.canApproveRelease("release_blocked", eligibleHold)
    ).toBe(true);
  });

  it("canApproveRelease is false for release_ready", () => {
    expect(
      PendingHoldReleaseStateMachine.canApproveRelease("release_ready", eligibleHold)
    ).toBe(false);
  });
});

describe("PendingHoldReleaseStateMachine invalid transitions", () => {
  const eligibleHold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });

  it.each(["released", "cancelled"] as const)(
    "rejects any event from terminal state %s",
    (from) => {
      const event = releaseCompletedEvent("exec-ref-001");
      expect(PendingHoldReleaseStateMachine.canTransition(from, event)).toBe(false);
      expect(() => PendingHoldReleaseStateMachine.transition(from, event)).toThrow(
        PendingHoldReleaseInvalidTransitionError
      );
    }
  );

  it("rejects HOLD_CREATED as a transition event", () => {
    const event = holdCreatedEvent();
    expect(PendingHoldReleaseStateMachine.canTransition("not_released", event)).toBe(false);
    expect(() => PendingHoldReleaseStateMachine.transition("not_released", event)).toThrow(
      PendingHoldReleaseInvalidTransitionError
    );
  });

  it("rejects RELEASE_COMPLETED from not_released", () => {
    const event = releaseCompletedEvent("exec-ref-001");
    expect(PendingHoldReleaseStateMachine.canTransition("not_released", event)).toBe(false);
    expect(() => PendingHoldReleaseStateMachine.transition("not_released", event)).toThrow(
      PendingHoldReleaseInvalidTransitionError
    );
  });

  it("rejects RELEASE_COMPLETED from release_blocked", () => {
    const event = releaseCompletedEvent("exec-ref-001");
    expect(PendingHoldReleaseStateMachine.canTransition("release_blocked", event)).toBe(false);
    expect(() => PendingHoldReleaseStateMachine.transition("release_blocked", event)).toThrow(
      PendingHoldReleaseInvalidTransitionError
    );
  });

  it("rejects RELEASE_COMPLETED without required executionRef", () => {
    const event = {
      type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_COMPLETED,
      sessionId: SESSION_ID,
      occurredAt: OCCURRED_AT,
      reasonCodes: ["release_completed"]
    } as PendingHoldReleaseLifecycleEvent;

    expect(PendingHoldReleaseStateMachine.canTransition("release_ready", event)).toBe(false);
    expect(() => PendingHoldReleaseStateMachine.transition("release_ready", event)).toThrow(
      PendingHoldReleaseInvalidTransitionError
    );
  });

  it("rejects RELEASE_COMPLETED with empty executionRef", () => {
    const event = releaseCompletedEvent("");
    expect(PendingHoldReleaseStateMachine.canTransition("release_ready", event)).toBe(false);
  });

  it("accepts RELEASE_COMPLETED with executionRef from release_ready", () => {
    const event = releaseCompletedEvent("exec-ref-001");
    const result = PendingHoldReleaseStateMachine.transition("release_ready", event);
    expect(result.to).toBe("released");
    expect(result.isTerminal).toBe(true);
  });

  it("rejects RELEASE_APPROVED from release_ready", () => {
    const event = releaseApprovedEvent();
    expect(PendingHoldReleaseStateMachine.canTransition("release_ready", event)).toBe(false);
    expect(() =>
      PendingHoldReleaseStateMachine.transition("release_ready", event, eligibleHold)
    ).toThrow(PendingHoldReleaseInvalidTransitionError);
  });

  it("rejects RELEASE_BLOCKED from release_blocked", () => {
    const event = releaseBlockedEvent();
    expect(PendingHoldReleaseStateMachine.canTransition("release_blocked", event)).toBe(false);
    expect(() => PendingHoldReleaseStateMachine.transition("release_blocked", event)).toThrow(
      PendingHoldReleaseInvalidTransitionError
    );
  });

  it("throws PendingHoldReleaseEligibilityError when RELEASE_APPROVED lacks hold context", () => {
    const event = releaseApprovedEvent();
    expect(() => PendingHoldReleaseStateMachine.transition("not_released", event)).toThrow(
      PendingHoldReleaseEligibilityError
    );

    try {
      PendingHoldReleaseStateMachine.transition("not_released", event);
    } catch (error) {
      expect(error).toBeInstanceOf(PendingHoldReleaseEligibilityError);
      expect((error as PendingHoldReleaseEligibilityError).reasonCodes).toContain(
        PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.HOLD_CONTEXT_REQUIRED
      );
    }
  });

  it("throws PendingHoldReleaseEligibilityError when RELEASE_APPROVED with ineligible hold", () => {
    const ineligibleHold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: null });
    const event = releaseApprovedEvent();

    expect(() =>
      PendingHoldReleaseStateMachine.transition("not_released", event, ineligibleHold)
    ).toThrow(PendingHoldReleaseEligibilityError);
  });
});

describe("terminal and release-ready invariants", () => {
  it("released is terminal", () => {
    expect(PendingHoldReleaseStateMachine.isTerminal("released")).toBe(true);
  });

  it("cancelled is terminal", () => {
    expect(PendingHoldReleaseStateMachine.isTerminal("cancelled")).toBe(true);
  });

  it("only release_ready is release-ready", () => {
    const statuses: PendingHoldReleaseStatus[] = [
      "not_released",
      "release_ready",
      "release_blocked",
      "released",
      "cancelled"
    ];

    for (const status of statuses) {
      expect(PendingHoldReleaseStateMachine.isReleaseReady(status)).toBe(status === "release_ready");
    }
  });
});
