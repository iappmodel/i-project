import type { PendingHoldRecord } from "./pending-hold.js";
import {
  PendingHoldReleaseEligibilityError,
  assertReleaseEligible
} from "./pending-hold-release-eligibility.js";
import { PendingHoldReleaseStateMachine } from "./pending-hold-release-state-machine.js";
import {
  PENDING_HOLD_RELEASE_LIFECYCLE_EVENT,
  type PendingHoldReleaseLifecycleEvent,
  type PendingHoldReleaseState,
  type ReleaseApprovedEvent,
  type ReleaseBlockedEvent,
  type ReleaseCancelledEvent,
  type ReleaseCompletedEvent
} from "./pending-hold-release-lifecycle.types.js";

export interface PendingHoldReleaseEventOptions {
  occurredAt?: string;
  reasonCodes?: string[];
}

function baseEventFields(
  sessionId: string,
  options: PendingHoldReleaseEventOptions = {}
): Pick<PendingHoldReleaseLifecycleEvent, "sessionId" | "occurredAt" | "reasonCodes"> {
  return {
    sessionId,
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    reasonCodes: options.reasonCodes ?? []
  };
}

export function releaseApprovedEvent(
  sessionId: string,
  options: PendingHoldReleaseEventOptions & { approverRef?: string } = {}
): ReleaseApprovedEvent {
  return {
    ...baseEventFields(sessionId, options),
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_APPROVED,
    approverRef: options.approverRef
  };
}

export function releaseCompletedEvent(
  sessionId: string,
  executionRef: string,
  options: PendingHoldReleaseEventOptions = {}
): ReleaseCompletedEvent {
  if (!executionRef || executionRef.trim().length === 0) {
    throw new Error("ReleaseCompletedEvent requires a non-empty executionRef");
  }

  return {
    ...baseEventFields(sessionId, options),
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_COMPLETED,
    executionRef
  };
}

export function releaseCancelledEvent(
  sessionId: string,
  cancelReason: string,
  options: PendingHoldReleaseEventOptions = {}
): ReleaseCancelledEvent {
  if (!cancelReason || cancelReason.trim().length === 0) {
    throw new Error("ReleaseCancelledEvent requires a non-empty cancelReason");
  }

  return {
    ...baseEventFields(sessionId, options),
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_CANCELLED,
    cancelReason
  };
}

export function releaseBlockedEvent(
  sessionId: string,
  blockReason: string,
  options: PendingHoldReleaseEventOptions = {}
): ReleaseBlockedEvent {
  if (!blockReason || blockReason.trim().length === 0) {
    throw new Error("ReleaseBlockedEvent requires a non-empty blockReason");
  }

  return {
    ...baseEventFields(sessionId, options),
    type: PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_BLOCKED,
    blockReason
  };
}

export function projectPendingHoldReleaseTransition(
  state: PendingHoldReleaseState,
  hold: PendingHoldRecord,
  event: PendingHoldReleaseLifecycleEvent
): PendingHoldReleaseState {
  const result = PendingHoldReleaseStateMachine.transition(state.releaseStatus, event, hold);

  return {
    releaseStatus: result.to,
    releaseLifecycleEvents: [...state.releaseLifecycleEvents, event]
  };
}

export {
  PendingHoldReleaseEligibilityError,
  assertReleaseEligible
};
