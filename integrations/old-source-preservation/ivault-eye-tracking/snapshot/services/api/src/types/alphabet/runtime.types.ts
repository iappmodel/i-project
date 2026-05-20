import type {
  ActionApiAuthContext,
  ActionApiInternalResponse,
  ActionApiPublicResponse,
  ActionApiRequestPayload
} from "./action-api.types";
import type { ActionIntentEvaluationResult } from "./action-intent.types";
import type { PipelineComposerEvaluationResult } from "./pipeline-composer.types";
import type { SagaEvaluationResult } from "./saga.types";
import type { ExecutionRouterEvaluationResult } from "./execution-router.types";
import type { HandlerRegistryEvaluationResult } from "./handler-registry.types";
import type { Json } from "./database.types";

export type RuntimeMode =
  | "public_api"
  | "admin_api"
  | "worker"
  | "scheduler"
  | "test";

export type RuntimeStage =
  | "api_validation"
  | "action_intent"
  | "policy"
  | "pipeline"
  | "saga"
  | "execution"
  | "handler_validation"
  | "audit"
  | "notification"
  | "final_response";

export type RuntimeStatus =
  | "runtime_started"
  | "runtime_intent_created"
  | "runtime_intent_failed"
  | "runtime_policy_created"
  | "runtime_policy_blocked"
  | "runtime_pipeline_created"
  | "runtime_saga_created"
  | "runtime_execution_created"
  | "runtime_handler_validated"
  | "runtime_audit_created"
  | "runtime_notification_created"
  | "runtime_completed"
  | "runtime_failed";

export interface RuntimeInput {
  mode: RuntimeMode;
  payload: ActionApiRequestPayload;
  authContext: ActionApiAuthContext;
  requestHeaders?: Record<string, string | null>;
}

export interface RuntimeLinkedObjectIds {
  actionIntentId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestIds: string[];
  handlerDefinitionIds: string[];
  auditRecordIds: string[];
  notificationIds: string[];
  eventIds: string[];
}

export interface RuntimeTraceStep {
  stage: RuntimeStage;
  status: RuntimeStatus;
  objectId?: string | null;
  reasonCodes: string[];
  metadata?: Json;
}

export interface RuntimeResult {
  ok: boolean;
  status: RuntimeStatus;
  /** Preferred HTTP status for API layer (e.g. 401, 422). Defaults to 400 when absent and !ok. */
  httpStatus?: number;

  publicResponse: ActionApiPublicResponse;
  internalResponse?: ActionApiInternalResponse;

  linkedObjectIds: RuntimeLinkedObjectIds;

  trace: RuntimeTraceStep[];

  intentResult?: ActionIntentEvaluationResult | null;
  pipelineResult?: PipelineComposerEvaluationResult | null;
  sagaResult?: SagaEvaluationResult | null;
  executionResults: ExecutionRouterEvaluationResult[];
  handlerResults: HandlerRegistryEvaluationResult[];

  reasonCodes: string[];
}

export interface RuntimePolicyDraft {
  userId: string;
  actionType: string;
  primaryDomain: string;
  decision: "allow" | "allow_with_limits" | "hold" | "require_review" | "block" | "escalate";
  status: string;
  ageBand: string;
  trustScore: number;
  uValueScore: number;
  riskSignals: Json;
  gateResults: Json;
  downstreamInstructions: Json;
  metadata: Json;
}

export interface RuntimeSagaDraft {
  sagaType: string;
  userId: string;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  sourceActionIntentId?: string | null;
  policyDecisionId?: string | null;
  idempotencyKey?: string | null;
  sourceEventIds: string[];
}

export interface RuntimeExecutionDraft {
  sourcePolicyDecisionId?: string | null;
  sourceEventIds: string[];
  targetSystem: string;
  targetObjectId?: string | null;
  action: string;
  priority: string;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  handlerName: string;
  handlerVersion: string;
  payload: Json;
  sanitizedPayload: Json;
  metadata: Json;
}

export interface RuntimeAuditDraft {
  auditType: string;
  status: string;
  userId?: string | null;
  actorUserId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  policyDecisionId?: string | null;
  executionRequestId?: string | null;
  sagaId?: string | null;
  pipelineId?: string | null;
  sourceEventIds: string[];
  publicSummary?: string | null;
  internalSummary?: string | null;
  evidence: Json;
  redactedEvidence: Json;
  riskSummary: Json;
  metadata: Json;
}

export interface RuntimeNotificationDraft {
  recipientUserId: string;
  sourceSystem: string;
  sourceObjectId?: string | null;
  sourceEventIds: string[];
  category: string;
  severity: string;
  status: string;
  title?: string | null;
  body?: string | null;
  explanationClass?: string | null;
  objectLabel?: string | null;
  internalReasonCodes: string[];
  privacySensitivity: string;
  dedupeKey?: string | null;
  metadata: Json;
}
