import type { PendingHoldRecord, PendingHoldReleaseStatus } from "./pending-hold.js";
import {
  PENDING_HOLD_RELEASE_ELIGIBILITY_REASON,
  PendingHoldReleaseEligibilityError,
  assertReleaseEligible,
  isReleaseEligible
} from "./pending-hold-release-eligibility.js";
import {
  PENDING_HOLD_RELEASE_LIFECYCLE_EVENT,
  type PendingHoldReleaseLifecycleEvent
} from "./pending-hold-release-lifecycle.types.js";

export class PendingHoldReleaseInvalidTransitionError extends Error {
  readonly from: PendingHoldReleaseStatus;
  readonly event: PendingHoldReleaseLifecycleEvent;

  constructor(from: PendingHoldReleaseStatus, event: PendingHoldReleaseLifecycleEvent) {
    super(
      `Invalid pending hold release transition from "${from}" on event "${event.type}" for sessionId: ${event.sessionId}`
    );
    this.name = "PendingHoldReleaseInvalidTransitionError";
    this.from = from;
    this.event = event;
  }
}

export interface PendingHoldReleaseTransitionResult {
  from: PendingHoldReleaseStatus;
  to: PendingHoldReleaseStatus;
  event: PendingHoldReleaseLifecycleEvent;
  isTerminal: boolean;
  isReleaseReady: boolean;
}

const TERMINAL_STATUSES = new Set<PendingHoldReleaseStatus>(["released", "cancelled"]);

function isHoldCreatedEvent(event: PendingHoldReleaseLifecycleEvent): boolean {
  return event.type === PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.HOLD_CREATED;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function validateEventPayload(event: PendingHoldReleaseLifecycleEvent): boolean {
  switch (event.type) {
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.HOLD_CREATED:
      return false;
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_COMPLETED:
      return isNonEmptyString(event.executionRef);
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_CANCELLED:
      return isNonEmptyString(event.cancelReason);
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_BLOCKED:
      return isNonEmptyString(event.blockReason);
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_APPROVED:
      return true;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function resolveTargetStatus(
  from: PendingHoldReleaseStatus,
  event: PendingHoldReleaseLifecycleEvent
): PendingHoldReleaseStatus | null {
  switch (event.type) {
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.HOLD_CREATED:
      return "not_released";
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_APPROVED:
      if (from === "not_released" || from === "release_blocked") {
        return "release_ready";
      }
      return null;
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_BLOCKED:
      if (from === "not_released" || from === "release_ready") {
        return "release_blocked";
      }
      return null;
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_CANCELLED:
      if (from === "not_released" || from === "release_ready" || from === "release_blocked") {
        return "cancelled";
      }
      return null;
    case PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_COMPLETED:
      if (from === "release_ready") {
        return "released";
      }
      return null;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export const PendingHoldReleaseStateMachine = {
  initialReleaseStatus(): PendingHoldReleaseStatus {
    return "not_released";
  },

  isTerminal(status: PendingHoldReleaseStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  },

  isReleaseReady(status: PendingHoldReleaseStatus): boolean {
    return status === "release_ready";
  },

  canApproveRelease(releaseStatus: PendingHoldReleaseStatus, hold: PendingHoldRecord): boolean {
    if (releaseStatus !== "not_released" && releaseStatus !== "release_blocked") {
      return false;
    }

    return isReleaseEligible(hold);
  },

  canTransition(from: PendingHoldReleaseStatus, event: PendingHoldReleaseLifecycleEvent): boolean {
    if (isHoldCreatedEvent(event)) {
      return false;
    }

    if (TERMINAL_STATUSES.has(from)) {
      return false;
    }

    if (!validateEventPayload(event)) {
      return false;
    }

    return resolveTargetStatus(from, event) !== null;
  },

  transition(
    from: PendingHoldReleaseStatus,
    event: PendingHoldReleaseLifecycleEvent,
    hold?: PendingHoldRecord
  ): PendingHoldReleaseTransitionResult {
    if (!PendingHoldReleaseStateMachine.canTransition(from, event)) {
      throw new PendingHoldReleaseInvalidTransitionError(from, event);
    }

    if (event.type === PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_APPROVED) {
      if (!hold) {
        throw new PendingHoldReleaseEligibilityError(event.sessionId, [
          PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.HOLD_CONTEXT_REQUIRED
        ]);
      }

      assertReleaseEligible(hold);
    }

    const to = resolveTargetStatus(from, event);
    if (!to) {
      throw new PendingHoldReleaseInvalidTransitionError(from, event);
    }

    return {
      from,
      to,
      event,
      isTerminal: PendingHoldReleaseStateMachine.isTerminal(to),
      isReleaseReady: PendingHoldReleaseStateMachine.isReleaseReady(to)
    };
  }
} as const;
