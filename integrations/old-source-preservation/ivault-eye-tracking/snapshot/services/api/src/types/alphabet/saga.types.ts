import type { AlphabetEvent } from "./event.types";

export type SagaType =
  | "reward_issuance"
  | "wallet_credit"
  | "withdrawal"
  | "conversion"
  | "creator_payout"
  | "campaign_launch"
  | "campaign_join"
  | "content_monetization"
  | "content_safety_action"
  | "content_rights_action"
  | "grant_issuance"
  | "admin_command"
  | "audit_export"
  | "notification_delivery"
  | "guardian_permission"
  | "system_action";

export type SagaRecordStatus =
  | "saga_created"
  | "saga_started"
  | "policy_pending"
  | "policy_passed"
  | "policy_failed"
  | "execution_pending"
  | "handler_validation_pending"
  | "handler_validation_passed"
  | "handler_validation_failed"
  | "execution_dispatched"
  | "execution_completed"
  | "execution_failed"
  | "audit_pending"
  | "audit_completed"
  | "notification_pending"
  | "notification_completed"
  | "saga_completed"
  | "saga_failed"
  | "saga_canceled"
  | "saga_compensating"
  | "saga_compensated";

export type SagaOutcomeStatus =
  | "saga_ready"
  | "saga_waiting"
  | "saga_blocked"
  | "saga_requires_review"
  | "saga_completed"
  | "saga_failed"
  | "saga_canceled"
  | "saga_compensation_required"
  | "saga_compensated";

export type SagaStepType =
  | "intent"
  | "policy"
  | "execution"
  | "handler_validation"
  | "handler_result"
  | "audit"
  | "notification"
  | "compensation"
  | "finalization";

export type SagaStepStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped"
  | "canceled"
  | "compensating"
  | "compensated";

export interface SagaStep {
  sagaStepId: string;
  stepType: SagaStepType;
  status: SagaStepStatus;
  label: string;
  sourceObjectId?: string | null;
  sourceEventId?: string | null;
  dependsOnStepIds: string[];
  retryCount: number;
  maxRetries: number;
  compensationRequired: boolean;
  compensationAction?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SagaRiskSignals {
  sagaRisk: number;
  policyRisk: number;
  executionRisk: number;
  handlerRisk: number;
  auditRisk: number;
  notificationRisk: number;
}

export interface SagaRecord {
  sagaId: string;
  sagaType: SagaType;
  status: SagaRecordStatus;
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  sourceActionIntentId?: string | null;
  policyDecisionId?: string | null;
  executionRequestIds: string[];
  handlerDefinitionIds: string[];
  auditRecordIds: string[];
  notificationIds: string[];
  sourceEventIds: string[];
  steps: SagaStep[];
  idempotencyKey?: string | null;
  timeoutDeadline?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  canceledAt?: string | null;
}

export interface SagaSignalInput {
  sagaId: string;
  sagaType: SagaType;
  currentStatus: SagaRecordStatus;
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  sourceActionIntentId?: string | null;
  policyDecisionId?: string | null;
  executionRequestIds: string[];
  handlerDefinitionIds: string[];
  auditRecordIds: string[];
  notificationIds: string[];
  sourceEventIds: string[];
  steps: SagaStep[];
  idempotencyKey?: string | null;
  timeoutDeadline?: string | null;
  now: string;
  riskSignals: SagaRiskSignals;
  policyPassed: boolean;
  policyFailed: boolean;
  executionDispatched: boolean;
  executionCompleted: boolean;
  executionFailed: boolean;
  handlerValidationPassed: boolean;
  handlerValidationFailed: boolean;
  auditCompleted: boolean;
  notificationCompleted: boolean;
  cancelRequested: boolean;
  compensationRequested: boolean;
  compensationCompleted: boolean;
  metadata?: Record<string, unknown>;
}

export interface SagaRuleSet {
  sagaType: SagaType;
  requiredStepTypes: SagaStepType[];
  requiresPolicy: boolean;
  requiresExecution: boolean;
  requiresHandlerValidation: boolean;
  requiresAudit: boolean;
  requiresNotification: boolean;
  allowLimitedCompletion: boolean;
  allowSkipNotification: boolean;
  requiresCompensationForMoneyFailure: boolean;
  minSagaProgressScore: number;
  minSagaHealthScore: number;
  minCompletionConfidenceScore: number;
  maxCompensationRiskScore: number;
  maxRetriesPerStep: number;
  defaultTimeoutMinutes: number;
  active: boolean;
}

export interface SagaEvaluationResult {
  sagaId: string;
  sagaType: SagaType;
  status: SagaOutcomeStatus;
  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  sagaProgressScore: number;
  sagaHealthScore: number;
  compensationRiskScore: number;
  completionConfidenceScore: number;
  ready: boolean;
  waiting: boolean;
  blocked: boolean;
  requiresReview: boolean;
  completed: boolean;
  failed: boolean;
  canceled: boolean;
  compensationRequired: boolean;
  compensated: boolean;
  nextRunnableSteps: SagaStep[];
  failedSteps: SagaStep[];
  blockedSteps: SagaStep[];
  finalizationOutput: {
    sagaId: string;
    sagaType: SagaType;
    status: SagaOutcomeStatus;
    completedObjectIds: {
      policyDecisionId?: string | null;
      executionRequestIds: string[];
      handlerDefinitionIds: string[];
      auditRecordIds: string[];
      notificationIds: string[];
    };
  } | null;
  compensationPlan: {
    required: boolean;
    actions: string[];
    reasonCodes: string[];
  };
  reasons: string[];
  sagaCreatedEvent: AlphabetEvent;
  sagaStartedEvent?: AlphabetEvent | null;
  sagaStepStartedEvent?: AlphabetEvent | null;
  sagaStepPassedEvent?: AlphabetEvent | null;
  sagaStepFailedEvent?: AlphabetEvent | null;
  sagaStepSkippedEvent?: AlphabetEvent | null;
  sagaPolicyPassedEvent?: AlphabetEvent | null;
  sagaPolicyFailedEvent?: AlphabetEvent | null;
  sagaExecutionDispatchedEvent?: AlphabetEvent | null;
  sagaExecutionCompletedEvent?: AlphabetEvent | null;
  sagaExecutionFailedEvent?: AlphabetEvent | null;
  sagaAuditCompletedEvent?: AlphabetEvent | null;
  sagaNotificationCompletedEvent?: AlphabetEvent | null;
  sagaCompletedEvent?: AlphabetEvent | null;
  sagaFailedEvent?: AlphabetEvent | null;
  sagaCanceledEvent?: AlphabetEvent | null;
  sagaCompensationRequiredEvent?: AlphabetEvent | null;
  sagaCompensatedEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
