import type { WorkerRunInput, WorkerRunResult } from "@/types/alphabet/worker-runtime.types";
import { getWorkerRuntimeRule } from "@/data/alphabet/worker-runtime-rules";
import { evaluateHandlerRegistry } from "../handler-registry-engine";
import { parseHandlerSchemaContract } from "../runtime/handler-runtime-mapper";
import { findHandlerByNameDb } from "../db-repositories/handler-definitions.repository";
import {
  markExecutionCompletedDb,
  markExecutionFailedDb,
  markExecutionRunningDb
} from "../db-repositories/execution-worker.repository";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import { lockNextExecutionRequest } from "./execution-locker";
import { resolveWorkerDomainHandler } from "./domain-handler-registry";
import { isWorkerRuntimeError, workerFail } from "./worker-runtime-errors";
import {
  updateSagaStepBySourceObjectDb,
  updateSagaStatusDb
} from "../db-repositories/saga-worker.repository";
import {
  updatePipelineStatusByExecutionDb,
  updatePipelineStepByExecutionDb
} from "../db-repositories/pipeline-worker.repository";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import { maybeCreateAdminReviewCaseFromHook } from "../admin-review-hooks/admin-review-hook-store";
import type { DbHandlerDefinition, Json } from "@/types/alphabet/database.types";
import type { ExecutionAction, ExecutionTargetSystem } from "@/types/alphabet/execution-router.types";
import type {
  HandlerHealth,
  HandlerPermissionLevel,
  HandlerRiskClass,
  HandlerRuntimeMode,
  HandlerStatus
} from "@/types/alphabet/handler-registry.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function persistWorkerEvent(event: AlphabetEvent): Promise<string> {
  const saved = await insertAlphabetEvent({
    userId: event.userId === "system" ? null : event.userId,
    coinCode: event.coinCode,
    eventType: event.eventType,
    objectType: event.objectType,
    objectId: event.objectId,
    sourceContext: event.sourceContext,
    rawScore: event.rawScore,
    qualityScore: event.qualityScore,
    trustScoreAtEvent: event.trustScoreAtEvent,
    riskScore: event.riskScore,
    ageBand: event.ageBand,
    verificationStatus: event.verificationStatus,
    metadata: (event.metadata ?? {}) as Json
  });

  return saved.event_id;
}

function createWorkerEvent(params: {
  userId?: string | null;
  eventType: AlphabetEvent["eventType"];
  executionRequestId: string;
  rawScore?: number;
  qualityScore?: number;
  riskScore?: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.userId ?? "system",
    coinCode: "J",
    eventType: params.eventType,
    objectType: "execution_request",
    objectId: params.executionRequestId,
    sourceContext: "execution_worker",
    rawScore: params.rawScore ?? 1,
    qualityScore: params.qualityScore ?? 1,
    trustScoreAtEvent: null,
    riskScore: params.riskScore ?? 0,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      executionRequestId: params.executionRequestId,
      ...params.metadata
    },
    createdAt: new Date().toISOString()
  };
}

function asTargetSystem(value: string): ExecutionTargetSystem {
  const allowed: ExecutionTargetSystem[] = [
    "wallet",
    "reward",
    "conversion",
    "withdrawal",
    "campaign",
    "creator_payout",
    "content_rights",
    "content_safety",
    "age_guardian",
    "grant",
    "treasury",
    "review",
    "audit",
    "notification",
    "admin",
    "trust",
    "u_value",
    "system"
  ];
  return (allowed.includes(value as ExecutionTargetSystem) ? value : "system") as ExecutionTargetSystem;
}

function asExecutionAction(value: string): ExecutionAction {
  const allowed: ExecutionAction[] = [
    "allow",
    "limit",
    "hold",
    "block",
    "escalate",
    "credit",
    "debit",
    "convert",
    "withdraw",
    "payout",
    "reserve",
    "release",
    "reverse",
    "restore",
    "remove",
    "pause",
    "resume",
    "notify",
    "create_review",
    "create_audit",
    "request_guardian",
    "request_verification",
    "apply_trust_event",
    "apply_u_value_event",
    "noop"
  ];
  return (allowed.includes(value as ExecutionAction) ? value : "noop") as ExecutionAction;
}

export async function runExecutionWorkerOnce(input: WorkerRunInput): Promise<WorkerRunResult> {
  let handlerDefinition: DbHandlerDefinition | null = null;

  const lock = await lockNextExecutionRequest({
    workerId: input.workerId,
    targetSystem: input.targetSystem ?? null
  });

  if (!lock.locked || !lock.executionRequest) {
    return {
      workerId: input.workerId,
      status: "worker_no_job",
      executionRequestId: null,
      handlerDefinitionId: null,
      locked: false,
      completed: false,
      failed: false,
      retryScheduled: false,
      deadLettered: false,
      resultPayload: null,
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds: [],
      reasonCodes: lock.reasonCodes
    };
  }

  const execution = lock.executionRequest;
  const eventIds: string[] = [];

  const lockedEvent = createWorkerEvent({
    eventType: "worker_execution_locked",
    executionRequestId: execution.execution_request_id,
    verificationStatus: "verified",
    metadata: {
      workerId: input.workerId
    }
  });

  eventIds.push(await persistWorkerEvent(lockedEvent));

  try {
    await markExecutionRunningDb({
      executionRequestId: execution.execution_request_id,
      workerId: input.workerId
    });

    const startedEvent = createWorkerEvent({
      eventType: "worker_execution_started",
      executionRequestId: execution.execution_request_id,
      verificationStatus: "verified",
      metadata: {
        workerId: input.workerId
      }
    });

    eventIds.push(await persistWorkerEvent(startedEvent));

    handlerDefinition = await findHandlerByNameDb({
      handlerName: execution.handler_name,
      handlerVersion: execution.handler_version
    });

    if (!handlerDefinition) {
      const missingEvent = createWorkerEvent({
        eventType: "worker_handler_missing",
        executionRequestId: execution.execution_request_id,
        verificationStatus: "rejected",
        riskScore: 0.8,
        metadata: {
          handlerName: execution.handler_name,
          handlerVersion: execution.handler_version
        }
      });

      eventIds.push(await persistWorkerEvent(missingEvent));

      await markExecutionFailedDb({
        executionRequestId: execution.execution_request_id,
        resultPayload: {
          error: "worker_handler_missing"
        },
        retryCount: execution.retry_count + 1,
        retryPending: false,
        deadLettered: true
      });

      await updateSagaStepBySourceObjectDb({
        sourceObjectId: execution.execution_request_id,
        status: "failed",
        metadata: { workerId: input.workerId, error: "worker_handler_missing" }
      }).catch(() => undefined);

      await updatePipelineStepByExecutionDb({
        executionRequestId: execution.execution_request_id,
        stepName: "execution",
        status: "failed",
        reasonCodes: ["worker_handler_missing"]
      }).catch(() => undefined);

      await updatePipelineStatusByExecutionDb({
        executionRequestId: execution.execution_request_id,
        status: "pipeline_failed"
      }).catch(() => undefined);

      return {
        workerId: input.workerId,
        status: "worker_handler_missing",
        executionRequestId: execution.execution_request_id,
        handlerDefinitionId: null,
        locked: true,
        completed: false,
        failed: true,
        retryScheduled: false,
        deadLettered: true,
        resultPayload: {
          error: "worker_handler_missing"
        },
        ledgerEntryIds: [],
        auditRecordIds: [],
        notificationIds: [],
        eventIds,
        reasonCodes: ["worker_handler_missing"],
        workerExecutionLockedEvent: lockedEvent,
        workerHandlerMissingEvent: missingEvent
      };
    }

    const resolvedEvent = createWorkerEvent({
      eventType: "worker_handler_resolved",
      executionRequestId: execution.execution_request_id,
      verificationStatus: "verified",
      metadata: {
        handlerDefinitionId: handlerDefinition.handler_definition_id,
        handlerName: handlerDefinition.handler_name
      }
    });

    eventIds.push(await persistWorkerEvent(resolvedEvent));

    const rule = getWorkerRuntimeRule(handlerDefinition.handler_name);

    if (rule?.requiresIdempotency && !execution.idempotency_key) {
      workerFail({
        code: "financial_idempotency_required",
        message: "Financial handler requires idempotency key.",
        retryable: false,
        reasonCodes: ["financial_idempotency_required"]
      });
    }

    const handlerValidation = evaluateHandlerRegistry({
      handlerDefinitionId: handlerDefinition.handler_definition_id,
      handlerName: handlerDefinition.handler_name,
      handlerVersion: handlerDefinition.handler_version,
      targetSystem: asTargetSystem(handlerDefinition.target_system),
      action: asExecutionAction(handlerDefinition.action),
      status: handlerDefinition.status as HandlerStatus,
      health: handlerDefinition.health as HandlerHealth,
      runtimeMode: handlerDefinition.runtime_mode as HandlerRuntimeMode,
      permissionLevel: handlerDefinition.permission_level as HandlerPermissionLevel,
      riskClass: handlerDefinition.risk_class as HandlerRiskClass,
      schema: parseHandlerSchemaContract(handlerDefinition),
      idempotencyRequired: handlerDefinition.idempotency_required,
      idempotencyKey: execution.idempotency_key,
      auditRequired: handlerDefinition.audit_required,
      auditCreated: true,
      retrySupported: handlerDefinition.retry_supported,
      retryCount: execution.retry_count,
      timeoutMs: handlerDefinition.timeout_ms,
      ownerTeam: handlerDefinition.owner_team,
      executionPayload: execution.sanitized_payload as Record<string, unknown>,
      executionResult: null,
      allowDeprecated: false,
      validationMode: "payload",
      handlerReferencedByExecutionRequestId: execution.execution_request_id,
      sourceEventIds: execution.source_event_ids,
      metadata: {
        workerId: input.workerId
      }
    });

    const payloadEvent = createWorkerEvent({
      eventType: handlerValidation.payloadValid
        ? "worker_handler_payload_valid"
        : "worker_handler_payload_invalid",
      executionRequestId: execution.execution_request_id,
      verificationStatus: handlerValidation.payloadValid ? "verified" : "rejected",
      riskScore: handlerValidation.handlerRiskScore,
      metadata: {
        handlerDefinitionId: handlerDefinition.handler_definition_id,
        reasons: handlerValidation.reasons
      }
    });

    eventIds.push(await persistWorkerEvent(payloadEvent));

    if (!handlerValidation.payloadValid) {
      await markExecutionFailedDb({
        executionRequestId: execution.execution_request_id,
        resultPayload: {
          error: "worker_handler_payload_invalid",
          reasons: handlerValidation.reasons
        },
        retryCount: execution.retry_count + 1,
        retryPending: false,
        deadLettered: true
      });

      await updateSagaStepBySourceObjectDb({
        sourceObjectId: execution.execution_request_id,
        status: "failed",
        metadata: { workerId: input.workerId, reasons: handlerValidation.reasons }
      }).catch(() => undefined);

      await updatePipelineStepByExecutionDb({
        executionRequestId: execution.execution_request_id,
        stepName: "execution",
        status: "failed",
        reasonCodes: handlerValidation.reasons
      }).catch(() => undefined);

      await updatePipelineStatusByExecutionDb({
        executionRequestId: execution.execution_request_id,
        status: "pipeline_failed"
      }).catch(() => undefined);

      return {
        workerId: input.workerId,
        status: "worker_payload_invalid",
        executionRequestId: execution.execution_request_id,
        handlerDefinitionId: handlerDefinition.handler_definition_id,
        locked: true,
        completed: false,
        failed: true,
        retryScheduled: false,
        deadLettered: true,
        resultPayload: {
          error: "worker_handler_payload_invalid",
          reasons: handlerValidation.reasons
        },
        ledgerEntryIds: [],
        auditRecordIds: [],
        notificationIds: [],
        eventIds,
        reasonCodes: handlerValidation.reasons,
        workerExecutionLockedEvent: lockedEvent,
        workerHandlerResolvedEvent: resolvedEvent,
        workerHandlerPayloadInvalidEvent: payloadEvent
      };
    }

    const domainHandlerResolved = resolveWorkerDomainHandler(handlerDefinition.handler_name);

    if (!domainHandlerResolved) {
      workerFail({
        code: "worker_domain_handler_missing",
        message: `No domain handler registered for ${handlerDefinition.handler_name}.`,
        retryable: false,
        reasonCodes: ["worker_domain_handler_missing"]
      });
    }

    const handlerResult = await domainHandlerResolved({
      executionRequest: execution,
      handlerDefinition,
      workerId: input.workerId,
      now: input.now ?? new Date().toISOString()
    });

    eventIds.push(...handlerResult.eventIds);

    if (handlerResult.ok) {
      await markExecutionCompletedDb({
        executionRequestId: execution.execution_request_id,
        resultPayload: handlerResult.resultPayload
      });

      await updateSagaStepBySourceObjectDb({
        sourceObjectId: execution.execution_request_id,
        status: "passed",
        metadata: {
          workerId: input.workerId,
          resultPayload: handlerResult.resultPayload
        }
      }).catch(() => undefined);

      await updatePipelineStepByExecutionDb({
        executionRequestId: execution.execution_request_id,
        stepName: "execution",
        status: "passed",
        reasonCodes: handlerResult.internalReasonCodes
      }).catch(() => undefined);

      await updatePipelineStatusByExecutionDb({
        executionRequestId: execution.execution_request_id,
        status: "pipeline_completed"
      }).catch(() => undefined);

      const completedEvent = createWorkerEvent({
        eventType: "worker_execution_completed",
        executionRequestId: execution.execution_request_id,
        verificationStatus: "verified",
        metadata: {
          resultPayload: handlerResult.resultPayload
        }
      });

      eventIds.push(await persistWorkerEvent(completedEvent));

      return {
        workerId: input.workerId,
        status: "worker_completed",
        executionRequestId: execution.execution_request_id,
        handlerDefinitionId: handlerDefinition.handler_definition_id,
        locked: true,
        completed: true,
        failed: false,
        retryScheduled: false,
        deadLettered: false,
        resultPayload: handlerResult.resultPayload,
        ledgerEntryIds: handlerResult.ledgerEntryIds,
        auditRecordIds: handlerResult.auditRecordIds,
        notificationIds: handlerResult.notificationIds,
        eventIds,
        reasonCodes: handlerResult.internalReasonCodes,
        workerExecutionLockedEvent: lockedEvent,
        workerExecutionStartedEvent: startedEvent,
        workerExecutionCompletedEvent: completedEvent,
        workerHandlerResolvedEvent: resolvedEvent,
        workerHandlerPayloadValidEvent: payloadEvent
      };
    }

    const retryAllowed =
      Boolean(rule?.retryAllowed) &&
      handlerResult.retryable &&
      execution.retry_count + 1 < (rule?.maxRetryCount ?? execution.max_retries);

    await markExecutionFailedDb({
      executionRequestId: execution.execution_request_id,
      resultPayload: handlerResult.resultPayload,
      retryCount: execution.retry_count + 1,
      retryPending: retryAllowed,
      deadLettered: !retryAllowed
    });

    await updateSagaStepBySourceObjectDb({
      sourceObjectId: execution.execution_request_id,
      status: "failed",
      metadata: {
        workerId: input.workerId,
        resultPayload: handlerResult.resultPayload
      }
    }).catch(() => undefined);

    await updatePipelineStepByExecutionDb({
      executionRequestId: execution.execution_request_id,
      stepName: "execution",
      status: "failed",
      reasonCodes: handlerResult.internalReasonCodes
    }).catch(() => undefined);

    await updatePipelineStatusByExecutionDb({
      executionRequestId: execution.execution_request_id,
      status: retryAllowed ? "pipeline_ready" : "pipeline_failed"
    }).catch(() => undefined);

    const failureEvent = createWorkerEvent({
      eventType: retryAllowed
        ? "worker_execution_retry_scheduled"
        : "worker_execution_dead_lettered",
      executionRequestId: execution.execution_request_id,
      verificationStatus: "rejected",
      riskScore: retryAllowed ? 0.4 : 0.8,
      metadata: {
        resultPayload: handlerResult.resultPayload,
        retryAllowed
      }
    });

    eventIds.push(await persistWorkerEvent(failureEvent));

    if (!retryAllowed) {
      const ts = execution.target_system as string;
      await maybeCreateAdminReviewCaseFromHook({
        hookSource: "worker_execution",
        hookTrigger: "worker_dead_lettered",
        subjectIds: {
          executionRequestId: execution.execution_request_id,
          policyDecisionId: execution.source_policy_decision_id ?? null
        },
        sourceObjectType: "execution_request",
        sourceObjectId: execution.execution_request_id,
        rawEvidence: {
          execution,
          handlerResult,
          reasonCodes: handlerResult.internalReasonCodes
        } as never,
        publicSummary: "An execution could not be completed safely.",
        internalSummary: "Worker dead-lettered execution request.",
        sourceEventIds: eventIds,
        riskScore: 0.75,
        uncertaintyScore: 0.7,
        userImpactScore: 0.7,
        platformImpactScore: 0.75,
        moneyMovementPossible:
          ts === "wallet" || ts === "withdrawal" || ts === "conversion",
        paymentUncertainty: ts === "withdrawal",
        fraudSuspected: false,
        userVisible: false,
        existingOpenReviewCaseCount: 0,
        now: new Date().toISOString(),
        metadata: {
          targetSystem: ts,
          action: execution.action
        }
      });
    }

    return {
      workerId: input.workerId,
      status: retryAllowed ? "worker_retry_scheduled" : "worker_dead_lettered",
      executionRequestId: execution.execution_request_id,
      handlerDefinitionId: handlerDefinition.handler_definition_id,
      locked: true,
      completed: false,
      failed: true,
      retryScheduled: retryAllowed,
      deadLettered: !retryAllowed,
      resultPayload: handlerResult.resultPayload,
      ledgerEntryIds: handlerResult.ledgerEntryIds,
      auditRecordIds: handlerResult.auditRecordIds,
      notificationIds: handlerResult.notificationIds,
      eventIds,
      reasonCodes: handlerResult.internalReasonCodes,
      workerExecutionLockedEvent: lockedEvent,
      workerExecutionStartedEvent: startedEvent,
      workerHandlerResolvedEvent: resolvedEvent,
      workerHandlerPayloadValidEvent: payloadEvent,
      workerExecutionRetryScheduledEvent: retryAllowed ? failureEvent : null,
      workerExecutionDeadLetteredEvent: retryAllowed ? null : failureEvent
    };
  } catch (error) {
    const retryable = isWorkerRuntimeError(error) ? error.retryable : false;
    const reasonCodes = isWorkerRuntimeError(error)
      ? error.reasonCodes
      : [error instanceof Error ? error.message : "worker_unhandled_error"];

    const retryAllowed = retryable && execution.retry_count + 1 < execution.max_retries;

    await markExecutionFailedDb({
      executionRequestId: execution.execution_request_id,
      resultPayload: {
        error: reasonCodes[0],
        reasonCodes
      },
      retryCount: execution.retry_count + 1,
      retryPending: retryAllowed,
      deadLettered: !retryAllowed
    });

    await updateSagaStepBySourceObjectDb({
      sourceObjectId: execution.execution_request_id,
      status: "failed",
      metadata: {
        workerId: input.workerId,
        reasonCodes
      }
    }).catch(() => undefined);

    await updatePipelineStepByExecutionDb({
      executionRequestId: execution.execution_request_id,
      stepName: "execution",
      status: "failed",
      reasonCodes
    }).catch(() => undefined);

    await updatePipelineStatusByExecutionDb({
      executionRequestId: execution.execution_request_id,
      status: retryAllowed ? "pipeline_ready" : "pipeline_failed"
    }).catch(() => undefined);

    const failedEvent = createWorkerEvent({
      eventType: retryAllowed ? "worker_execution_retry_scheduled" : "worker_execution_failed",
      executionRequestId: execution.execution_request_id,
      verificationStatus: "rejected",
      riskScore: retryAllowed ? 0.4 : 0.8,
      metadata: {
        reasonCodes,
        retryAllowed
      }
    });

    eventIds.push(await persistWorkerEvent(failedEvent));

    if (!retryAllowed) {
      const ts = execution.target_system as string;
      await maybeCreateAdminReviewCaseFromHook({
        hookSource: "worker_execution",
        hookTrigger: "worker_dead_lettered",
        subjectIds: {
          executionRequestId: execution.execution_request_id,
          policyDecisionId: execution.source_policy_decision_id ?? null
        },
        sourceObjectType: "execution_request",
        sourceObjectId: execution.execution_request_id,
        rawEvidence: {
          execution,
          reasonCodes
        } as never,
        publicSummary: "An execution failed and needs platform review.",
        internalSummary: "Worker failed without retry.",
        sourceEventIds: eventIds,
        riskScore: 0.75,
        uncertaintyScore: 0.7,
        userImpactScore: 0.7,
        platformImpactScore: 0.75,
        moneyMovementPossible:
          ts === "wallet" || ts === "withdrawal" || ts === "conversion",
        paymentUncertainty: ts === "withdrawal",
        fraudSuspected: false,
        userVisible: false,
        existingOpenReviewCaseCount: 0,
        now: new Date().toISOString(),
        metadata: {
          targetSystem: ts,
          action: execution.action
        }
      });
    }

    return {
      workerId: input.workerId,
      status: retryAllowed ? "worker_retry_scheduled" : "worker_failed",
      executionRequestId: execution.execution_request_id,
      handlerDefinitionId: handlerDefinition?.handler_definition_id ?? null,
      locked: true,
      completed: false,
      failed: true,
      retryScheduled: retryAllowed,
      deadLettered: !retryAllowed,
      resultPayload: {
        error: reasonCodes[0],
        reasonCodes
      },
      ledgerEntryIds: [],
      auditRecordIds: [],
      notificationIds: [],
      eventIds,
      reasonCodes,
      workerExecutionLockedEvent: lockedEvent,
      workerExecutionFailedEvent: failedEvent
    };
  }
}
