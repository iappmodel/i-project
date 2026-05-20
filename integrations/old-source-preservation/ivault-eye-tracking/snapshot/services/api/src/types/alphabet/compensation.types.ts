import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type CompensationType =
  | "ledger_reversal"
  | "withdrawal_reversal"
  | "payout_reversal"
  | "campaign_reserve_release"
  | "campaign_reserve_reversal"
  | "grant_reversal"
  | "reward_reversal"
  | "conversion_reversal"
  | "notification_correction"
  | "audit_correction"
  | "saga_compensation"
  | "manual_admin_compensation";

export type CompensationTrigger =
  | "execution_failed_after_mutation"
  | "external_transfer_failed"
  | "policy_reversal"
  | "admin_reversal"
  | "duplicate_detected_after_mutation"
  | "fraud_detected_after_mutation"
  | "rights_violation_after_payout"
  | "user_refund"
  | "campaign_cancelation"
  | "grant_ineligibility"
  | "system_error";

export type CompensationRecordStatus =
  | "compensation_created"
  | "compensation_pending"
  | "compensation_validating"
  | "compensation_blocked"
  | "compensation_ready"
  | "compensation_executing"
  | "compensation_completed"
  | "compensation_failed"
  | "compensation_requires_review"
  | "compensation_canceled";

export type CompensationOutcomeStatus =
  | "compensation_ready"
  | "compensation_blocked"
  | "compensation_requires_review"
  | "compensation_execute_reversal"
  | "compensation_completed"
  | "compensation_failed"
  | "compensation_canceled";

export interface CompensationSafetyScores {
  originalMutationConfidence: number;
  reversalEligibilityScore: number;
  reversalSafetyScore: number;
  compensationUrgencyScore: number;
  compensationFraudRisk: number;
  compensationAuditScore: number;
}

export interface CompensationRecord {
  compensationId: string;

  compensationType: CompensationType;
  triggerType: CompensationTrigger;
  status: CompensationRecordStatus;

  originalExecutionRequestId?: string | null;
  originalLedgerEntryId?: string | null;
  originalSagaId?: string | null;
  originalPipelineId?: string | null;
  originalPolicyDecisionId?: string | null;
  originalWalletId?: string | null;
  originalWalletAccountId?: string | null;
  originalUserId: string;

  reversalLedgerEntryId?: string | null;
  reversalExecutionRequestId?: string | null;
  reversalAuditRecordId?: string | null;
  reversalNotificationId?: string | null;

  amount: number;
  coinCode: string;
  originalDirection: "credit" | "debit";
  reversalDirection: "credit" | "debit";

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds: string[];
  reasonCodes: string[];

  requiresReview: boolean;
  actorUserId?: string | null;

  safetyScores: CompensationSafetyScores;
  metadata: Json;

  createdAt: string;
  updatedAt: string;
  validatedAt?: string | null;
  executedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  canceledAt?: string | null;
}

export interface CompensationSignalInput {
  compensationId: string;

  compensationType: CompensationType;
  triggerType: CompensationTrigger;
  currentStatus: CompensationRecordStatus;

  originalExecutionRequestId?: string | null;
  originalLedgerEntryId?: string | null;
  originalSagaId?: string | null;
  originalPipelineId?: string | null;
  originalPolicyDecisionId?: string | null;
  originalWalletId?: string | null;
  originalWalletAccountId?: string | null;
  originalUserId: string;

  existingReversalLedgerEntryIds: string[];

  amount: number;
  originalAmount: number;
  alreadyReversedAmount: number;
  coinCode: string;
  originalDirection: "credit" | "debit";
  reversalDirection: "credit" | "debit";

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds: string[];
  reasonCodes: string[];

  requiresReview: boolean;
  reviewApproved: boolean;
  cancelRequested: boolean;

  externalTransferMayHaveStarted: boolean;
  externalTransferConfirmedFailed: boolean;

  actorUserId?: string | null;

  safetyScores: CompensationSafetyScores;

  now: string;
  metadata?: Json;
}

export interface CompensationRuleSet {
  compensationType: CompensationType;

  financialCompensation: boolean;
  requiresOriginalLedgerEntry: boolean;
  requiresIdempotency: boolean;
  requiresDedupe: boolean;
  requiresAudit: boolean;
  requiresNotification: boolean;
  requiresAdminActor: boolean;
  automaticExecutionAllowed: boolean;

  minOriginalMutationConfidence: number;
  minReversalEligibilityScore: number;
  minReversalSafetyScore: number;
  maxFraudRisk: number;
  minCompensationReadinessScore: number;
  minCompensationSafetyScore: number;

  active: boolean;
}

export interface CompensationEvaluationResult {
  compensationId: string;

  compensationType: CompensationType;
  triggerType: CompensationTrigger;
  status: CompensationOutcomeStatus;

  originalUserId: string;
  originalLedgerEntryId?: string | null;
  originalExecutionRequestId?: string | null;
  originalPipelineId?: string | null;
  originalSagaId?: string | null;

  compensationReadinessScore: number;
  compensationSafetyScore: number;

  ready: boolean;
  blocked: boolean;
  requiresReview: boolean;
  executeReversal: boolean;
  completed: boolean;
  failed: boolean;
  canceled: boolean;

  reversalAmount: number;
  reversalDirection: "credit" | "debit";
  maxReversibleAmount: number;

  auditRequired: boolean;
  notificationRequired: boolean;

  reasons: string[];

  compensationCreatedEvent: AlphabetEvent;
  compensationValidatingEvent?: AlphabetEvent | null;
  compensationBlockedEvent?: AlphabetEvent | null;
  compensationReadyEvent?: AlphabetEvent | null;
  compensationReversalExecutedEvent?: AlphabetEvent | null;
  compensationCompletedEvent?: AlphabetEvent | null;
  compensationFailedEvent?: AlphabetEvent | null;
  compensationRequiresReviewEvent?: AlphabetEvent | null;
  compensationCanceledEvent?: AlphabetEvent | null;

  metadata: Json;
}
