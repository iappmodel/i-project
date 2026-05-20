import {
  POPS_REWARD_DECISION_STATUS,
  type PopsRewardDecisionStatus
} from "./pops-reward-decision.types";

export const POPS_REWARD_REASON_CODE = {
  INELIGIBLE_USER: "INELIGIBLE_USER",
  CAMPAIGN_EXPIRED: "CAMPAIGN_EXPIRED",
  DUPLICATE_ATTEMPT: "DUPLICATE_ATTEMPT",
  FRAUD_RISK_BLOCKED: "FRAUD_RISK_BLOCKED",
  FRAUD_RISK_REVIEW: "FRAUD_RISK_REVIEW",
  QUALITY_HIGH_CONFIDENCE: "QUALITY_HIGH_CONFIDENCE",
  QUALITY_PARTIAL_CONFIDENCE: "QUALITY_PARTIAL_CONFIDENCE",
  QUALITY_REVIEW_BAND: "QUALITY_REVIEW_BAND",
  QUALITY_BELOW_THRESHOLD: "QUALITY_BELOW_THRESHOLD",
  WALLET_PENDING_CREATED: "WALLET_PENDING_CREATED",
  WALLET_HELD_CREATED: "WALLET_HELD_CREATED",
  AUDIT_ONLY: "AUDIT_ONLY"
} as const;

export type PopsRewardReasonCode =
  (typeof POPS_REWARD_REASON_CODE)[keyof typeof POPS_REWARD_REASON_CODE];

export const POPS_USER_REWARD_COPY: Record<PopsRewardDecisionStatus, string> = {
  APPROVED_FULL: "Moment verified. Reward pending.",
  APPROVED_PARTIAL: "Partial moment verified. Reduced reward pending.",
  PENDING_REVIEW: "Reward pending verification.",
  HELD: "Reward held for review.",
  DENIED_LOW_CONFIDENCE: "Not enough presence was verified.",
  DENIED_FRAUD_RISK: "This session could not be verified.",
  DENIED_INELIGIBLE: "You are not eligible for this reward.",
  DENIED_DUPLICATE: "This session could not be verified.",
  DENIED_EXPIRED: "This session could not be verified."
};

export function isDeniedDecision(status: PopsRewardDecisionStatus): boolean {
  return (
    status === POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE ||
    status === POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK ||
    status === POPS_REWARD_DECISION_STATUS.DENIED_INELIGIBLE ||
    status === POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE ||
    status === POPS_REWARD_DECISION_STATUS.DENIED_EXPIRED
  );
}
