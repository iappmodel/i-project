import {
  DEFAULT_HANDLER_FORBIDDEN_KEYS,
  HANDLER_REGISTRY_RULES
} from "../../data/alphabet/handler-registry-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  HandlerOutcomeStatus,
  HandlerRegistryEvaluationResult,
  HandlerRegistryRuleSet,
  HandlerRegistrySignalInput
} from "../../types/alphabet/handler-registry.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: HandlerRegistrySignalInput): HandlerRegistryRuleSet | undefined {
  return HANDLER_REGISTRY_RULES.find(
    (rule) => rule.active && rule.permissionLevel === input.permissionLevel
  );
}

function keysOf(payload: Record<string, unknown> | null | undefined): string[] {
  return Object.keys(payload ?? {});
}

function findMissing(required: string[], payload: Record<string, unknown> | null | undefined): string[] {
  const keys = new Set(keysOf(payload));
  return required.filter((key) => !keys.has(key));
}

function findForbidden(forbidden: string[], payload: Record<string, unknown> | null | undefined): string[] {
  const keys = new Set(keysOf(payload));
  const globalForbidden = Array.from(DEFAULT_HANDLER_FORBIDDEN_KEYS);
  const allForbidden = new Set([...forbidden, ...globalForbidden]);
  return Array.from(allForbidden).filter((key) => keys.has(key));
}

function findUnknown(
  allowedRequired: string[],
  allowedOptional: string[],
  payload: Record<string, unknown> | null | undefined
): string[] {
  const allowed = new Set([...allowedRequired, ...allowedOptional]);
  return keysOf(payload).filter((key) => !allowed.has(key));
}

function stripForbiddenPayload(
  payload: Record<string, unknown>,
  forbidden: string[]
): Record<string, unknown> {
  const allForbidden = new Set([...forbidden, ...Array.from(DEFAULT_HANDLER_FORBIDDEN_KEYS)]);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (allForbidden.has(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = stripForbiddenPayload(value as Record<string, unknown>, forbidden);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function riskClassScore(input: HandlerRegistrySignalInput): number {
  return {
    low: 0.08,
    medium: 0.2,
    high: 0.3,
    critical: 0.55
  }[input.riskClass];
}

function calculateHandlerCompatibilityScore(input: HandlerRegistrySignalInput): number {
  const nameScore = input.handlerName.trim().length > 0 ? 0.2 : 0;
  const versionScore = input.handlerVersion.trim().length > 0 ? 0.15 : 0;
  const targetScore = input.targetSystem ? 0.2 : 0;
  const actionScore = input.action ? 0.2 : 0;
  const ownerScore = input.ownerTeam.trim().length > 0 ? 0.1 : 0;
  const timeoutScore = input.timeoutMs > 0 && input.timeoutMs <= 120_000 ? 0.15 : 0.05;

  return clamp(nameScore + versionScore + targetScore + actionScore + ownerScore + timeoutScore);
}

function calculateSchemaValidationScore(input: HandlerRegistrySignalInput): number {
  const payloadMissing = findMissing(input.schema.requiredPayloadKeys, input.executionPayload);
  const payloadForbidden = findForbidden(input.schema.forbiddenPayloadKeys, input.executionPayload);
  const payloadUnknown = findUnknown(
    input.schema.requiredPayloadKeys,
    input.schema.optionalPayloadKeys,
    input.executionPayload
  );

  const resultMissing = findMissing(input.schema.requiredResultKeys, input.executionResult ?? {});
  const resultUnknown = findUnknown(
    input.schema.requiredResultKeys,
    input.schema.optionalResultKeys,
    input.executionResult ?? {}
  );

  const usingResult = input.validationMode === "result";
  let score = 1;

  if (payloadMissing.length > 0) score -= Math.min(0.35, payloadMissing.length * 0.12);
  if (payloadForbidden.length > 0) score -= Math.min(0.5, payloadForbidden.length * 0.18);
  if (payloadUnknown.length > 0) score -= Math.min(0.2, payloadUnknown.length * 0.04);

  if (usingResult) {
    if (resultMissing.length > 0) score -= Math.min(0.4, resultMissing.length * 0.16);
    if (resultUnknown.length > 0) score -= Math.min(0.15, resultUnknown.length * 0.03);
  }

  return clamp(score);
}

function calculateOperationalReadinessScore(input: HandlerRegistrySignalInput): number {
  const statusScore =
    input.status === "active"
      ? 1
      : input.status === "deprecated"
        ? 0.55
        : input.status === "draft"
          ? 0.35
          : 0;

  const healthScore =
    input.health === "healthy"
      ? 1
      : input.health === "degraded"
        ? 0.65
        : input.health === "unknown"
          ? 0.4
          : 0;

  const runtimeScore =
    input.runtimeMode === "sync" || input.runtimeMode === "queue"
      ? 1
      : input.runtimeMode === "async"
        ? 0.9
        : input.runtimeMode === "external"
          ? 0.7
          : 0.45;

  const retryScore =
    input.retryCount === 0
      ? 1
      : input.retrySupported
        ? clamp(1 - input.retryCount * 0.15)
        : 0.4;

  return clamp(
    statusScore * 0.32 +
      healthScore * 0.32 +
      runtimeScore * 0.18 +
      retryScore * 0.1 +
      (input.timeoutMs > 0 ? 0.08 : 0)
  );
}

function calculateHandlerRiskScore(input: HandlerRegistrySignalInput): number {
  let risk = riskClassScore(input) * 0.45;

  if (input.permissionLevel === "financial") risk += 0.06;
  if (input.permissionLevel === "admin") risk += 0.08;
  if (input.permissionLevel === "compliance") risk += 0.1;
  if (input.status === "deprecated") risk += 0.1;
  if (input.status === "disabled" || input.status === "retired") risk += 0.35;
  if (input.health === "unhealthy" || input.health === "offline") risk += 0.25;
  if (findForbidden(input.schema.forbiddenPayloadKeys, input.executionPayload).length > 0) risk += 0.2;
  if (input.idempotencyRequired && !input.idempotencyKey) risk += 0.12;
  if (input.auditRequired && !input.auditCreated) risk += 0.12;

  return clamp(risk);
}

function decideHandlerOutcome(params: {
  input: HandlerRegistrySignalInput;
  rule: HandlerRegistryRuleSet;
  compatibilityScore: number;
  schemaScore: number;
  readinessScore: number;
  riskScore: number;
  payloadMissing: string[];
  payloadForbidden: string[];
  resultMissing: string[];
  reasons: string[];
}): HandlerOutcomeStatus {
  const {
    input,
    rule,
    compatibilityScore,
    schemaScore,
    readinessScore,
    riskScore,
    payloadMissing,
    payloadForbidden,
    resultMissing,
    reasons
  } = params;

  if (input.status === "disabled" || input.status === "retired") {
    reasons.push("handler_disabled_or_retired");
    return "handler_disabled";
  }
  if (input.health === "offline") {
    reasons.push("handler_offline");
    return "handler_unavailable";
  }
  if (input.status === "deprecated" && !input.allowDeprecated) {
    reasons.push("handler_deprecated_without_explicit_allowance");
    return "handler_deprecated";
  }
  if (rule.requiresHealthyHandler && input.health !== "healthy") {
    reasons.push("handler_health_below_required_level");
    return "handler_requires_review";
  }
  if (rule.requiresIdempotencyWhenRequired && input.idempotencyRequired && !input.idempotencyKey) {
    reasons.push("handler_idempotency_key_required");
    return "handler_requires_review";
  }
  if (rule.requiresAuditWhenAuditRequired && input.auditRequired && !input.auditCreated) {
    reasons.push("handler_audit_required");
    return "handler_requires_review";
  }
  if (compatibilityScore < rule.minCompatibilityScore) {
    reasons.push("handler_compatibility_below_minimum");
    return "handler_requires_review";
  }
  if (payloadForbidden.length > 0) {
    reasons.push("handler_payload_contains_forbidden_keys");
    return "payload_invalid";
  }
  if (payloadMissing.length > 0) {
    reasons.push("handler_payload_missing_required_keys");
    return "payload_invalid";
  }
  if (input.validationMode === "result" && resultMissing.length > 0) {
    reasons.push("handler_result_missing_required_keys");
    return "result_invalid";
  }
  if (schemaScore < rule.minSchemaValidationScore) {
    reasons.push("handler_schema_validation_below_minimum");
    return input.validationMode === "result" ? "result_invalid" : "payload_invalid";
  }
  if (readinessScore < rule.minOperationalReadinessScore) {
    reasons.push("handler_operational_readiness_below_minimum");
    return "handler_unavailable";
  }
  if (riskScore > rule.maxHandlerRiskScore) {
    reasons.push("handler_risk_above_maximum");
    return riskScore > 0.65 ? "handler_unavailable" : "handler_requires_review";
  }
  if (input.validationMode === "payload") {
    reasons.push("handler_payload_valid");
    return "payload_valid";
  }
  if (input.validationMode === "result") {
    reasons.push("handler_result_valid");
    return "result_valid";
  }

  reasons.push("handler_available");
  return "handler_available";
}

function createHandlerAlphabetEvent(params: {
  input: HandlerRegistrySignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: "system",
    coinCode: "J",
    eventType: params.eventType,
    objectType: "handler_definition",
    objectId: params.input.handlerDefinitionId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      handlerDefinitionId: params.input.handlerDefinitionId,
      handlerName: params.input.handlerName,
      handlerVersion: params.input.handlerVersion,
      targetSystem: params.input.targetSystem,
      action: params.input.action,
      permissionLevel: params.input.permissionLevel,
      riskClass: params.input.riskClass,
      runtimeMode: params.input.runtimeMode,
      handlerReferencedByExecutionRequestId:
        params.input.handlerReferencedByExecutionRequestId ?? null,
      sourceEventIds: params.input.sourceEventIds,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateHandlerRegistry(
  input: HandlerRegistrySignalInput
): HandlerRegistryEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);
  const compatibilityScore = calculateHandlerCompatibilityScore(input);
  const schemaScore = calculateSchemaValidationScore(input);
  const readinessScore = calculateOperationalReadinessScore(input);
  const riskScore = calculateHandlerRiskScore(input);

  const missingRequiredPayloadKeys = findMissing(input.schema.requiredPayloadKeys, input.executionPayload);
  const forbiddenPayloadKeysFound = findForbidden(input.schema.forbiddenPayloadKeys, input.executionPayload);
  const unknownPayloadKeys = findUnknown(
    input.schema.requiredPayloadKeys,
    input.schema.optionalPayloadKeys,
    input.executionPayload
  );
  const missingRequiredResultKeys = findMissing(input.schema.requiredResultKeys, input.executionResult ?? {});
  const unknownResultKeys = findUnknown(
    input.schema.requiredResultKeys,
    input.schema.optionalResultKeys,
    input.executionResult ?? {}
  );

  const safePayload = stripForbiddenPayload(input.executionPayload, input.schema.forbiddenPayloadKeys);
  const safeResult = input.executionResult
    ? stripForbiddenPayload(input.executionResult, input.schema.forbiddenPayloadKeys)
    : null;

  if (!rule) {
    reasons.push("no_active_handler_registry_rule");
    const handlerRegisteredEvent = createHandlerAlphabetEvent({
      input,
      eventType: "handler_registered",
      rawScore: compatibilityScore,
      qualityScore: readinessScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      handlerDefinitionId: input.handlerDefinitionId,
      handlerName: input.handlerName,
      handlerVersion: input.handlerVersion,
      targetSystem: input.targetSystem,
      action: input.action,
      status: "handler_requires_review",
      handlerCompatibilityScore: compatibilityScore,
      schemaValidationScore: schemaScore,
      operationalReadinessScore: readinessScore,
      handlerRiskScore: riskScore,
      available: false,
      unavailable: false,
      deprecated: false,
      disabled: false,
      payloadValid: false,
      payloadInvalid: false,
      resultValid: false,
      resultInvalid: false,
      requiresReview: true,
      missingRequiredPayloadKeys,
      forbiddenPayloadKeysFound,
      unknownPayloadKeys,
      missingRequiredResultKeys,
      unknownResultKeys,
      safePayload,
      safeResult,
      reasons,
      handlerRegisteredEvent,
      handlerAvailableEvent: null,
      handlerUnavailableEvent: null,
      handlerPayloadValidEvent: null,
      handlerPayloadInvalidEvent: null,
      handlerResultValidEvent: null,
      handlerResultInvalidEvent: null,
      handlerDeprecatedEvent: null,
      handlerDisabledEvent: null,
      handlerRequiresReviewEvent: handlerRegisteredEvent,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideHandlerOutcome({
    input,
    rule,
    compatibilityScore,
    schemaScore,
    readinessScore,
    riskScore,
    payloadMissing: missingRequiredPayloadKeys,
    payloadForbidden: forbiddenPayloadKeysFound,
    resultMissing: missingRequiredResultKeys,
    reasons
  });

  const available = status === "handler_available" || status === "payload_valid" || status === "result_valid";
  const unavailable = status === "handler_unavailable";
  const deprecated = status === "handler_deprecated";
  const disabled = status === "handler_disabled";
  const payloadValid = status === "payload_valid";
  const payloadInvalid = status === "payload_invalid";
  const resultValid = status === "result_valid";
  const resultInvalid = status === "result_invalid";
  const requiresReview = status === "handler_requires_review";
  const verificationStatus = available ? "verified" : "rejected";

  const handlerRegisteredEvent = createHandlerAlphabetEvent({
    input,
    eventType: "handler_registered",
    rawScore: compatibilityScore,
    qualityScore: readinessScore,
    riskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const handlerAvailableEvent =
    status === "handler_available"
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_available",
          rawScore: compatibilityScore,
          qualityScore: readinessScore,
          riskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const handlerUnavailableEvent =
    unavailable
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_unavailable",
          rawScore: compatibilityScore,
          qualityScore: readinessScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const handlerPayloadValidEvent =
    payloadValid
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_payload_valid",
          rawScore: schemaScore,
          qualityScore: compatibilityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const handlerPayloadInvalidEvent =
    payloadInvalid
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_payload_invalid",
          rawScore: schemaScore,
          qualityScore: compatibilityScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            missingRequiredPayloadKeys,
            forbiddenPayloadKeysFound,
            unknownPayloadKeys,
            reasons
          }
        })
      : null;

  const handlerResultValidEvent =
    resultValid
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_result_valid",
          rawScore: schemaScore,
          qualityScore: compatibilityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const handlerResultInvalidEvent =
    resultInvalid
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_result_invalid",
          rawScore: schemaScore,
          qualityScore: compatibilityScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            missingRequiredResultKeys,
            unknownResultKeys,
            reasons
          }
        })
      : null;

  const handlerDeprecatedEvent =
    deprecated
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_deprecated",
          rawScore: compatibilityScore,
          qualityScore: readinessScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const handlerDisabledEvent =
    disabled
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_disabled",
          rawScore: compatibilityScore,
          qualityScore: readinessScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const handlerRequiresReviewEvent =
    requiresReview
      ? createHandlerAlphabetEvent({
          input,
          eventType: "handler_requires_review",
          rawScore: compatibilityScore,
          qualityScore: readinessScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  return {
    handlerDefinitionId: input.handlerDefinitionId,
    handlerName: input.handlerName,
    handlerVersion: input.handlerVersion,
    targetSystem: input.targetSystem,
    action: input.action,
    status,
    handlerCompatibilityScore: compatibilityScore,
    schemaValidationScore: schemaScore,
    operationalReadinessScore: readinessScore,
    handlerRiskScore: riskScore,
    available,
    unavailable,
    deprecated,
    disabled,
    payloadValid,
    payloadInvalid,
    resultValid,
    resultInvalid,
    requiresReview,
    missingRequiredPayloadKeys,
    forbiddenPayloadKeysFound,
    unknownPayloadKeys,
    missingRequiredResultKeys,
    unknownResultKeys,
    safePayload,
    safeResult,
    reasons,
    handlerRegisteredEvent,
    handlerAvailableEvent,
    handlerUnavailableEvent,
    handlerPayloadValidEvent,
    handlerPayloadInvalidEvent,
    handlerResultValidEvent,
    handlerResultInvalidEvent,
    handlerDeprecatedEvent,
    handlerDisabledEvent,
    handlerRequiresReviewEvent,
    metadata: {
      rulePermissionLevel: rule.permissionLevel,
      ...input.metadata
    }
  };
}
