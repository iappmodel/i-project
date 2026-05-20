import type { PopsReasonCode } from "../constants/pops-reason-codes";
import type { PopsRewardEligibility } from "./pops-decisions.types";

export type PopsProofLevel =
  | "LEVEL_0_NONE"
  | "LEVEL_1_SESSION"
  | "LEVEL_2_ATTENTION"
  | "LEVEL_3_INTENT"
  | "LEVEL_4_IDENTITY_CONTINUITY"
  | "LEVEL_5_HIGH_VALUE";

export type PopsSessionType =
  | "SPONSORED_WATCH"
  | "ORGANIC_VIEW"
  | "CREATOR_CONTENT"
  | "BRAND_CAMPAIGN"
  | "SURVEY"
  | "CTA_INTENT"
  | "WALLET_ACTION";

export type PopsSessionState =
  | "NOT_STARTED"
  | "INITIALIZING"
  | "ACTIVE"
  | "PAUSED"
  | "BACKGROUNDED"
  | "DEGRADED"
  | "COMPLETING"
  | "COMPLETED"
  | "REWARD_PENDING"
  | "REWARD_HELD"
  | "REWARD_APPROVED"
  | "REWARD_PARTIAL"
  | "REWARD_DENIED"
  | "CLOSED"
  | "FAILED";

export type PopsRecommendedAction =
  | "CONTINUE_TRACKING"
  | "SHOW_REWARD_PROGRESS"
  | "PAUSE_VERIFICATION"
  | "RESUME_VERIFICATION"
  | "COMPLETE_SESSION"
  | "APPROVE_REWARD"
  | "PARTIAL_REWARD"
  | "HOLD_REWARD"
  | "DENY_REWARD"
  | "CREATE_PRIVACY_RECEIPT";

export interface PopsExpectedReward {
  coinType: string;
  amount: number;
}

export interface PopsSession {
  id: string;
  userId: string;
  deviceId?: string;
  contentId?: string;
  campaignId?: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  state: PopsSessionState;
  startedAt: string;
  endedAt?: string;
  requiredDurationMs: number;
  requiredCompletionPct: number;
  expectedReward?: PopsExpectedReward;
  metadata?: Record<string, unknown>;
}

export interface PopsScore {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
}

export interface PopsSessionAggregate {
  sessionId: string;
  userId: string;
  totalDurationMs: number;
  activeDurationMs: number;
  foregroundDurationMs: number;
  backgroundDurationMs: number;
  pausedDurationMs: number;
  contentProgressPct: number;
  contentCompleted: boolean;
  pauseCount: number;
  resumeCount: number;
  tapCount: number;
  scrollCount: number;
  appBackgroundCount: number;
  appForegroundCount: number;
  screenActiveRatio: number;
  appForegroundRatio: number;
  progressWhileBackgrounded: boolean;
  completionTooFast: boolean;
  deviceIntegrityScore: number;
  accountContinuityScore: number;
  /** 0..1 — higher when pauses/backgrounds are few (session rhythm). */
  sessionConsistencyScore: number;
  reasonCodes: PopsReasonCode[];
}

export interface PopsJudgment {
  id: string;
  sessionId: string;
  userId: string;
  sessionState: PopsSessionState;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  rewardEligibility: PopsRewardEligibility;
  recommendedAction: PopsRecommendedAction;
  reasonCodes: PopsReasonCode[];
  userSafeSummary: string;
  internalSummary: string;
  createdAt: string;
}

export const POPS_PROOF_LEVELS: readonly PopsProofLevel[] = [
  "LEVEL_0_NONE",
  "LEVEL_1_SESSION",
  "LEVEL_2_ATTENTION",
  "LEVEL_3_INTENT",
  "LEVEL_4_IDENTITY_CONTINUITY",
  "LEVEL_5_HIGH_VALUE",
] as const;

export const POPS_SESSION_TYPES: readonly PopsSessionType[] = [
  "SPONSORED_WATCH",
  "ORGANIC_VIEW",
  "CREATOR_CONTENT",
  "BRAND_CAMPAIGN",
  "SURVEY",
  "CTA_INTENT",
  "WALLET_ACTION",
] as const;

export const POPS_SESSION_STATES: readonly PopsSessionState[] = [
  "NOT_STARTED",
  "INITIALIZING",
  "ACTIVE",
  "PAUSED",
  "BACKGROUNDED",
  "DEGRADED",
  "COMPLETING",
  "COMPLETED",
  "REWARD_PENDING",
  "REWARD_HELD",
  "REWARD_APPROVED",
  "REWARD_PARTIAL",
  "REWARD_DENIED",
  "CLOSED",
  "FAILED",
] as const;

export const POPS_RECOMMENDED_ACTIONS: readonly PopsRecommendedAction[] = [
  "CONTINUE_TRACKING",
  "SHOW_REWARD_PROGRESS",
  "PAUSE_VERIFICATION",
  "RESUME_VERIFICATION",
  "COMPLETE_SESSION",
  "APPROVE_REWARD",
  "PARTIAL_REWARD",
  "HOLD_REWARD",
  "DENY_REWARD",
  "CREATE_PRIVACY_RECEIPT",
] as const;
