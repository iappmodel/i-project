import { popsRewardEligibilityToProofReviewStatus } from "../adapters/proof-review-status-map.js";
import type { ProofReviewStatus } from "../types/proof-packet-v0.types.js";
import type { PopsRewardEligibility } from "../types/pops-decisions.types.js";
import { PROOF_REVIEW_LIFECYCLE_EVENT, type ProofReviewLifecycleEvent } from "./proof-review-lifecycle.types.js";

export class ProofReviewInvalidTransitionError extends Error {
  readonly from: ProofReviewStatus;
  readonly event: ProofReviewLifecycleEvent;

  constructor(from: ProofReviewStatus, event: ProofReviewLifecycleEvent) {
    super(
      `Invalid proof review transition from "${from}" on event "${event.type}" for sessionId: ${event.sessionId}`
    );
    this.name = "ProofReviewInvalidTransitionError";
    this.from = from;
    this.event = event;
  }
}

export interface ProofReviewTransitionResult {
  from: ProofReviewStatus;
  to: ProofReviewStatus;
  event: ProofReviewLifecycleEvent;
  isTerminal: boolean;
  isSettlementEligible: boolean;
}

const TERMINAL_STATUSES = new Set<ProofReviewStatus>(["approved", "partial", "rejected"]);
const SETTLEMENT_ELIGIBLE_STATUSES = new Set<ProofReviewStatus>(["approved", "partial"]);
const MANUAL_RESOLUTION_STATUSES = new Set<ProofReviewStatus>(["approved", "partial", "rejected"]);

function resolveTargetStatus(event: ProofReviewLifecycleEvent): ProofReviewStatus | null {
  switch (event.type) {
    case PROOF_REVIEW_LIFECYCLE_EVENT.PACKET_EMITTED:
      return "pending";
    case PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED:
      return event.targetStatus;
    case PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED:
      return "pending";
    case PROOF_REVIEW_LIFECYCLE_EVENT.MANUAL_REVIEW_COMPLETED:
      return event.targetStatus;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function isAuthorityEvent(event: ProofReviewLifecycleEvent): boolean {
  return (
    event.type === PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED ||
    event.type === PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED
  );
}

function isManualReviewEvent(event: ProofReviewLifecycleEvent): boolean {
  return event.type === PROOF_REVIEW_LIFECYCLE_EVENT.MANUAL_REVIEW_COMPLETED;
}

function isPacketEmittedEvent(event: ProofReviewLifecycleEvent): boolean {
  return event.type === PROOF_REVIEW_LIFECYCLE_EVENT.PACKET_EMITTED;
}

function validateEventPayload(from: ProofReviewStatus, event: ProofReviewLifecycleEvent): boolean {
  if (event.type === PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED) {
    const expected = popsRewardEligibilityToProofReviewStatus(event.rewardEligibility);
    return event.targetStatus === expected && expected !== "pending";
  }

  if (event.type === PROOF_REVIEW_LIFECYCLE_EVENT.MANUAL_REVIEW_COMPLETED) {
    return MANUAL_RESOLUTION_STATUSES.has(event.targetStatus);
  }

  if (event.type === PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED) {
    return from === "pending";
  }

  return true;
}

export const ProofReviewStateMachine = {
  initialStatus(): ProofReviewStatus {
    return "pending";
  },

  targetStatusForAuthorityEligibility(eligibility: PopsRewardEligibility): ProofReviewStatus {
    return popsRewardEligibilityToProofReviewStatus(eligibility);
  },

  isTerminal(status: ProofReviewStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  },

  isSettlementEligible(status: ProofReviewStatus): boolean {
    return SETTLEMENT_ELIGIBLE_STATUSES.has(status);
  },

  isAuthorityDeferred(status: ProofReviewStatus, events: ProofReviewLifecycleEvent[]): boolean {
    return (
      status === "pending" &&
      events.some((event) => event.type === PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED)
    );
  },

  canTransition(from: ProofReviewStatus, event: ProofReviewLifecycleEvent): boolean {
    if (isPacketEmittedEvent(event)) {
      return false;
    }

    if (TERMINAL_STATUSES.has(from)) {
      return false;
    }

    if (!validateEventPayload(from, event)) {
      return false;
    }

    if (from === "pending") {
      if (isManualReviewEvent(event)) {
        return false;
      }

      if (isAuthorityEvent(event)) {
        return true;
      }

      return false;
    }

    if (from === "escalated") {
      return isManualReviewEvent(event);
    }

    return false;
  },

  transition(from: ProofReviewStatus, event: ProofReviewLifecycleEvent): ProofReviewTransitionResult {
    if (!ProofReviewStateMachine.canTransition(from, event)) {
      throw new ProofReviewInvalidTransitionError(from, event);
    }

    const to = resolveTargetStatus(event);
    if (!to) {
      throw new ProofReviewInvalidTransitionError(from, event);
    }

    return {
      from,
      to,
      event,
      isTerminal: ProofReviewStateMachine.isTerminal(to),
      isSettlementEligible: ProofReviewStateMachine.isSettlementEligible(to)
    };
  }
} as const;
