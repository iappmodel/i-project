import type { AlphabetEvent } from "./event.types";
import type { ActionIntentOutcomeStatus } from "./action-intent.types";
import type { ExecutionTargetSystem } from "./execution-router.types";

export interface PipelineComposerStepSnapshot {
  stepName: string;
  status: string;
  objectId?: string | null;
  reasonCodes: string[];
}

export interface PipelineComposerRiskSignals {
  intentRisk: number;
  policyRisk: number;
  sagaRisk: number;
  executionRisk: number;
  handlerRisk: number;
  auditRisk: number;
  notificationRisk: number;
  totalPipelineRisk: number;
}

export interface PipelineComposerFinalResponse {
  allowedToContinue: boolean;
  requiresUserAction: boolean;
  userActionType: "none" | "retry" | "wait_for_review" | "authenticate";
  publicMessage: string;
  internalReasonCodes: string[];
}

export interface PipelineComposerSignalInput {
  pipelineId: string;
  pipelineType: string;
  currentStatus: string;
  userId: string;
  actorUserId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  requestSource: string;
  requestChannel: string;
  requestedIntentType: string;
  requestedPolicyAction: string;
  requestedPolicyDomain: string;
  requestedSagaType: string;
  targetSystems: ExecutionTargetSystem[];
  actionIntentId: string;
  policyDecisionId: string;
  sagaId: string | null;
  executionRequestIds: string[];
  handlerDefinitionIds: string[];
  auditRecordIds: string[];
  notificationIds: string[];
  sourceEventIds: string[];
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  steps: PipelineComposerStepSnapshot[];
  riskSignals: PipelineComposerRiskSignals;
  intentStatus: ActionIntentOutcomeStatus;
  policyStatus: string;
  policyDecision: string;
  sagaStatus: string | null;
  executionStatuses: string[];
  intentAccepted: boolean;
  intentRejected: boolean;
  policyCreated: boolean;
  policyAllowed: boolean;
  policyBlocked: boolean;
  policyRequiresReview: boolean;
  sagaCreated: boolean;
  sagaCompleted: boolean;
  sagaFailed: boolean;
  sagaCompensationRequired: boolean;
  executionCreated: boolean;
  executionCompleted: boolean;
  executionFailed: boolean;
  handlerValidated: boolean;
  handlerValidationFailed: boolean;
  auditCreated: boolean;
  notificationCreated: boolean;
  cancelRequested: boolean;
  metadata?: Record<string, unknown>;
}

export interface PipelineComposerEvaluationResult {
  pipelineId: string;
  pipelineType: string;
  status: string;
  reasons: string[];
  finalResponse: PipelineComposerFinalResponse;
  pipelineCreatedEvent: AlphabetEvent;
  pipelineIntentCreatedEvent?: AlphabetEvent | null;
  pipelinePolicyCreatedEvent?: AlphabetEvent | null;
  pipelineSagaCreatedEvent?: AlphabetEvent | null;
  pipelineExecutionCreatedEvent?: AlphabetEvent | null;
  pipelineHandlerValidatedEvent?: AlphabetEvent | null;
  pipelineAuditCreatedEvent?: AlphabetEvent | null;
  pipelineNotificationCreatedEvent?: AlphabetEvent | null;
  pipelineReadyEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
