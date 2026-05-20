import type { PopsPipelineEvent } from "./pops-pipeline-events";

export interface PopsPipelineSession {
  id: string;
  userId: string;
  campaignId: string;
  startedAtMs: number;
  endedAtMs: number;
  contentId?: string;
}

export interface PopsPipelineEventRecord {
  type: string;
  timestampMs: number;
  confidence?: number;
}

export interface PopsPipelineSignalBatch {
  timestampMs: number;
  presenceScore: number;
  attentionScore: number;
  intentScore: number;
  continuityScore: number;
  fraudSignals?: number;
  scoringErrorCode?: string;
}

export interface PopsCampaignRequirements {
  minPresenceScore: number;
  minAttentionScore: number;
  minIntentScore: number;
  minContinuityScore: number;
  maxFraudRisk: number;
  rewardAmountMinor: number;
  currency: "USD" | "ICOIN" | "VCOIN" | "RCOIN";
  holdOnMediumRisk?: boolean;
  trustFailureBlocksRelease?: boolean;
}

export interface PopsUserTrustProfile {
  level: number;
  riskScore: number;
}

export interface PopsWalletRiskProfile {
  blocked: boolean;
  requiresManualReview: boolean;
  retryableIntegrationFailure?: boolean;
}

export interface PopsEligibilityProfile {
  eligible: boolean;
  reasonCodes: string[];
}

export interface PopsPrivacyPolicy {
  version: string;
  allowRawSensitiveStorageByDefault: boolean;
  retentionDays: number;
}

export interface PopsPipelineInput {
  session: PopsPipelineSession;
  events: PopsPipelineEventRecord[];
  signalBatches: PopsPipelineSignalBatch[];
  campaignRequirements: PopsCampaignRequirements;
  userTrustProfile: PopsUserTrustProfile;
  walletRiskProfile: PopsWalletRiskProfile;
  eligibilityProfile: PopsEligibilityProfile;
  privacyPolicy: PopsPrivacyPolicy;
}

export interface PopsScoreBreakdown {
  presence: number;
  attention: number;
  intent: number;
  continuity: number;
  fraudRisk: number;
}

export interface PopsPipelineJudgment {
  status: "PASS" | "REVIEW" | "FAIL";
  reasonCodes: string[];
  scoreBreakdown: PopsScoreBreakdown;
  auditable: true;
}

export interface PopsPipelineRewardDecision {
  status: "APPROVED" | "PENDING_REVIEW" | "DENIED";
  amountMinor: number;
  currency: "USD" | "ICOIN" | "VCOIN" | "RCOIN";
  reasonCodes: string[];
  denialRequiresReview: boolean;
  auditable: true;
}

export interface PopsPipelineWalletIntent {
  status: "READY" | "PENDING_REVIEW" | "RETRY_SCHEDULED" | "BLOCKED";
  amountMinor: number;
  currency: "USD" | "ICOIN" | "VCOIN" | "RCOIN";
  retryAtMs: number | null;
  reasonCodes: string[];
  rewardDecisionPreserved: boolean;
  auditable: true;
}

export interface PopsTrustImpact {
  status: "NO_CHANGE" | "INCREASE" | "DECREASE" | "PENDING";
  delta: number;
  reasonCodes: string[];
  integrationFailed: boolean;
  blocksReward: boolean;
  auditable: true;
}

export interface PopsPipelinePrivacyReceipt {
  id: string;
  sessionId: string;
  policyVersion: string;
  retainedFeatures: string[];
  rawSensitiveDataStored: boolean;
  reasonCodes: string[];
  createdAtMs: number;
  auditable: true;
}

export interface PopsAdminReviewItem {
  id: string;
  sessionId: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  reasonCodes: string[];
  createdAtMs: number;
  auditable: true;
}

export interface PopsPipelineRecommendedAction {
  type:
    | "RELEASE_REWARD"
    | "REVIEW_REWARD"
    | "BLOCK_REWARD"
    | "WAIT_FOR_PRIVACY_RECEIPT"
    | "RETRY_WALLET_INTENT";
  reasonCodes: string[];
}

export interface PopsPipelineOutput {
  judgment: PopsPipelineJudgment;
  rewardDecision: PopsPipelineRewardDecision;
  walletIntent: PopsPipelineWalletIntent;
  trustImpact: PopsTrustImpact;
  privacyReceipt: PopsPipelinePrivacyReceipt | null;
  adminReviewItem: PopsAdminReviewItem | null;
  recommendedAction: PopsPipelineRecommendedAction;
  pipelineEvents: PopsPipelineEvent[];
}
