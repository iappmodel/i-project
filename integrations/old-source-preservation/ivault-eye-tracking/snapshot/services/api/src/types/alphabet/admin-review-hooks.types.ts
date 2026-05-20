import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";
import type {
  AdminReviewCaseType,
  AdminReviewPriority,
  AdminReviewSeverity,
  AdminReviewTrigger
} from "./admin-review.types";

export type AdminReviewHookSource =
  | "policy_runtime"
  | "pipeline_runtime"
  | "external_transfer"
  | "compensation"
  | "provider_reconciliation"
  | "worker_execution"
  | "trust_engine"
  | "fraud_engine"
  | "manual_system";

export type AdminReviewHookTrigger =
  | "policy_requires_review"
  | "policy_blocked_high_risk"
  | "pipeline_requires_review"
  | "handler_validation_failed"
  | "worker_dead_lettered"
  | "external_transfer_unknown"
  | "external_transfer_requires_review"
  | "external_transfer_compensation_required"
  | "compensation_requires_review"
  | "compensation_blocked"
  | "provider_reconciliation_unmatched"
  | "provider_reconciliation_signature_failed"
  | "provider_reconciliation_unknown"
  | "fraud_risk_above_threshold"
  | "wallet_freeze_recommended"
  | "withdrawal_freeze_recommended";

export type AdminReviewHookOutcomeStatus =
  | "review_hook_noop"
  | "review_hook_create_case"
  | "review_hook_skip_duplicate"
  | "review_hook_blocked"
  | "review_hook_failed";

export interface AdminReviewHookSubjectIds {
  userId?: string | null;
  actorUserId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  providerReconciliationId?: string | null;
}

export interface AdminReviewHookInput {
  hookSource: AdminReviewHookSource;
  hookTrigger: AdminReviewHookTrigger;

  subjectIds: AdminReviewHookSubjectIds;

  sourceObjectType: string;
  sourceObjectId: string;

  rawEvidence: Json;
  redactedEvidence?: Json | null;

  publicSummary?: string | null;
  internalSummary?: string | null;

  sourceEventIds: string[];

  riskScore: number;
  uncertaintyScore: number;
  userImpactScore: number;
  platformImpactScore: number;

  moneyMovementPossible: boolean;
  paymentUncertainty: boolean;
  fraudSuspected: boolean;
  userVisible: boolean;

  existingOpenReviewCaseCount: number;

  now: string;
  metadata?: Json;
}

export interface AdminReviewHookRuleSet {
  hookTrigger: AdminReviewHookTrigger;

  reviewCaseType: AdminReviewCaseType;
  reviewTrigger: AdminReviewTrigger;

  defaultSeverity: AdminReviewSeverity;
  defaultPriority: AdminReviewPriority;

  failClosed: boolean;
  requiresReviewCase: boolean;
  blocksDownstreamIfCreationFails: boolean;

  minRiskScore: number;
  minUncertaintyScore: number;
  minReviewNecessityScore: number;
  maxDuplicateCaseRisk: number;

  dueInMinutesLow: number;
  dueInMinutesMedium: number;
  dueInMinutesHigh: number;
  dueInMinutesCritical: number;

  active: boolean;
}

export interface AdminReviewHookEvaluationResult {
  status: AdminReviewHookOutcomeStatus;

  hookSource: AdminReviewHookSource;
  hookTrigger: AdminReviewHookTrigger;

  reviewCaseType?: AdminReviewCaseType | null;
  reviewTrigger?: AdminReviewTrigger | null;

  severity: AdminReviewSeverity;
  priority: AdminReviewPriority;
  dueAt?: string | null;

  hookRiskScore: number;
  reviewNecessityScore: number;
  duplicateCaseRisk: number;

  shouldCreateCase: boolean;
  skipDuplicate: boolean;
  blocked: boolean;
  failed: boolean;

  idempotencyKey: string;
  dedupeKey: string;

  reasons: string[];

  adminReviewHookDetectedEvent: AlphabetEvent;
  adminReviewHookCaseCreatedEvent?: AlphabetEvent | null;
  adminReviewHookDuplicateSkippedEvent?: AlphabetEvent | null;
  adminReviewHookBlockedEvent?: AlphabetEvent | null;
  adminReviewHookFailedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface AdminReviewHookStoreResult {
  ok: boolean;
  evaluation: AdminReviewHookEvaluationResult;
  reviewCase?: unknown | null;
  eventIds: string[];
  reasonCodes: string[];
}
