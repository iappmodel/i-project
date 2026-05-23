import {
  eligibilityToLifecycleEventType,
  popsRewardEligibilityToProofReviewStatus
} from "../adapters/proof-review-status-map.js";
import type { PopsRewardDecision } from "../types/pops-decisions.types.js";
import { POPS_REWARD_ELIGIBILITY } from "../types/pops-decisions.types.js";
import {
  PROOF_REVIEW_LIFECYCLE_EVENT,
  type AuthorityReviewCompletedEvent,
  type AuthorityReviewDeferredEvent,
  type ProofReviewLifecycleEventType
} from "./proof-review-lifecycle.types.js";

export function lifecycleEventFromDecision(
  decision: PopsRewardDecision
): AuthorityReviewCompletedEvent | AuthorityReviewDeferredEvent {
  const eventType = eligibilityToLifecycleEventType(decision.rewardEligibility);
  const base = {
    sessionId: decision.sessionId,
    occurredAt: decision.createdAt,
    reasonCodes: [...decision.reasonCodes]
  };

  if (eventType === PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED) {
    return {
      ...base,
      type: PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED,
      decisionId: decision.id,
      rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING
    };
  }

  return {
    ...base,
    type: PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED,
    decisionId: decision.id,
    rewardEligibility: decision.rewardEligibility,
    targetStatus: popsRewardEligibilityToProofReviewStatus(decision.rewardEligibility)
  };
}

export { eligibilityToLifecycleEventType, type ProofReviewLifecycleEventType };
