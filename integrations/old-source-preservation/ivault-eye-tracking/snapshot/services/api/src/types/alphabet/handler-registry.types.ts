import type { AlphabetEvent } from "./event.types";
import type {
  ExecutionAction,
  ExecutionTargetSystem
} from "./execution-router.types";

export type HandlerStatus =
  | "draft"
  | "active"
  | "deprecated"
  | "disabled"
  | "retired";

export type HandlerHealth =
  | "unknown"
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "offline";

export type HandlerRuntimeMode =
  | "sync"
  | "async"
  | "queue"
  | "external"
  | "manual";

export type HandlerPermissionLevel =
  | "public"
  | "internal"
  | "privileged"
  | "financial"
  | "admin"
  | "compliance";

export type HandlerRiskClass = "low" | "medium" | "high" | "critical";

export type HandlerOutcomeStatus =
  | "handler_registered"
  | "handler_available"
  | "handler_unavailable"
  | "payload_valid"
  | "payload_invalid"
  | "result_valid"
  | "result_invalid"
  | "handler_deprecated"
  | "handler_disabled"
  | "handler_requires_review";

export interface HandlerSchemaContract {
  requiredPayloadKeys: string[];
  optionalPayloadKeys: string[];
  forbiddenPayloadKeys: string[];
  requiredResultKeys: string[];
  optionalResultKeys: string[];
}

export interface HandlerDefinitionRecord {
  handlerDefinitionId: string;
  handlerName: string;
  handlerVersion: string;
  targetSystem: ExecutionTargetSystem;
  action: ExecutionAction;
  status: HandlerStatus;
  health: HandlerHealth;
  runtimeMode: HandlerRuntimeMode;
  permissionLevel: HandlerPermissionLevel;
  riskClass: HandlerRiskClass;
  schema: HandlerSchemaContract;
  idempotencyRequired: boolean;
  auditRequired: boolean;
  retrySupported: boolean;
  timeoutMs: number;
  ownerTeam: string;
  createdAt: string;
  updatedAt: string;
  deprecatedAt?: string | null;
  disabledAt?: string | null;
}

export interface HandlerRegistrySignalInput {
  handlerDefinitionId: string;
  handlerName: string;
  handlerVersion: string;
  targetSystem: ExecutionTargetSystem;
  action: ExecutionAction;
  status: HandlerStatus;
  health: HandlerHealth;
  runtimeMode: HandlerRuntimeMode;
  permissionLevel: HandlerPermissionLevel;
  riskClass: HandlerRiskClass;
  schema: HandlerSchemaContract;
  idempotencyRequired: boolean;
  idempotencyKey?: string | null;
  auditRequired: boolean;
  auditCreated: boolean;
  retrySupported: boolean;
  retryCount: number;
  timeoutMs: number;
  ownerTeam: string;
  executionPayload: Record<string, unknown>;
  executionResult?: Record<string, unknown> | null;
  allowDeprecated: boolean;
  validationMode: "payload" | "result" | "availability";
  handlerReferencedByExecutionRequestId?: string | null;
  sourceEventIds: string[];
  metadata?: Record<string, unknown>;
}

export interface HandlerRegistryRuleSet {
  permissionLevel: HandlerPermissionLevel;
  minCompatibilityScore: number;
  minSchemaValidationScore: number;
  minOperationalReadinessScore: number;
  maxHandlerRiskScore: number;
  strictPayloadValidation: boolean;
  strictResultValidation: boolean;
  requiresHealthyHandler: boolean;
  requiresAuditWhenAuditRequired: boolean;
  requiresIdempotencyWhenRequired: boolean;
  deprecatedAllowedOnlyWithExplicitFlag: boolean;
  active: boolean;
}

export interface HandlerRegistryEvaluationResult {
  handlerDefinitionId: string;
  handlerName: string;
  handlerVersion: string;
  targetSystem: ExecutionTargetSystem;
  action: ExecutionAction;
  status: HandlerOutcomeStatus;
  handlerCompatibilityScore: number;
  schemaValidationScore: number;
  operationalReadinessScore: number;
  handlerRiskScore: number;
  available: boolean;
  unavailable: boolean;
  deprecated: boolean;
  disabled: boolean;
  payloadValid: boolean;
  payloadInvalid: boolean;
  resultValid: boolean;
  resultInvalid: boolean;
  requiresReview: boolean;
  missingRequiredPayloadKeys: string[];
  forbiddenPayloadKeysFound: string[];
  unknownPayloadKeys: string[];
  missingRequiredResultKeys: string[];
  unknownResultKeys: string[];
  safePayload: Record<string, unknown>;
  safeResult: Record<string, unknown> | null;
  reasons: string[];
  handlerRegisteredEvent: AlphabetEvent;
  handlerAvailableEvent?: AlphabetEvent | null;
  handlerUnavailableEvent?: AlphabetEvent | null;
  handlerPayloadValidEvent?: AlphabetEvent | null;
  handlerPayloadInvalidEvent?: AlphabetEvent | null;
  handlerResultValidEvent?: AlphabetEvent | null;
  handlerResultInvalidEvent?: AlphabetEvent | null;
  handlerDeprecatedEvent?: AlphabetEvent | null;
  handlerDisabledEvent?: AlphabetEvent | null;
  handlerRequiresReviewEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
