import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type SafeActionType =
  | "request_reverification"
  | "restrict_withdrawals"
  | "unrestrict_withdrawals"
  | "freeze_wallet"
  | "unfreeze_wallet"
  | "freeze_campaign"
  | "unfreeze_campaign"
  | "pause_rewards"
  | "unpause_rewards"
  | "approve_compensation"
  | "reject_compensation"
  | "retry_provider_polling"
  | "create_manual_repair_task"
  | "escalate_to_risk_team"
  | "escalate_to_finance"
  | "escalate_to_compliance"
  | "escalate_to_engineering";

export type SafeActionStatus =
  | "safe_action_created"
  | "safe_action_policy_checking"
  | "safe_action_policy_blocked"
  | "safe_action_waiting_approval"
  | "safe_action_approved"
  | "safe_action_running"
  | "safe_action_completed"
  | "safe_action_failed"
  | "safe_action_cancelled"
  | "safe_action_requires_manual_execution";

export type SafeActionSeverity =
  | "info"
  | "warning"
  | "danger"
  | "critical";

export type SafeActionExecutionMode =
  | "automatic_safe"
  | "approval_required"
  | "manual_only"
  | "external_system_required";

export type SafeActionOutcome =
  | "safe_action_allow"
  | "safe_action_block"
  | "safe_action_wait_approval"
  | "safe_action_manual"
  | "safe_action_execute"
  | "safe_action_fail";

export type SafeActionIdempotencyStatus =
  | "idempotency_pending"
  | "idempotency_reserved"
  | "idempotency_duplicate"
  | "idempotency_conflict"
  | "idempotency_completed";

export interface SafeActionLinkedObjectIds {
  userId?: string | null;
  creatorId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  campaignId?: string | null;
  payoutId?: string | null;
  externalTransferId?: string | null;
  ledgerEntryId?: string | null;
  policyDecisionId?: string | null;
  compensationId?: string | null;
  executionRequestId?: string | null;
}

export interface SafeActionSourceLinks {
  commandItemId?: string | null;
  commandDecisionId?: string | null;
  reviewCaseId?: string | null;
  alertId?: string | null;
  actorAdminId: string;
  approverAdminId?: string | null;
}

export interface SafeActionPolicyResult {
  allowed: boolean;
  blocked: boolean;
  requiresApproval: boolean;
  requiresManualExecution: boolean;
  reasonCodes: string[];
}

export interface SafeActionExecutionPlan {
  steps: string[];
  currentStep?: string | null;
  completedSteps: string[];
  failedStep?: string | null;
}

export interface SafeActionSignalInput {
  safeActionType: SafeActionType;
  requestedAction: string;
  normalizedAction: string;

  severity: SafeActionSeverity;
  executionMode: SafeActionExecutionMode;

  sourceLinks: SafeActionSourceLinks;
  linkedObjectIds: SafeActionLinkedObjectIds;

  targetObjectType?: string | null;
  targetObjectId?: string | null;

  policyResult: SafeActionPolicyResult;

  idempotencyKey: string;
  dedupeKey: string;
  idempotencyStatus: SafeActionIdempotencyStatus;

  executionPlan: SafeActionExecutionPlan;

  beforeState: Json;
  afterState: Json;

  evidence: Json;
  redactedEvidence: Json;

  resultPayload: Json;
  errorPayload: Json;

  sourceEventIds: string[];
  auditRecordIds: string[];

  now: string;
  metadata?: Json;
}

export interface SafeActionRuleSet {
  safeActionType: SafeActionType;

  defaultSeverity: SafeActionSeverity;
  executionMode: SafeActionExecutionMode;

  requiresApprovedDecision: boolean;
  requiresManualExecution: boolean;
  createsExecutionRequest: boolean;
  canMutateWalletStatus: boolean;
  canMutateCampaignStatus: boolean;
  canCreateCompensationRequest: boolean;
  canCreateProviderRetryRequest: boolean;
  canCreateManualRepairTask: boolean;

  minConfidenceScore: number;
  blockRiskScore: number;
  manualRiskScore: number;
  approvalRiskScore: number;

  active: boolean;
}

export interface SafeActionEvaluationResult {
  outcome: SafeActionOutcome;
  dbStatus: SafeActionStatus;

  safeActionType: SafeActionType;
  severity: SafeActionSeverity;
  executionMode: SafeActionExecutionMode;

  executionRiskScore: number;
  confidenceScore: number;

  allowed: boolean;
  blocked: boolean;
  waitingApproval: boolean;
  manualRequired: boolean;
  executable: boolean;
  failed: boolean;

  shouldRunNow: boolean;
  shouldPersistExecution: boolean;

  reasons: string[];

  createdEvent: AlphabetEvent;
  policyAllowedEvent?: AlphabetEvent | null;
  policyBlockedEvent?: AlphabetEvent | null;
  approvalRequiredEvent?: AlphabetEvent | null;
  manualRequiredEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface SafeActionRunResult {
  ok: boolean;
  status: SafeActionStatus;
  resultPayload: Json;
  errorPayload: Json;
  sourceEventIds: string[];
  auditRecordIds: string[];
  reasonCodes: string[];
  retryable: boolean;
}
