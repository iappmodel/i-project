import type { ActionApiAuthContext, ActionApiRequestPayload } from "@/types/alphabet/action-api.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { Json } from "@/types/alphabet/database.types";
import type { DbHandlerDefinition } from "@/types/alphabet/database.types";
import type { ExecutionAction, ExecutionTargetSystem } from "@/types/alphabet/execution-router.types";
import type {
  HandlerHealth,
  HandlerPermissionLevel,
  HandlerRiskClass,
  HandlerRuntimeMode,
  HandlerStatus
} from "@/types/alphabet/handler-registry.types";
import type {
  RuntimeInput,
  RuntimeLinkedObjectIds,
  RuntimeResult,
  RuntimeTraceStep
} from "@/types/alphabet/runtime.types";
import { guardMutationDb, completeGuardedMutationDb } from "../idempotency/idempotency-store";
import { evaluateActionApiRequest } from "../action-api-engine";
import {
  buildDefaultIntentRiskSignals,
  buildIntentContextFromApi,
  getRuntimeActorUserId,
  getRuntimeUserId
} from "./action-runtime-mapper";
import { evaluateActionIntent } from "../action-intent-engine";
import {
  buildPolicyDraftFromIntentResult,
  policyAllowsMutationExecution
} from "./policy-runtime-mapper";
import { buildSagaDraftFromIntent, buildDefaultSagaSteps } from "./saga-runtime-mapper";
import { buildExecutionDraftFromPayload } from "./execution-runtime-mapper";
import { parseHandlerSchemaContract } from "./handler-runtime-mapper";
import { buildAuditDraft } from "./audit-runtime-mapper";
import { buildNotificationDraft } from "./notification-runtime-mapper";
import { evaluatePipelineComposer } from "../pipeline-composer-engine";
import { evaluateHandlerRegistry } from "../handler-registry-engine";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import { insertActionIntentDb, countActionIntentsByDedupeKeyDb } from "../db-repositories/action-intents.repository";
import { insertPolicyDecisionDb } from "../db-repositories/policy-decisions.repository";
import {
  findLatestPipelineByIdempotencyKeyDb,
  insertPipelineRecordDb,
  updatePipelineRecordLinksDb
} from "../db-repositories/pipelines.repository";
import { insertSagaRecordDb, insertSagaStepDb } from "../db-repositories/sagas.repository";
import { insertExecutionRequestDb } from "../db-repositories/execution-requests.repository";
import {
  findHandlerByNameDb,
  findHandlerDefinitionDb
} from "../db-repositories/handler-definitions.repository";
import { insertAuditRecordDb } from "../db-repositories/audits.repository";
import { insertNotificationRecordDb } from "../db-repositories/notifications.repository";
import { failClosed, isAlphabetRuntimeError } from "./runtime-errors";
import { maybeCreateAdminReviewCaseFromHook } from "../admin-review-hooks/admin-review-hook-store";

/** @deprecated Use RuntimeLinkedObjectIds from runtime.types */
export type PipelineRuntimeLinkedIds = RuntimeLinkedObjectIds;

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function emptyLinked(): RuntimeLinkedObjectIds {
  return {
    actionIntentId: null,
    policyDecisionId: null,
    pipelineId: null,
    sagaId: null,
    executionRequestIds: [],
    handlerDefinitionIds: [],
    auditRecordIds: [],
    notificationIds: [],
    eventIds: []
  };
}

export function isAdminVisible(authContext: ActionApiAuthContext): boolean {
  return authContext.isAdmin === true || authContext.isModerator === true || authContext.isSystem === true;
}

function isPipelineFinancialIntent(intentType: string | null | undefined): boolean {
  if (!intentType) return false;
  return (
    intentType === "withdraw" ||
    intentType === "earn_reward" ||
    intentType === "issue_reward" ||
    intentType === "convert" ||
    intentType === "tip" ||
    intentType === "creator_payout" ||
    intentType === "issue_grant"
  );
}

function asTargetSystem(value: string): ExecutionTargetSystem {
  return value as ExecutionTargetSystem;
}

function asExecutionAction(value: string): ExecutionAction {
  return value as ExecutionAction;
}

function makeTrace(params: RuntimeTraceStep): RuntimeTraceStep {
  return params;
}

async function persistAlphabetEventFromEngineEvent(event: AlphabetEvent | null | undefined): Promise<string | null> {
  if (!event) return null;
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

async function persistAlphabetEventsFromIntent(
  events: Array<AlphabetEvent | null | undefined>
): Promise<string[]> {
  const ids: string[] = [];
  for (const ev of events) {
    const id = await persistAlphabetEventFromEngineEvent(ev);
    if (id) ids.push(id);
  }
  return ids;
}

function choosePipelineType(intentType?: string | null): string {
  switch (intentType) {
    case "withdraw":
      return "withdrawal_pipeline";
    case "earn_reward":
    case "issue_reward":
    case "verify_presence":
      return "reward_pipeline";
    case "launch_campaign":
    case "join_campaign":
      return "campaign_pipeline";
    case "monetize_content":
    case "upload_content":
    case "create_content":
      return "content_pipeline";
    case "issue_grant":
      return "grant_pipeline";
    case "request_guardian_permission":
      return "guardian_pipeline";
    case "notification_delivery":
      return "notification_pipeline";
    case "admin_command":
    case "audit_export":
    case "review_decision":
      return "admin_action";
    default:
      return "user_action";
  }
}

function publicFailureResponse(params: {
  requestId: string;
  status: string;
  message: string;
  actionIntentId?: string | null;
  pipelineId?: string | null;
}) {
  return {
    ok: false,
    status: params.status,
    actionIntentId: params.actionIntentId ?? null,
    pipelineId: params.pipelineId ?? null,
    allowedToContinue: false,
    requiresUserAction: true,
    userActionType: "retry" as const,
    message: params.message,
    requestId: params.requestId
  };
}

function mergeRuntimeReplay(snapshot: unknown, apiRequestId: string): RuntimeResult {
  const base: RuntimeResult = {
    ok: true,
    status: "runtime_completed",
    publicResponse: {
      ok: true,
      status: "api_idempotent_replay",
      actionIntentId: null,
      pipelineId: null,
      allowedToContinue: true,
      requiresUserAction: false,
      userActionType: "none",
      message: "Replayed prior result.",
      requestId: apiRequestId
    },
    linkedObjectIds: emptyLinked(),
    trace: [],
    intentResult: null,
    pipelineResult: null,
    sagaResult: null,
    executionResults: [],
    handlerResults: [],
    reasonCodes: ["idempotency_replay"]
  };
  if (snapshot && typeof snapshot === "object") {
    const s = snapshot as Partial<RuntimeResult>;
    return {
      ...base,
      ...s,
      publicResponse: s.publicResponse ?? base.publicResponse,
      linkedObjectIds: s.linkedObjectIds ?? base.linkedObjectIds,
      trace: Array.isArray(s.trace) ? s.trace : base.trace,
      executionResults: s.executionResults ?? base.executionResults,
      handlerResults: s.handlerResults ?? base.handlerResults,
      reasonCodes: s.reasonCodes ?? base.reasonCodes
    };
  }
  return base;
}

/**
 * After API preflight succeeds and before persisting a new action intent.
 * Returns replay snapshot, blocked duplicate response, or continue.
 */
export async function guardPipelineRuntimeApiPreflight(params: {
  payload: ActionApiRequestPayload;
  userId: string;
  authContext: ActionApiAuthContext;
  apiRequestId: string;
  linked: RuntimeLinkedObjectIds;
  trace: RuntimeTraceStep[];
}): Promise<
  | { kind: "replay"; runtimeResult: RuntimeResult }
  | { kind: "blocked"; runtimeResult: RuntimeResult }
  | { kind: "continue" }
> {
  const { payload, userId, apiRequestId, linked, trace } = params;

  if (!isPipelineFinancialIntent(payload.intentType as string | null | undefined)) {
    return { kind: "continue" };
  }

  const apiGuard = await guardMutationDb({
    scope: "api_action",
    userId,
    objectId:
      payload.walletId ??
      payload.contentId ??
      payload.campaignId ??
      payload.grantEligibilityId ??
      null,
    idempotencyKey: payload.idempotencyKey ?? null,
    dedupeKey: payload.dedupeKey ?? null,
    requestPayload: payload as Record<string, unknown>,
    financialMutation: true,
    allowReplay: true,
    blockDuplicate: true,
    metadata: {
      source: "pipeline_runtime_api_preflight"
    } satisfies Json
  });

  if (apiGuard.replay && apiGuard.responseSnapshot) {
    return {
      kind: "replay",
      runtimeResult: mergeRuntimeReplay(apiGuard.responseSnapshot, apiRequestId)
    };
  }

  if (apiGuard.blocked) {
    return {
      kind: "blocked",
      runtimeResult: {
        ok: false,
        status: "runtime_failed",
        httpStatus: 409,
        publicResponse: {
          ok: false,
          status: "api_duplicate",
          actionIntentId: null,
          pipelineId: null,
          allowedToContinue: false,
          requiresUserAction: false,
          userActionType: "none",
          message: "This request was already received or cannot safely continue.",
          requestId: apiRequestId
        },
        linkedObjectIds: linked,
        trace,
        intentResult: null,
        pipelineResult: null,
        sagaResult: null,
        executionResults: [],
        handlerResults: [],
        reasonCodes: apiGuard.reasons
      }
    };
  }

  return { kind: "continue" };
}

/** Persist successful runtime outcome for API idempotency replay. */
export async function finalizePipelineRuntimeWithIdempotency(params: {
  payload: ActionApiRequestPayload;
  runtimeResult: RuntimeResult;
  linked: RuntimeLinkedObjectIds;
}): Promise<void> {
  const { payload, runtimeResult, linked } = params;

  await completeGuardedMutationDb({
    idempotencyKey: payload.idempotencyKey ?? null,
    dedupeKey: payload.dedupeKey ?? null,
    releaseDedupe: false,
    responseSnapshot: runtimeResult as unknown as Json,
    linkedObjectIds: {
      actionIntentId: linked.actionIntentId,
      policyDecisionId: linked.policyDecisionId,
      pipelineId: linked.pipelineId,
      sagaId: linked.sagaId,
      executionRequestId: linked.executionRequestIds[0] ?? null
    },
    metadata: {
      source: "pipeline_runtime_completed"
    }
  });
}

function evaluateHandlerForDraft(params: {
  handler: DbHandlerDefinition;
  executionDraft: ReturnType<typeof buildExecutionDraftFromPayload>;
  intentEventIds: string[];
  mode: RuntimeInput["mode"];
}): ReturnType<typeof evaluateHandlerRegistry> {
  const { handler, executionDraft, intentEventIds, mode } = params;
  return evaluateHandlerRegistry({
    handlerDefinitionId: handler.handler_definition_id,
    handlerName: handler.handler_name,
    handlerVersion: handler.handler_version,
    targetSystem: asTargetSystem(handler.target_system),
    action: asExecutionAction(handler.action),
    status: handler.status as HandlerStatus,
    health: handler.health as HandlerHealth,
    runtimeMode: handler.runtime_mode as HandlerRuntimeMode,
    permissionLevel: handler.permission_level as HandlerPermissionLevel,
    riskClass: handler.risk_class as HandlerRiskClass,
    schema: parseHandlerSchemaContract(handler),
    idempotencyRequired: handler.idempotency_required,
    idempotencyKey: executionDraft.idempotencyKey ?? null,
    auditRequired: handler.audit_required,
    auditCreated: true,
    retrySupported: handler.retry_supported,
    retryCount: 0,
    timeoutMs: handler.timeout_ms,
    ownerTeam: handler.owner_team,
    executionPayload: executionDraft.payload as Record<string, unknown>,
    executionResult: null,
    allowDeprecated: false,
    validationMode: "payload",
    handlerReferencedByExecutionRequestId: null,
    sourceEventIds: intentEventIds,
    metadata: {
      runtimeMode: mode
    }
  });
}

export async function runDatabaseBackedPipelineRuntime(input: RuntimeInput): Promise<RuntimeResult> {
  const trace: RuntimeTraceStep[] = [];
  const linked = emptyLinked();
  const apiRequestId = createId("api_request");
  const { payload, authContext } = input;

  const userId = getRuntimeUserId({ payload, authContext });
  const actorUserId = getRuntimeActorUserId({ payload, authContext });

  try {
    trace.push(
      makeTrace({
        stage: "api_validation",
        status: "runtime_started",
        reasonCodes: ["runtime_started"]
      })
    );

    const apiPreflight = evaluateActionApiRequest({
      apiRequestId,
      method: "POST",
      endpoint: "create_action",
      requestSource: payload.requestSource ?? "user",
      requestChannel: payload.requestChannel ?? "mobile_app",
      authContext,
      payload,
      sanitizedPayload: payload,
      currentStatus: "api_request_created",
      actionIntentId: null,
      pipelineId: null,
      idempotencyKey: payload.idempotencyKey ?? null,
      dedupeKey: payload.dedupeKey ?? null,
      duplicateRequestCount: 0,
      actionCreated: false,
      pipelineCreated: false,
      responseRequested: false,
      cancelRequested: false,
      linkedPipelineResponse: null
    });

    if (!apiPreflight.publicResponse.ok) {
      return {
        ok: false,
        status: "runtime_failed",
        httpStatus: 400,
        publicResponse: apiPreflight.publicResponse,
        internalResponse: isAdminVisible(authContext) ? apiPreflight.internalResponse : undefined,
        linkedObjectIds: linked,
        trace,
        intentResult: null,
        pipelineResult: null,
        sagaResult: null,
        executionResults: [],
        handlerResults: [],
        reasonCodes: apiPreflight.reasons
      };
    }

    if (!userId) {
      failClosed({
        code: "runtime_user_id_required",
        message: "User ID is required.",
        statusCode: 401,
        reasonCodes: ["runtime_user_id_required"]
      });
    }

    if (payload.idempotencyKey?.trim()) {
      const existingPipeline = await findLatestPipelineByIdempotencyKeyDb({
        userId,
        idempotencyKey: payload.idempotencyKey.trim()
      });
      if (existingPipeline) {
        const replay: RuntimeResult = {
          ok: true,
          status: "runtime_completed",
          httpStatus: 200,
          publicResponse: {
            ok: true,
            status: "api_pipeline_replay",
            actionIntentId: existingPipeline.action_intent_id,
            pipelineId: existingPipeline.pipeline_id,
            allowedToContinue: existingPipeline.status === "pipeline_ready",
            requiresUserAction: existingPipeline.status !== "pipeline_ready",
            userActionType: existingPipeline.status === "pipeline_ready" ? "none" : "wait_for_review",
            message: "Idempotent replay: existing pipeline returned.",
            requestId: apiRequestId
          },
          linkedObjectIds: {
            ...linked,
            actionIntentId: existingPipeline.action_intent_id,
            policyDecisionId: existingPipeline.policy_decision_id,
            pipelineId: existingPipeline.pipeline_id,
            sagaId: existingPipeline.saga_id,
            executionRequestIds: existingPipeline.execution_request_ids ?? [],
            handlerDefinitionIds: existingPipeline.handler_definition_ids ?? [],
            auditRecordIds: existingPipeline.audit_record_ids ?? [],
            notificationIds: existingPipeline.notification_ids ?? [],
            eventIds: existingPipeline.source_event_ids ?? []
          },
          trace: [
            ...trace,
            makeTrace({
              stage: "api_validation",
              status: "runtime_completed",
              objectId: existingPipeline.pipeline_id,
              reasonCodes: ["pipeline_idempotency_replay"]
            })
          ],
          intentResult: null,
          pipelineResult: null,
          sagaResult: null,
          executionResults: [],
          handlerResults: [],
          reasonCodes: ["pipeline_idempotency_replay"]
        };
        return replay;
      }
    }

    const guard = await guardPipelineRuntimeApiPreflight({
      payload,
      userId,
      authContext,
      apiRequestId,
      linked,
      trace
    });
    if (guard.kind === "replay") {
      return { ...guard.runtimeResult, trace: [...trace, ...guard.runtimeResult.trace] };
    }
    if (guard.kind === "blocked") {
      return { ...guard.runtimeResult, trace: [...trace, ...guard.runtimeResult.trace] };
    }

    const duplicateIntentCount =
      payload.dedupeKey?.trim() && userId
        ? await countActionIntentsByDedupeKeyDb({
            userId,
            dedupeKey: payload.dedupeKey.trim()
          })
        : 0;

    const intentContext = buildIntentContextFromApi({ payload, authContext });

    const actionIntent = await insertActionIntentDb({
      intentType: (payload.intentType as string) ?? "system_action",
      intentSource: payload.requestSource ?? "user",
      status: "intent_created",
      userId,
      actorUserId,
      creatorId: payload.creatorId ?? null,
      businessId: payload.businessId ?? null,
      walletId: payload.walletId ?? null,
      contentId: payload.contentId ?? null,
      campaignId: payload.campaignId ?? null,
      grantEligibilityId: payload.grantEligibilityId ?? null,
      sessionId: authContext.sessionId ?? null,
      deviceId: authContext.deviceId ?? null,
      clientRequestId: authContext.clientRequestId ?? null,
      idempotencyKey: payload.idempotencyKey ?? null,
      dedupeKey: payload.dedupeKey ?? null,
      sourceEventIds: [],
      context: intentContext as unknown as Json,
      riskSignals: buildDefaultIntentRiskSignals() as unknown as Json,
      metadata: {
        runtimeMode: input.mode
      } as Json
    });

    linked.actionIntentId = actionIntent.action_intent_id;

    trace.push(
      makeTrace({
        stage: "action_intent",
        status: "runtime_intent_created",
        objectId: actionIntent.action_intent_id,
        reasonCodes: ["action_intent_inserted"]
      })
    );

    const intentResult = evaluateActionIntent({
      actionIntentId: actionIntent.action_intent_id,
      intentType: actionIntent.intent_type as never,
      intentSource: actionIntent.intent_source as never,
      currentStatus: actionIntent.status as never,
      userId,
      actorUserId,
      creatorId: payload.creatorId ?? null,
      businessId: payload.businessId ?? null,
      walletId: payload.walletId ?? null,
      contentId: payload.contentId ?? null,
      campaignId: payload.campaignId ?? null,
      grantEligibilityId: payload.grantEligibilityId ?? null,
      sessionId: authContext.sessionId ?? null,
      deviceId: authContext.deviceId ?? null,
      clientRequestId: authContext.clientRequestId ?? null,
      idempotencyKey: payload.idempotencyKey ?? null,
      dedupeKey: payload.dedupeKey ?? null,
      duplicateIntentCount,
      sourceEventIds: [],
      context: intentContext,
      riskSignals: buildDefaultIntentRiskSignals(),
      expiresAt: actionIntent.expires_at,
      now: new Date().toISOString(),
      contextCaptured: true,
      policyRequested: true,
      sagaRequested: true,
      cancelRequested: false,
      metadata: {
        runtimeMode: input.mode
      }
    });

    const intentEventIds = await persistAlphabetEventsFromIntent([
      intentResult.actionIntentCreatedEvent,
      intentResult.actionIntentContextCapturedEvent,
      intentResult.actionIntentPrecheckPassedEvent,
      intentResult.actionIntentPrecheckFailedEvent,
      intentResult.actionIntentPolicyRequestedEvent,
      intentResult.actionIntentSagaRequestedEvent,
      intentResult.actionIntentAcceptedEvent,
      intentResult.actionIntentRejectedEvent,
      intentResult.actionIntentExpiredEvent
    ]);
    linked.eventIds.push(...intentEventIds);

    if (intentResult.rejected || intentResult.duplicate || intentResult.expired || intentResult.canceled) {
      trace.push(
        makeTrace({
          stage: "action_intent",
          status: "runtime_intent_failed",
          objectId: actionIntent.action_intent_id,
          reasonCodes: intentResult.reasons
        })
      );
      return {
        ok: false,
        status: "runtime_intent_failed",
        httpStatus: 400,
        publicResponse: {
          ok: false,
          status: "api_response_ready",
          actionIntentId: actionIntent.action_intent_id,
          pipelineId: null,
          allowedToContinue: false,
          requiresUserAction: true,
          userActionType: "retry",
          message: "This action cannot continue.",
          requestId: apiRequestId
        },
        linkedObjectIds: linked,
        trace,
        intentResult,
        pipelineResult: null,
        sagaResult: null,
        executionResults: [],
        handlerResults: [],
        reasonCodes: intentResult.reasons
      };
    }

    const policyDraft = buildPolicyDraftFromIntentResult(intentResult);
    const policy = await insertPolicyDecisionDb({
      userId,
      creatorId: payload.creatorId ?? null,
      businessId: payload.businessId ?? null,
      walletId: payload.walletId ?? null,
      contentId: payload.contentId ?? null,
      campaignId: payload.campaignId ?? null,
      grantEligibilityId: payload.grantEligibilityId ?? null,
      actionType: policyDraft.actionType,
      primaryDomain: policyDraft.primaryDomain,
      decision: policyDraft.decision,
      status: policyDraft.status,
      gateResults: policyDraft.gateResults,
      riskSignals: policyDraft.riskSignals,
      ageBand: policyDraft.ageBand,
      trustScore: policyDraft.trustScore,
      uValueScore: policyDraft.uValueScore,
      downstreamInstructions: policyDraft.downstreamInstructions,
      metadata: policyDraft.metadata
    });

    linked.policyDecisionId = policy.policy_decision_id;

    trace.push(
      makeTrace({
        stage: "policy",
        status:
          policy.decision === "allow" || policy.decision === "allow_with_limits"
            ? "runtime_policy_created"
            : policy.decision === "block" || policy.decision === "escalate"
              ? "runtime_policy_blocked"
              : "runtime_policy_created",
        objectId: policy.policy_decision_id,
        reasonCodes: [policy.status]
      })
    );

    if (policy.decision === "block" || policy.decision === "escalate") {
      await maybeCreateAdminReviewCaseFromHook({
        hookSource: "policy_runtime",
        hookTrigger: "policy_blocked_high_risk",
        subjectIds: {
          userId,
          actorUserId,
          walletId: payload.walletId ?? null,
          contentId: payload.contentId ?? null,
          campaignId: payload.campaignId ?? null,
          grantEligibilityId: payload.grantEligibilityId ?? null,
          policyDecisionId: policy.policy_decision_id,
          pipelineId: null,
          executionRequestId: null
        },
        sourceObjectType: "policy_decision",
        sourceObjectId: policy.policy_decision_id,
        rawEvidence: {
          policyDecision: policy,
          payload,
          intentResult
        } as never,
        publicSummary: "This action was blocked by policy and may need platform follow-up.",
        internalSummary: "Policy block or escalate during pipeline runtime (pre-pipeline).",
        sourceEventIds: linked.eventIds,
        riskScore: Number((policy.risk_signals as { intentRisk?: number } | null)?.intentRisk ?? 0.75),
        uncertaintyScore: 0.55,
        userImpactScore: isPipelineFinancialIntent(payload.intentType) ? 0.85 : 0.45,
        platformImpactScore: isPipelineFinancialIntent(payload.intentType) ? 0.8 : 0.5,
        moneyMovementPossible: isPipelineFinancialIntent(payload.intentType),
        paymentUncertainty: payload.intentType === "withdraw",
        fraudSuspected: false,
        userVisible: true,
        existingOpenReviewCaseCount: 0,
        now: new Date().toISOString(),
        metadata: { runtimeMode: input.mode, policyDecision: policy.decision }
      });
      return {
        ok: false,
        status: "runtime_policy_blocked",
        httpStatus: 403,
        publicResponse: {
          ok: false,
          status: "api_response_ready",
          actionIntentId: actionIntent.action_intent_id,
          pipelineId: null,
          allowedToContinue: false,
          requiresUserAction: true,
          userActionType: "wait_for_review",
          message: "This action cannot continue right now.",
          requestId: apiRequestId
        },
        internalResponse: isAdminVisible(authContext)
          ? {
              requestId: apiRequestId,
              reasons: [policy.status],
              linkedPipelineResponse: null,
              riskHints: { policyDecision: policy.decision }
            }
          : undefined,
        linkedObjectIds: linked,
        trace,
        intentResult,
        pipelineResult: null,
        sagaResult: null,
        executionResults: [],
        handlerResults: [],
        reasonCodes: [policy.status]
      };
    }

    const mutationAllowed = policyAllowsMutationExecution(policy.decision);
    const pipelineType = choosePipelineType(payload.intentType);
    const executionDraft = buildExecutionDraftFromPayload({
      payload,
      userId,
      policyDecisionId: policy.policy_decision_id,
      sourceEventIds: intentEventIds
    });

    let handlerResult: ReturnType<typeof evaluateHandlerRegistry> | null = null;
    let handler: DbHandlerDefinition | null = null;

    if (mutationAllowed) {
      handler =
        (await findHandlerByNameDb({
          handlerName: executionDraft.handlerName,
          handlerVersion: executionDraft.handlerVersion
        })) ??
        (await findHandlerDefinitionDb({
          targetSystem: executionDraft.targetSystem,
          action: executionDraft.action,
          handlerVersion: executionDraft.handlerVersion
        }));

      if (!handler) {
        failClosed({
          code: "runtime_handler_not_found",
          message: "No handler definition found.",
          statusCode: 500,
          reasonCodes: ["runtime_handler_not_found"]
        });
      }

      linked.handlerDefinitionIds.push(handler.handler_definition_id);
      handlerResult = evaluateHandlerForDraft({
        handler,
        executionDraft,
        intentEventIds,
        mode: input.mode
      });

      const handlerEventIds = await persistAlphabetEventsFromIntent([
        handlerResult.handlerRegisteredEvent,
        handlerResult.handlerAvailableEvent,
        handlerResult.handlerPayloadValidEvent,
        handlerResult.handlerPayloadInvalidEvent,
        handlerResult.handlerRequiresReviewEvent,
        handlerResult.handlerDisabledEvent,
        handlerResult.handlerDeprecatedEvent
      ]);
      linked.eventIds.push(...handlerEventIds);

      if (!handlerResult.payloadValid || !handlerResult.available) {
        await maybeCreateAdminReviewCaseFromHook({
          hookSource: "pipeline_runtime",
          hookTrigger: "handler_validation_failed",
          subjectIds: {
            userId,
            actorUserId,
            walletId: payload.walletId ?? null,
            contentId: payload.contentId ?? null,
            campaignId: payload.campaignId ?? null,
            grantEligibilityId: payload.grantEligibilityId ?? null,
            policyDecisionId: policy.policy_decision_id,
            pipelineId: null,
            executionRequestId: null
          },
          sourceObjectType: "handler_definition",
          sourceObjectId: handler.handler_definition_id,
          rawEvidence: {
            handler,
            handlerResult,
            executionDraft
          } as never,
          publicSummary: "This action could not be safely processed.",
          internalSummary: "Handler validation failed during pipeline runtime.",
          sourceEventIds: linked.eventIds,
          riskScore: handlerResult.handlerRiskScore,
          uncertaintyScore: 0.8,
          userImpactScore: 0.7,
          platformImpactScore: 0.8,
          moneyMovementPossible:
            executionDraft.targetSystem === "wallet" ||
            executionDraft.targetSystem === "withdrawal" ||
            executionDraft.targetSystem === "conversion",
          paymentUncertainty: executionDraft.targetSystem === "withdrawal",
          fraudSuspected: false,
          userVisible: true,
          existingOpenReviewCaseCount: 0,
          now: new Date().toISOString(),
          metadata: {
            handlerName: handler.handler_name
          }
        });
        trace.push(
          makeTrace({
            stage: "handler_validation",
            status: "runtime_failed",
            objectId: handler.handler_definition_id,
            reasonCodes: handlerResult.reasons
          })
        );
        return {
          ok: false,
          status: "runtime_failed",
          httpStatus: 422,
          publicResponse: publicFailureResponse({
            requestId: apiRequestId,
            status: "api_validation_failed",
            message: "This action could not be validated.",
            actionIntentId: actionIntent.action_intent_id,
            pipelineId: null
          }),
          linkedObjectIds: linked,
          trace,
          intentResult,
          pipelineResult: null,
          sagaResult: null,
          executionResults: [],
          handlerResults: [handlerResult],
          reasonCodes: handlerResult.reasons
        };
      }

      trace.push(
        makeTrace({
          stage: "handler_validation",
          status: "runtime_handler_validated",
          objectId: handler.handler_definition_id,
          reasonCodes: handlerResult.reasons
        })
      );
    }

    const pipeline = await insertPipelineRecordDb({
      pipelineType,
      status: mutationAllowed ? "pipeline_created" : "pipeline_review",
      userId,
      actorUserId,
      creatorId: payload.creatorId ?? null,
      businessId: payload.businessId ?? null,
      walletId: payload.walletId ?? null,
      contentId: payload.contentId ?? null,
      campaignId: payload.campaignId ?? null,
      grantEligibilityId: payload.grantEligibilityId ?? null,
      requestSource: payload.requestSource ?? "user",
      requestChannel: payload.requestChannel ?? "mobile_app",
      requestedIntentType: (payload.intentType as string) ?? "system_action",
      requestedPolicyAction: policy.action_type,
      requestedPolicyDomain: policy.primary_domain,
      requestedSagaType: intentResult.sagaRequest.sagaType,
      targetSystems: [asTargetSystem(executionDraft.targetSystem)],
      actionIntentId: actionIntent.action_intent_id,
      policyDecisionId: policy.policy_decision_id,
      sourceEventIds: intentEventIds,
      idempotencyKey: payload.idempotencyKey ?? null,
      dedupeKey: payload.dedupeKey ?? null,
      steps: [
        {
          stepName: "intent",
          status: "passed",
          objectId: actionIntent.action_intent_id,
          reasonCodes: intentResult.reasons
        },
        {
          stepName: "policy",
          status: "passed",
          objectId: policy.policy_decision_id,
          reasonCodes: [policy.status]
        },
        { stepName: "final_response", status: "pending", reasonCodes: [] }
      ] as unknown as Json,
      riskSignals: {
        intentRisk: intentResult.precheckRiskScore,
        policyRisk: Number((policy.risk_signals as { intentRisk?: number })?.intentRisk ?? 0.03),
        sagaRisk: 0.03,
        executionRisk: 0.03,
        handlerRisk: handlerResult?.handlerRiskScore ?? 0.03,
        auditRisk: 0.01,
        notificationRisk: 0.01,
        totalPipelineRisk: Math.max(intentResult.precheckRiskScore, handlerResult?.handlerRiskScore ?? 0)
      } as unknown as Json,
      metadata: {
        runtimeMode: input.mode
      } as Json
    });

    linked.pipelineId = pipeline.pipeline_id;

    trace.push(
      makeTrace({
        stage: "pipeline",
        status: "runtime_pipeline_created",
        objectId: pipeline.pipeline_id,
        reasonCodes: ["pipeline_inserted"]
      })
    );

    let sagaId: string | null = null;
    if (intentResult.sagaRequest.required) {
      const sagaDraft = buildSagaDraftFromIntent({
        intent: intentResult,
        policyDecisionId: policy.policy_decision_id,
        sourceEventIds: intentEventIds,
        idempotencyKey: payload.idempotencyKey ?? null
      });

      const saga = await insertSagaRecordDb({
        sagaType: sagaDraft.sagaType,
        status: "saga_created",
        userId,
        walletId: sagaDraft.walletId ?? null,
        contentId: sagaDraft.contentId ?? null,
        campaignId: sagaDraft.campaignId ?? null,
        grantEligibilityId: sagaDraft.grantEligibilityId ?? null,
        sourceActionIntentId: actionIntent.action_intent_id,
        policyDecisionId: policy.policy_decision_id,
        sourceEventIds: intentEventIds,
        idempotencyKey: payload.idempotencyKey ?? null,
        metadata: {
          runtimeMode: input.mode
        } as Json
      });

      sagaId = saga.saga_id;
      linked.sagaId = saga.saga_id;

      const sagaSteps = buildDefaultSagaSteps({
        requiresPolicy: true,
        requiresExecution: mutationAllowed,
        requiresHandlerValidation: mutationAllowed,
        requiresAudit: true,
        requiresNotification: true
      });

      for (const step of sagaSteps) {
        await insertSagaStepDb({
          sagaId: saga.saga_id,
          stepType: step.stepType,
          status: step.status,
          label: step.label,
          dependsOnStepIds: step.dependsOnStepIds,
          compensationRequired: step.compensationRequired,
          compensationAction: step.compensationAction ?? null
        });
      }

      trace.push(
        makeTrace({
          stage: "saga",
          status: "runtime_saga_created",
          objectId: saga.saga_id,
          reasonCodes: ["saga_inserted"]
        })
      );
    }

    let execution: Awaited<ReturnType<typeof insertExecutionRequestDb>> | null = null;
    if (mutationAllowed && handler && handlerResult) {
      execution = await insertExecutionRequestDb({
        sourcePolicyDecisionId: policy.policy_decision_id,
        sourceEventIds: intentEventIds,
        targetSystem: executionDraft.targetSystem,
        targetObjectId: executionDraft.targetObjectId ?? null,
        action: executionDraft.action,
        status: "request_created",
        priority: executionDraft.priority,
        idempotencyKey: executionDraft.idempotencyKey ?? null,
        dedupeKey: executionDraft.dedupeKey ?? null,
        handlerName: executionDraft.handlerName,
        handlerVersion: executionDraft.handlerVersion,
        payload: executionDraft.payload,
        sanitizedPayload: handlerResult.safePayload as Json,
        metadata: executionDraft.metadata
      });
      linked.executionRequestIds.push(execution.execution_request_id);
      trace.push(
        makeTrace({
          stage: "execution",
          status: "runtime_execution_created",
          objectId: execution.execution_request_id,
          reasonCodes: ["execution_request_inserted"]
        })
      );
    }

    const allEventIdsForAudit = [...linked.eventIds];
    const auditDraft = buildAuditDraft({
      payload,
      userId,
      actorUserId,
      policyDecisionId: policy.policy_decision_id,
      executionRequestId: execution?.execution_request_id ?? null,
      sagaId,
      pipelineId: pipeline.pipeline_id,
      sourceEventIds: allEventIdsForAudit,
      reasonCodes: [...intentResult.reasons, ...(handlerResult?.reasons ?? [])]
    });

    const audit = await insertAuditRecordDb({
      auditType: auditDraft.auditType,
      status: auditDraft.status,
      userId: auditDraft.userId,
      actorUserId: auditDraft.actorUserId,
      walletId: auditDraft.walletId,
      contentId: auditDraft.contentId,
      campaignId: auditDraft.campaignId,
      policyDecisionId: auditDraft.policyDecisionId,
      executionRequestId: auditDraft.executionRequestId,
      sagaId: auditDraft.sagaId,
      pipelineId: auditDraft.pipelineId,
      sourceEventIds: auditDraft.sourceEventIds,
      publicSummary: auditDraft.publicSummary,
      internalSummary: auditDraft.internalSummary,
      evidence: auditDraft.evidence,
      redactedEvidence: auditDraft.redactedEvidence,
      riskSummary: auditDraft.riskSummary,
      metadata: auditDraft.metadata
    });
    linked.auditRecordIds.push(audit.audit_record_id);

    trace.push(
      makeTrace({
        stage: "audit",
        status: "runtime_audit_created",
        objectId: audit.audit_record_id,
        reasonCodes: ["audit_inserted"]
      })
    );

    const notifStatus =
      policy.decision === "require_review" || policy.decision === "hold" ? "review" : "created";
    const notificationDraft = buildNotificationDraft({
      userId,
      sourceSystem: "pipeline_runtime",
      sourceObjectId: pipeline.pipeline_id,
      sourceEventIds: allEventIdsForAudit,
      status: notifStatus,
      reasonCodes: [...intentResult.reasons, ...(handlerResult?.reasons ?? [])]
    });

    const notification = await insertNotificationRecordDb({
      recipientUserId: notificationDraft.recipientUserId,
      sourceSystem: notificationDraft.sourceSystem,
      sourceObjectId: notificationDraft.sourceObjectId,
      sourceEventIds: notificationDraft.sourceEventIds,
      category: notificationDraft.category,
      severity: notificationDraft.severity,
      status: notificationDraft.status,
      title: notificationDraft.title,
      body: notificationDraft.body,
      explanationClass: notificationDraft.explanationClass,
      objectLabel: notificationDraft.objectLabel,
      internalReasonCodes: notificationDraft.internalReasonCodes,
      privacySensitivity: notificationDraft.privacySensitivity,
      dedupeKey: notificationDraft.dedupeKey,
      metadata: notificationDraft.metadata
    });
    linked.notificationIds.push(notification.notification_id);

    trace.push(
      makeTrace({
        stage: "notification",
        status: "runtime_notification_created",
        objectId: notification.notification_id,
        reasonCodes: ["notification_inserted"]
      })
    );

    await updatePipelineRecordLinksDb({
      pipelineId: pipeline.pipeline_id,
      policyDecisionId: policy.policy_decision_id,
      sagaId,
      executionRequestIds: linked.executionRequestIds,
      handlerDefinitionIds: linked.handlerDefinitionIds,
      auditRecordIds: linked.auditRecordIds,
      notificationIds: linked.notificationIds,
      status: mutationAllowed ? "pipeline_ready" : "pipeline_review",
      metadata: {
        runtimeLinked: linked as unknown as Json
      }
    });

    const policyRequiresReview =
      policy.decision === "require_review" || policy.decision === "hold";
    const policyBlocked = policy.decision === "block" || policy.decision === "escalate";

    const pipelineResult = evaluatePipelineComposer({
      pipelineId: pipeline.pipeline_id,
      pipelineType: pipeline.pipeline_type,
      currentStatus: mutationAllowed ? "pipeline_ready" : "pipeline_review",
      userId,
      actorUserId,
      creatorId: payload.creatorId ?? null,
      businessId: payload.businessId ?? null,
      walletId: payload.walletId ?? null,
      contentId: payload.contentId ?? null,
      campaignId: payload.campaignId ?? null,
      grantEligibilityId: payload.grantEligibilityId ?? null,
      requestSource: payload.requestSource ?? "user",
      requestChannel: payload.requestChannel ?? "mobile_app",
      requestedIntentType: (payload.intentType as string) ?? "system_action",
      requestedPolicyAction: policy.action_type,
      requestedPolicyDomain: policy.primary_domain,
      requestedSagaType: intentResult.sagaRequest.sagaType,
      targetSystems: [asTargetSystem(executionDraft.targetSystem)],
      actionIntentId: actionIntent.action_intent_id,
      policyDecisionId: policy.policy_decision_id,
      sagaId,
      executionRequestIds: linked.executionRequestIds,
      handlerDefinitionIds: linked.handlerDefinitionIds,
      auditRecordIds: linked.auditRecordIds,
      notificationIds: linked.notificationIds,
      sourceEventIds: linked.eventIds,
      idempotencyKey: payload.idempotencyKey ?? null,
      dedupeKey: payload.dedupeKey ?? null,
      steps: [
        {
          stepName: "intent",
          status: "passed",
          objectId: actionIntent.action_intent_id,
          reasonCodes: intentResult.reasons
        },
        {
          stepName: "policy",
          status: "passed",
          objectId: policy.policy_decision_id,
          reasonCodes: [policy.status]
        },
        { stepName: "saga", status: sagaId ? "created" : "skipped", objectId: sagaId, reasonCodes: [] },
        {
          stepName: "execution",
          status: execution ? "created" : "skipped",
          objectId: execution?.execution_request_id ?? null,
          reasonCodes: []
        },
        {
          stepName: "handler_validation",
          status: handlerResult ? "passed" : "skipped",
          objectId: handler?.handler_definition_id ?? null,
          reasonCodes: handlerResult?.reasons ?? []
        },
        {
          stepName: "audit",
          status: "created",
          objectId: audit.audit_record_id,
          reasonCodes: []
        },
        {
          stepName: "notification",
          status: "created",
          objectId: notification.notification_id,
          reasonCodes: []
        },
        { stepName: "final_response", status: "created", reasonCodes: [] }
      ],
      riskSignals: {
        intentRisk: intentResult.precheckRiskScore,
        policyRisk: 0.03,
        sagaRisk: 0.03,
        executionRisk: 0.03,
        handlerRisk: handlerResult?.handlerRiskScore ?? 0.03,
        auditRisk: 0.01,
        notificationRisk: 0.01,
        totalPipelineRisk: Math.max(
          intentResult.precheckRiskScore,
          handlerResult?.handlerRiskScore ?? 0
        )
      },
      intentStatus: intentResult.status,
      policyStatus: policy.status,
      policyDecision: policy.decision,
      sagaStatus: sagaId ? "saga_ready" : null,
      executionStatuses: execution ? ["execution_allowed"] : [],
      intentAccepted: true,
      intentRejected: false,
      policyCreated: true,
      policyAllowed: policy.decision === "allow" || policy.decision === "allow_with_limits",
      policyBlocked,
      policyRequiresReview,
      sagaCreated: Boolean(sagaId),
      sagaCompleted: false,
      sagaFailed: false,
      sagaCompensationRequired: false,
      executionCreated: Boolean(execution),
      executionCompleted: false,
      executionFailed: false,
      handlerValidated: Boolean(handlerResult?.payloadValid),
      handlerValidationFailed: Boolean(handlerResult && !handlerResult.payloadValid),
      auditCreated: true,
      notificationCreated: true,
      cancelRequested: false,
      metadata: {
        runtimeMode: input.mode
      }
    });

    const pipelineEventIds = await persistAlphabetEventsFromIntent([
      pipelineResult.pipelineCreatedEvent,
      pipelineResult.pipelineIntentCreatedEvent,
      pipelineResult.pipelinePolicyCreatedEvent,
      pipelineResult.pipelineSagaCreatedEvent,
      pipelineResult.pipelineExecutionCreatedEvent,
      pipelineResult.pipelineHandlerValidatedEvent,
      pipelineResult.pipelineAuditCreatedEvent,
      pipelineResult.pipelineNotificationCreatedEvent,
      pipelineResult.pipelineReadyEvent
    ]);
    linked.eventIds.push(...pipelineEventIds);

    if (policyRequiresReview) {
      const rs = policy.risk_signals as { intentRisk?: number } | null | undefined;
      await maybeCreateAdminReviewCaseFromHook({
        hookSource: "policy_runtime",
        hookTrigger: "policy_requires_review",
        subjectIds: {
          userId,
          actorUserId,
          walletId: payload.walletId ?? null,
          contentId: payload.contentId ?? null,
          campaignId: payload.campaignId ?? null,
          grantEligibilityId: payload.grantEligibilityId ?? null,
          policyDecisionId: policy.policy_decision_id,
          pipelineId: linked.pipelineId ?? pipeline.pipeline_id,
          executionRequestId: linked.executionRequestIds[0] ?? null
        },
        sourceObjectType: "policy_decision",
        sourceObjectId: policy.policy_decision_id,
        rawEvidence: {
          policyDecision: policy,
          payload,
          intentResult
        } as never,
        publicSummary: "This action requires platform review before it can continue.",
        internalSummary: "Policy decision required review during pipeline runtime.",
        sourceEventIds: linked.eventIds,
        riskScore: Number(rs?.intentRisk ?? 0.5),
        uncertaintyScore: 0.65,
        userImpactScore: payload.intentType === "withdraw" ? 0.9 : 0.5,
        platformImpactScore: payload.intentType === "withdraw" ? 0.85 : 0.5,
        moneyMovementPossible: isPipelineFinancialIntent(payload.intentType),
        paymentUncertainty: payload.intentType === "withdraw",
        fraudSuspected: false,
        userVisible: true,
        existingOpenReviewCaseCount: 0,
        now: new Date().toISOString(),
        metadata: {
          runtimeMode: input.mode
        }
      });
    }

    const apiFinal = evaluateActionApiRequest({
      apiRequestId,
      method: "POST",
      endpoint: "create_action",
      requestSource: payload.requestSource ?? "user",
      requestChannel: payload.requestChannel ?? "mobile_app",
      authContext,
      payload,
      sanitizedPayload: payload,
      currentStatus: "api_pipeline_created",
      actionIntentId: actionIntent.action_intent_id,
      pipelineId: pipeline.pipeline_id,
      idempotencyKey: payload.idempotencyKey ?? null,
      dedupeKey: payload.dedupeKey ?? null,
      duplicateRequestCount: 0,
      actionCreated: true,
      pipelineCreated: true,
      responseRequested: true,
      cancelRequested: false,
      linkedPipelineResponse: {
        pipelineId: pipeline.pipeline_id,
        status: pipelineResult.status,
        allowedToContinue: pipelineResult.finalResponse.allowedToContinue,
        requiresUserAction: pipelineResult.finalResponse.requiresUserAction,
        userActionType: pipelineResult.finalResponse.userActionType,
        publicMessage: pipelineResult.finalResponse.publicMessage,
        internalReasonCodes: pipelineResult.finalResponse.internalReasonCodes,
        policyDecisionId: policy.policy_decision_id,
        sagaId,
        executionRequestIds: linked.executionRequestIds
      }
    });

    trace.push(
      makeTrace({
        stage: "final_response",
        status: "runtime_completed",
        objectId: pipeline.pipeline_id,
        reasonCodes: pipelineResult.reasons
      })
    );

    const done: RuntimeResult = {
      ok: true,
      status: "runtime_completed",
      httpStatus: 202,
      publicResponse: apiFinal.publicResponse,
      internalResponse: isAdminVisible(authContext) ? apiFinal.internalResponse : undefined,
      linkedObjectIds: linked,
      trace,
      intentResult,
      pipelineResult,
      sagaResult: null,
      executionResults: [],
      handlerResults: handlerResult ? [handlerResult] : [],
      reasonCodes: [
        ...intentResult.reasons,
        ...(handlerResult?.reasons ?? []),
        ...pipelineResult.reasons
      ]
    };

    if (isPipelineFinancialIntent(payload.intentType as string | null | undefined)) {
      await finalizePipelineRuntimeWithIdempotency({
        payload,
        runtimeResult: done,
        linked
      });
    }

    return done;
  } catch (error) {
    const runtimeError = isAlphabetRuntimeError(error) ? error : null;
    const reasonCodes = runtimeError?.reasonCodes ?? ["runtime_unhandled_error"];

    trace.push(
      makeTrace({
        stage: "final_response",
        status: "runtime_failed",
        reasonCodes
      })
    );

    return {
      ok: false,
      status: "runtime_failed",
      httpStatus: runtimeError?.statusCode ?? 500,
      publicResponse: publicFailureResponse({
        requestId: apiRequestId,
        status: "api_failed",
        message: runtimeError?.message ?? "The action could not be completed.",
        actionIntentId: linked.actionIntentId,
        pipelineId: linked.pipelineId
      }),
      internalResponse: isAdminVisible(authContext)
        ? {
            requestId: apiRequestId,
            reasons: reasonCodes,
            linkedPipelineResponse: null,
            riskHints: runtimeError ? { code: runtimeError.code } : undefined
          }
        : undefined,
      linkedObjectIds: linked,
      trace,
      intentResult: null,
      pipelineResult: null,
      sagaResult: null,
      executionResults: [],
      handlerResults: [],
      reasonCodes
    };
  }
}
