import type { ProofReviewStatus } from "../types/proof-packet-v0.types.js";
import {
  POPS_REWARD_ELIGIBILITY,
  type PopsRewardEligibility
} from "../types/pops-decisions.types.js";

export const PROOF_REVIEW_LIFECYCLE_EVENT = {
  PACKET_EMITTED: "PACKET_EMITTED",
  AUTHORITY_REVIEW_COMPLETED: "AUTHORITY_REVIEW_COMPLETED",
  AUTHORITY_REVIEW_DEFERRED: "AUTHORITY_REVIEW_DEFERRED",
  MANUAL_REVIEW_COMPLETED: "MANUAL_REVIEW_COMPLETED"
} as const;

export type ProofReviewLifecycleEventType =
  (typeof PROOF_REVIEW_LIFECYCLE_EVENT)[keyof typeof PROOF_REVIEW_LIFECYCLE_EVENT];

export interface ProofReviewLifecycleEventBase {
  type: ProofReviewLifecycleEventType;
  sessionId: string;
  occurredAt: string;
  reasonCodes: string[];
}

export interface PacketEmittedEvent extends ProofReviewLifecycleEventBase {
  type: typeof PROOF_REVIEW_LIFECYCLE_EVENT.PACKET_EMITTED;
}

export interface AuthorityReviewCompletedEvent extends ProofReviewLifecycleEventBase {
  type: typeof PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_COMPLETED;
  decisionId: string;
  rewardEligibility: PopsRewardEligibility;
  targetStatus: ProofReviewStatus;
}

export interface AuthorityReviewDeferredEvent extends ProofReviewLifecycleEventBase {
  type: typeof PROOF_REVIEW_LIFECYCLE_EVENT.AUTHORITY_REVIEW_DEFERRED;
  decisionId: string;
  rewardEligibility: typeof POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING;
}

export interface ManualReviewCompletedEvent extends ProofReviewLifecycleEventBase {
  type: typeof PROOF_REVIEW_LIFECYCLE_EVENT.MANUAL_REVIEW_COMPLETED;
  targetStatus: Extract<ProofReviewStatus, "approved" | "partial" | "rejected">;
  reviewerRef: string;
}

export type ProofReviewLifecycleEvent =
  | PacketEmittedEvent
  | AuthorityReviewCompletedEvent
  | AuthorityReviewDeferredEvent
  | ManualReviewCompletedEvent;
