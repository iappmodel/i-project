import type { PopsReasonCode } from "../constants/pops-reason-codes";

export type PopsRewardEligibility =
  | "NOT_ELIGIBLE"
  | "ELIGIBLE_PARTIAL"
  | "ELIGIBLE_FULL"
  | "HELD_FOR_REVIEW"
  | "DENIED";

export type PopsRewardDecisionStatus =
  | "APPROVED_FULL"
  | "APPROVED_PARTIAL"
  | "HELD"
  | "DENIED_LOW_CONFIDENCE"
  | "DENIED_FRAUD_RISK";

export type PopsWalletIntentStatus = "NONE" | "PENDING" | "HELD" | "DENIED";

export interface PopsRewardDecision {
  id: string;
  sessionId: string;
  judgmentId: string;
  userId: string;
  campaignId?: string;
  contentId?: string;
  coinType: string;
  baseAmount: number;
  finalAmount: number;
  decisionStatus: PopsRewardDecisionStatus;
  rewardQuality: number;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  holdRequired: boolean;
  holdReason?: string;
  reasonCodes: PopsReasonCode[];
  userVisibleMessage: string;
  createdAt: string;
}

export interface PopsWalletRewardIntent {
  id: string;
  rewardDecisionId: string;
  sessionId: string;
  userId: string;
  campaignId?: string;
  coinType: string;
  amount: number;
  status: PopsWalletIntentStatus;
  holdReason?: string;
  releaseEligibleAt?: string;
  createdAt: string;
}

export const POPS_REWARD_ELIGIBILITY: readonly PopsRewardEligibility[] = [
  "NOT_ELIGIBLE",
  "ELIGIBLE_PARTIAL",
  "ELIGIBLE_FULL",
  "HELD_FOR_REVIEW",
  "DENIED",
] as const;

export const POPS_REWARD_DECISION_STATUSES: readonly PopsRewardDecisionStatus[] = [
  "APPROVED_FULL",
  "APPROVED_PARTIAL",
  "HELD",
  "DENIED_LOW_CONFIDENCE",
  "DENIED_FRAUD_RISK",
] as const;

export const POPS_WALLET_INTENT_STATUSES: readonly PopsWalletIntentStatus[] = ["NONE", "PENDING", "HELD", "DENIED"] as const;
