import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type TrustFraudReviewScope =
  | "global_daily"
  | "user_daily"
  | "creator_daily"
  | "wallet_daily"
  | "campaign_daily"
  | "device_cluster_daily"
  | "reward_daily"
  | "payout_daily";

export type TrustFraudReviewStatus =
  | "trust_fraud_batch_created"
  | "trust_fraud_batch_running"
  | "trust_fraud_batch_completed"
  | "trust_fraud_batch_completed_with_warnings"
  | "trust_fraud_batch_failed"
  | "trust_fraud_batch_requires_review";

export type TrustFraudReviewSeverity =
  | "info"
  | "warning"
  | "danger"
  | "critical";

export type TrustFraudReviewOutcome =
  | "trust_fraud_clean"
  | "trust_fraud_warning"
  | "trust_fraud_failed"
  | "trust_fraud_critical"
  | "trust_fraud_requires_review";

export type TrustFraudFindingType =
  | "trust_score_drop"
  | "fraud_risk_spike"
  | "reward_velocity_spike"
  | "earning_loop_abuse"
  | "duplicate_device_cluster"
  | "duplicate_identity_cluster"
  | "suspicious_presence_pattern"
  | "suspicious_watch_verify_pattern"
  | "suspicious_creator_payout_pattern"
  | "payout_risk_above_threshold"
  | "wallet_risk_above_threshold"
  | "campaign_abuse_pattern"
  | "campaign_budget_drain_pattern"
  | "age_policy_conflict"
  | "kyc_policy_conflict"
  | "repeated_review_failures"
  | "repeated_operational_alerts"
  | "compensation_abuse_pattern"
  | "external_transfer_failure_pattern"
  | "sybil_cluster_candidate";

export type TrustFraudFindingCategory =
  | "trust"
  | "fraud"
  | "wallet"
  | "payout"
  | "campaign"
  | "creator"
  | "age_policy"
  | "identity"
  | "device"
  | "reward"
  | "presence";

export type TrustFraudRecommendedAction =
  | "no_action"
  | "monitor"
  | "create_review_case"
  | "request_reverification"
  | "restrict_withdrawals"
  | "freeze_wallet_review"
  | "freeze_campaign_review"
  | "pause_rewards_review"
  | "escalate_to_risk_team"
  | "escalate_to_compliance";

export interface TrustFraudReviewCounts {
  userCount: number;
  walletCount: number;
  walletAccountCount: number;
  ledgerEntryCount: number;
  alphabetEventCount: number;
  trustEventCount: number;
  uValueEventCount: number;
  rewardEventCount: number;
  payoutCount: number;
  campaignCount: number;
  deviceSignalCount: number;
  presenceSignalCount: number;
  policyDecisionCount: number;
  adminReviewCaseCount: number;
  operationalAlertCount: number;
}

export interface TrustFraudLinkedObjectIds {
  userId?: string | null;
  creatorId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  campaignId?: string | null;
  payoutId?: string | null;
  externalTransferId?: string | null;
  ledgerEntryId?: string | null;
  policyDecisionId?: string | null;
  reviewCaseId?: string | null;
  alertId?: string | null;
  deviceClusterId?: string | null;
  identityClusterId?: string | null;
  presenceSessionId?: string | null;
  alphabetEventId?: string | null;
}

export interface TrustFraudFindingScores {
  trustRiskScore: number;
  fraudRiskScore: number;
  walletRiskScore: number;
  payoutRiskScore: number;
  campaignRiskScore: number;
  agePolicyRiskScore: number;
  identityRiskScore: number;
  deviceRiskScore: number;
  rewardAbuseRiskScore: number;
  presenceRiskScore: number;
  confidenceScore: number;
}

export interface TrustFraudFinding {
  findingId: string;
  findingType: TrustFraudFindingType;
  category: TrustFraudFindingCategory;
  severity: TrustFraudReviewSeverity;
  title: string;
  summary: string;
  linkedObjectIds: TrustFraudLinkedObjectIds;
  scores: TrustFraudFindingScores;
  recommendedActions: TrustFraudRecommendedAction[];
  evidence: Json;
  redactedEvidence: Json;
  reasonCodes: string[];
}

export interface TrustFraudReviewSignalInput {
  batchScope: TrustFraudReviewScope;
  /** Stable UUID used as alphabet_events.object_id (composite keys live in metadata). */
  batchObjectId: string;

  batchDate: string;
  periodStart: string;
  periodEnd: string;

  counts: TrustFraudReviewCounts;
  findings: TrustFraudFinding[];

  sourceEventIds: string[];

  generatedBy: string;
  now: string;
  metadata?: Json;
}

export interface TrustFraudReviewRuleSet {
  batchScope: TrustFraudReviewScope;

  createsOperationalAlert: boolean;
  createsReviewCase: boolean;

  minConfidenceScore: number;
  warningRiskScore: number;
  dangerRiskScore: number;
  criticalRiskScore: number;
  reviewRiskScore: number;

  active: boolean;
}

export interface TrustFraudReviewEvaluationResult {
  status: TrustFraudReviewOutcome;
  dbStatus: TrustFraudReviewStatus;
  severity: TrustFraudReviewSeverity;

  batchScope: TrustFraudReviewScope;
  batchDate: string;

  findingCount: number;
  criticalFindingCount: number;
  fraudFindingCount: number;
  walletFindingCount: number;
  payoutFindingCount: number;
  campaignFindingCount: number;
  identityFindingCount: number;
  deviceFindingCount: number;
  rewardFindingCount: number;
  presenceFindingCount: number;
  agePolicyFindingCount: number;

  batchRiskScore: number;
  batchConfidenceScore: number;
  actionUrgencyScore: number;

  clean: boolean;
  warning: boolean;
  failed: boolean;
  critical: boolean;
  requiresReview: boolean;

  shouldCreateOperationalAlert: boolean;
  shouldCreateReviewCase: boolean;

  recommendedActions: TrustFraudRecommendedAction[];

  reasons: string[];

  trustFraudReviewStartedEvent: AlphabetEvent;
  trustFraudReviewCompletedEvent?: AlphabetEvent | null;
  trustFraudReviewWarningEvent?: AlphabetEvent | null;
  trustFraudReviewFailedEvent?: AlphabetEvent | null;
  trustFraudReviewCriticalEvent?: AlphabetEvent | null;
  trustFraudReviewRequiredEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface TrustFraudReviewJobResult {
  ok: boolean;
  resultPayload: Json;
  scannedObjectCounts: Record<string, number>;
  mutationCounts: Record<string, number>;
  sourceEventIds: string[];
  createdAlertIds: string[];
  createdReviewCaseIds: string[];
  reasonCodes: string[];
  retryable: boolean;
}
