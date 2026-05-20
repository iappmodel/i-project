import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  PipelineComposerEvaluationResult,
  PipelineComposerSignalInput
} from "@/types/alphabet/pipeline-composer.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createPipelineEvent(params: {
  input: PipelineComposerSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "pipeline",
    objectId: params.input.pipelineId,
    sourceContext: "system",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      pipelineId: params.input.pipelineId,
      pipelineType: params.input.pipelineType,
      policyDecision: params.input.policyDecision,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluatePipelineComposer(
  input: PipelineComposerSignalInput
): PipelineComposerEvaluationResult {
  const reasons: string[] = [];
  const totalRisk = input.riskSignals.totalPipelineRisk;

  const finalResponse = ((): PipelineComposerEvaluationResult["finalResponse"] => {
    if (input.cancelRequested) {
      return {
        allowedToContinue: false,
        requiresUserAction: false,
        userActionType: "none",
        publicMessage: "Pipeline was cancelled.",
        internalReasonCodes: ["pipeline_cancelled"]
      };
    }
    if (input.policyBlocked) {
      return {
        allowedToContinue: false,
        requiresUserAction: true,
        userActionType: "wait_for_review",
        publicMessage: "This action cannot continue right now.",
        internalReasonCodes: ["policy_blocked"]
      };
    }
    if (input.policyRequiresReview) {
      return {
        allowedToContinue: false,
        requiresUserAction: true,
        userActionType: "wait_for_review",
        publicMessage: "This action is under review.",
        internalReasonCodes: ["policy_requires_review"]
      };
    }
    if (input.handlerValidationFailed) {
      return {
        allowedToContinue: false,
        requiresUserAction: true,
        userActionType: "retry",
        publicMessage: "This action could not be validated.",
        internalReasonCodes: ["handler_validation_failed"]
      };
    }
    return {
      allowedToContinue: true,
      requiresUserAction: false,
      userActionType: "none",
      publicMessage: "Pipeline is ready for downstream processing.",
      internalReasonCodes: ["pipeline_ready"]
    };
  })();

  reasons.push("pipeline_evaluated");

  const pipelineCreatedEvent = createPipelineEvent({
    input,
    eventType: "pipeline_created",
    rawScore: 0.75,
    qualityScore: 0.72,
    riskScore: totalRisk,
    verificationStatus: "pending",
    metadata: { phase: "created" }
  });

  const pipelineIntentCreatedEvent = createPipelineEvent({
    input,
    eventType: "pipeline_intent_created",
    rawScore: 0.78,
    qualityScore: 0.74,
    riskScore: input.riskSignals.intentRisk,
    verificationStatus: "pending",
    metadata: { actionIntentId: input.actionIntentId }
  });

  const pipelinePolicyCreatedEvent = createPipelineEvent({
    input,
    eventType: "pipeline_policy_created",
    rawScore: 0.76,
    qualityScore: 0.73,
    riskScore: input.riskSignals.policyRisk,
    verificationStatus: input.policyAllowed ? "verified" : "pending",
    metadata: { policyDecisionId: input.policyDecisionId }
  });

  const pipelineSagaCreatedEvent = input.sagaCreated
    ? createPipelineEvent({
        input,
        eventType: "pipeline_saga_created",
        rawScore: 0.74,
        qualityScore: 0.7,
        riskScore: input.riskSignals.sagaRisk,
        verificationStatus: "pending",
        metadata: { sagaId: input.sagaId }
      })
    : null;

  const pipelineExecutionCreatedEvent = input.executionCreated
    ? createPipelineEvent({
        input,
        eventType: "pipeline_execution_created",
        rawScore: 0.72,
        qualityScore: 0.68,
        riskScore: input.riskSignals.executionRisk,
        verificationStatus: "pending",
        metadata: { executionRequestIds: input.executionRequestIds }
      })
    : null;

  const pipelineHandlerValidatedEvent =
    input.handlerValidated || input.handlerValidationFailed
      ? createPipelineEvent({
          input,
          eventType: "pipeline_handler_validated",
          rawScore: 0.7,
          qualityScore: input.handlerValidated ? 0.75 : 0.35,
          riskScore: input.riskSignals.handlerRisk,
          verificationStatus: input.handlerValidated ? "verified" : "rejected",
          metadata: { handlerDefinitionIds: input.handlerDefinitionIds }
        })
      : null;

  const pipelineAuditCreatedEvent = input.auditCreated
    ? createPipelineEvent({
        input,
        eventType: "pipeline_audit_created",
        rawScore: 0.68,
        qualityScore: 0.72,
        riskScore: input.riskSignals.auditRisk,
        verificationStatus: "verified",
        metadata: { auditRecordIds: input.auditRecordIds }
      })
    : null;

  const pipelineNotificationCreatedEvent = input.notificationCreated
    ? createPipelineEvent({
        input,
        eventType: "pipeline_notification_created",
        rawScore: 0.66,
        qualityScore: 0.7,
        riskScore: input.riskSignals.notificationRisk,
        verificationStatus: "pending",
        metadata: { notificationIds: input.notificationIds }
      })
    : null;

  const pipelineReadyEvent = createPipelineEvent({
    input,
    eventType: "pipeline_ready",
    rawScore: 0.8,
    qualityScore: 0.78,
    riskScore: totalRisk,
    verificationStatus: finalResponse.allowedToContinue ? "verified" : "pending",
    metadata: { finalResponse }
  });

  const status = input.currentStatus;

  return {
    pipelineId: input.pipelineId,
    pipelineType: input.pipelineType,
    status,
    reasons,
    finalResponse,
    pipelineCreatedEvent,
    pipelineIntentCreatedEvent,
    pipelinePolicyCreatedEvent,
    pipelineSagaCreatedEvent,
    pipelineExecutionCreatedEvent,
    pipelineHandlerValidatedEvent,
    pipelineAuditCreatedEvent,
    pipelineNotificationCreatedEvent,
    pipelineReadyEvent,
    metadata: { ...input.metadata }
  };
}
