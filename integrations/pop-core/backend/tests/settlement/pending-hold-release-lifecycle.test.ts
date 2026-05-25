import { describe, expect, it } from "vitest";
import {
  projectPendingHoldReleaseTransition,
  releaseApprovedEvent,
  releaseBlockedEvent,
  releaseCancelledEvent,
  releaseCompletedEvent
} from "../../settlement/pending-hold-release-lifecycle.js";
import { PendingHoldReleaseStateMachine } from "../../settlement/pending-hold-release-state-machine.js";
import type { PendingHoldReleaseState } from "../../settlement/pending-hold-release-lifecycle.types.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";

const SESSION_ID = "sess_release_projection_test";

function initialState(): PendingHoldReleaseState {
  return {
    releaseStatus: PendingHoldReleaseStateMachine.initialReleaseStatus(),
    releaseLifecycleEvents: []
  };
}

describe("release event builders", () => {
  it("rejects RELEASE_COMPLETED without executionRef", () => {
    expect(() => releaseCompletedEvent(SESSION_ID, "")).toThrow(
      /requires a non-empty executionRef/
    );
  });

  it("creates RELEASE_COMPLETED with required executionRef", () => {
    const event = releaseCompletedEvent(SESSION_ID, "exec-ref-001");
    expect(event.executionRef).toBe("exec-ref-001");
    expect(event.type).toBe("RELEASE_COMPLETED");
  });
});

describe("projectPendingHoldReleaseTransition", () => {
  const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });

  it("transitions not_released + RELEASE_APPROVED to release_ready", () => {
    const event = releaseApprovedEvent(SESSION_ID);
    const result = projectPendingHoldReleaseTransition(initialState(), hold, event);

    expect(result.releaseStatus).toBe("release_ready");
    expect(result.releaseLifecycleEvents).toHaveLength(1);
    expect(result.releaseLifecycleEvents[0]).toEqual(event);
  });

  it("transitions release_ready + RELEASE_COMPLETED with executionRef to released", () => {
    const approved = releaseApprovedEvent(SESSION_ID);
    const readyState = projectPendingHoldReleaseTransition(initialState(), hold, approved);
    const completed = releaseCompletedEvent(SESSION_ID, "exec-ref-001");

    const result = projectPendingHoldReleaseTransition(readyState, hold, completed);

    expect(result.releaseStatus).toBe("released");
    expect(result.releaseLifecycleEvents).toHaveLength(2);
    expect(result.releaseLifecycleEvents[1]).toEqual(completed);
  });

  it("accumulates lifecycle events across multi-step path", () => {
    const approved = releaseApprovedEvent(SESSION_ID);
    const readyState = projectPendingHoldReleaseTransition(initialState(), hold, approved);
    const completed = releaseCompletedEvent(SESSION_ID, "exec-ref-001");
    const releasedState = projectPendingHoldReleaseTransition(readyState, hold, completed);

    expect(releasedState.releaseStatus).toBe("released");
    expect(releasedState.releaseLifecycleEvents.map((event) => event.type)).toEqual([
      "RELEASE_APPROVED",
      "RELEASE_COMPLETED"
    ]);
  });

  it("cancels from release_blocked", () => {
    const blocked = releaseBlockedEvent(SESSION_ID, "risk_review");
    const blockedState = projectPendingHoldReleaseTransition(initialState(), hold, blocked);
    const cancelled = releaseCancelledEvent(SESSION_ID, "manual_void");

    const result = projectPendingHoldReleaseTransition(blockedState, hold, cancelled);

    expect(result.releaseStatus).toBe("cancelled");
    expect(result.releaseLifecycleEvents).toHaveLength(2);
    expect(result.releaseLifecycleEvents[1].type).toBe("RELEASE_CANCELLED");
  });

  it("does not mutate PendingHoldRecord", () => {
    const snapshot = structuredClone(hold);
    const event = releaseApprovedEvent(SESSION_ID);

    projectPendingHoldReleaseTransition(initialState(), hold, event);

    expect(hold).toEqual(snapshot);
    expect(hold.releaseStatus).toBe("not_released");
  });
});
