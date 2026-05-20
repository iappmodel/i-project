import type { AlphabetEvent } from "./event.types";

export type ExecutionTargetSystem =
  | "wallet"
  | "reward"
  | "conversion"
  | "withdrawal"
  | "campaign"
  | "creator_payout"
  | "content_rights"
  | "content_safety"
  | "age_guardian"
  | "grant"
  | "treasury"
  | "review"
  | "audit"
  | "notification"
  | "admin"
  | "trust"
  | "u_value"
  | "system";

export type ExecutionAction =
  | "allow"
  | "limit"
  | "hold"
  | "block"
  | "escalate"
  | "credit"
  | "debit"
  | "convert"
  | "withdraw"
  | "payout"
  | "reserve"
  | "release"
  | "reverse"
  | "restore"
  | "remove"
  | "pause"
  | "resume"
  | "notify"
  | "create_review"
  | "create_audit"
  | "request_guardian"
  | "request_verification"
  | "apply_trust_event"
  | "apply_u_value_event"
  | "noop";

export type ExecutionRecordStatus =
  | "request_created"
  | "queued"
  | "dispatch_allowed"
  | "dispatch_denied"
  | "dispatch_requires_review"
  | "dispatched"
  | "executed"
  | "failed"
  | "canceled";

export type ExecutionOutcomeStatus =
  | "execution_queued"
  | "execution_allowed"
  | "execution_denied"
  | "execution_requires_review"
  | "execution_dispatched"
  | "execution_completed"
  | "execution_failed"
  | "execution_canceled";

export type ExecutionPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent"
  | "critical";

export interface ExecutionRequestRecord {
  executionRequestId: string;
  sourcePolicyDecisionId?: string | null;
  sourceEventIds: string[];
  targetSystem: ExecutionTargetSystem;
  targetObjectId?: string | null;
  action: ExecutionAction;
  status: ExecutionRecordStatus;
  priority: ExecutionPriority;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  retryCount: number;
  maxRetries: number;
  handlerName: string;
  handlerVersion: string;
  payload: Record<string, unknown>;
  sanitizedPayload: Record<string, unknown>;
  resultPayload?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string | null;
  executedAt?: string | null;
  failedAt?: string | null;
}

export interface ExecutionRouterSignalInput {
  executionRequestId: string;
  sourcePolicyDecisionId?: string | null;
  sourceEventIds: string[];
  targetSystem: ExecutionTargetSystem;
  targetObjectId?: string | null;
  action: ExecutionAction;
  currentStatus: ExecutionRecordStatus;
  priority: ExecutionPriority;
  policyDecision:
    | "allow"
    | "allow_with_limits"
    | "hold"
    | "require_guardian"
    | "require_review"
    | "require_audit"
    | "require_treasury"
    | "require_verification"
    | "block"
    | "escalate";
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  duplicateRequestCount: number;
  retryCount: number;
  maxRetries: number;
  handlerName: string;
  handlerVersion: string;
  handlerAvailable: boolean;
  handlerHealthy: boolean;
  payload: Record<string, unknown>;
  sanitizedPayload: Record<string, unknown>;
  resultPayload?: Record<string, unknown> | null;
  dispatchRequested: boolean;
  executionSucceeded: boolean;
  executionFailed: boolean;
  cancelRequested: boolean;
  requiresAudit: boolean;
  auditCreated: boolean;
  containsRestrictedPayloadKeys: boolean;
  containsPaymentData: boolean;
  containsPrivateUserData: boolean;
  containsRawRiskData: boolean;
  riskScore: number;
  paymentRisk: number;
  privacyRisk: number;
  complianceRisk: number;
  handlerRisk: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutionRouterRuleSet {
  targetSystem: ExecutionTargetSystem;
  allowedActions: ExecutionAction[];
  requiresIdempotency: boolean;
  requiresAuditForDangerousActions: boolean;
  allowMutationWithoutPolicyAllow: boolean;
  minDispatchSafetyScore: number;
  minHandlerReadinessScore: number;
  minPayloadSafetyScore: number;
  minRetrySafetyScore: number;
  maxExecutionRiskScore: number;
  maxRetries: number;
  active: boolean;
}

export interface ExecutionRouterEvaluationResult {
  executionRequestId: string;
  sourcePolicyDecisionId?: string | null;
  sourceEventIds: string[];
  targetSystem: ExecutionTargetSystem;
  targetObjectId?: string | null;
  action: ExecutionAction;
  status: ExecutionOutcomeStatus;
  dispatchSafetyScore: number;
  handlerReadinessScore: number;
  payloadSafetyScore: number;
  retrySafetyScore: number;
  executionRiskScore: number;
  queued: boolean;
  dispatchAllowed: boolean;
  dispatchDenied: boolean;
  requiresReview: boolean;
  dispatched: boolean;
  completed: boolean;
  failed: boolean;
  canceled: boolean;
  sanitizedPayload: Record<string, unknown>;
  resultPayload?: Record<string, unknown> | null;
  handlerRoute: {
    targetSystem: ExecutionTargetSystem;
    handlerName: string;
    handlerVersion: string;
    action: ExecutionAction;
  };
  auditRequired: boolean;
  notificationRecommended: boolean;
  reasons: string[];
  executionRequestCreatedEvent: AlphabetEvent;
  executionQueuedEvent?: AlphabetEvent | null;
  executionAllowedEvent?: AlphabetEvent | null;
  executionDeniedEvent?: AlphabetEvent | null;
  executionRequiresReviewEvent?: AlphabetEvent | null;
  executionDispatchedEvent?: AlphabetEvent | null;
  executionCompletedEvent?: AlphabetEvent | null;
  executionFailedEvent?: AlphabetEvent | null;
  executionCanceledEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
