import { z } from "zod";
import { ACTION_INTENT_RULES } from "@/data/alphabet/action-intent-rules";
import type { ActionIntentType } from "@/types/alphabet/action-intent.types";
import type {
  ActionApiAuthContext,
  ActionApiInternalResponse,
  ActionApiLinkedPipelineResponse,
  ActionApiPublicResponse,
  ActionApiRequestPayload,
  ActionApiUserActionType
} from "@/types/alphabet/action-api.types";

const uuidSchema = z.string().uuid();

function findRule(intentType: string | undefined | null) {
  if (!intentType) return undefined;
  return ACTION_INTENT_RULES.find(
    (r) => r.intentType === intentType && r.active
  );
}

function isMonetaryIntent(intentType: string | undefined | null): boolean {
  return Boolean(findRule(intentType)?.monetaryAction);
}

function isAdminIntent(intentType: string | undefined | null): boolean {
  return Boolean(findRule(intentType)?.adminAction);
}

function parseOptionalUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const r = uuidSchema.safeParse(value);
  return r.success ? r.data : null;
}

export interface EvaluateActionApiRequestInput {
  apiRequestId: string;
  method: string;
  endpoint: string;
  requestSource: string;
  requestChannel: string;
  authContext: ActionApiAuthContext;
  payload: ActionApiRequestPayload;
  sanitizedPayload: ActionApiRequestPayload;
  currentStatus: string;
  actionIntentId: string | null;
  pipelineId: string | null;
  idempotencyKey: string | null;
  dedupeKey: string | null;
  duplicateRequestCount: number;
  actionCreated: boolean;
  pipelineCreated: boolean;
  responseRequested: boolean;
  cancelRequested: boolean;
  linkedPipelineResponse: ActionApiLinkedPipelineResponse | null;
}

export interface EvaluateActionApiRequestResult {
  publicResponse: ActionApiPublicResponse;
  internalResponse: ActionApiInternalResponse;
  reasons: string[];
}

function basePublic(
  params: Pick<
    ActionApiPublicResponse,
    | "ok"
    | "status"
    | "actionIntentId"
    | "pipelineId"
    | "allowedToContinue"
    | "requiresUserAction"
    | "userActionType"
    | "message"
    | "requestId"
  >
): ActionApiPublicResponse {
  return { ...params };
}

export function evaluateActionApiRequest(
  input: EvaluateActionApiRequestInput
): EvaluateActionApiRequestResult {
  const reasons: string[] = [];
  const intentType = input.payload.intentType as ActionIntentType | undefined;

  if (input.cancelRequested) {
    reasons.push("api_cancel_requested");
    return {
      reasons,
      publicResponse: basePublic({
        ok: false,
        status: "api_cancelled",
        actionIntentId: input.actionIntentId,
        pipelineId: input.pipelineId,
        allowedToContinue: false,
        requiresUserAction: false,
        userActionType: "none",
        message: "Request was cancelled.",
        requestId: input.apiRequestId
      }),
      internalResponse: {
        requestId: input.apiRequestId,
        reasons,
        linkedPipelineResponse: input.linkedPipelineResponse
      }
    };
  }

  if (input.duplicateRequestCount > 0) {
    reasons.push("api_duplicate_request");
    return {
      reasons,
      publicResponse: basePublic({
        ok: false,
        status: "api_duplicate",
        actionIntentId: input.actionIntentId,
        pipelineId: input.pipelineId,
        allowedToContinue: false,
        requiresUserAction: false,
        userActionType: "retry",
        message: "Duplicate request.",
        requestId: input.apiRequestId
      }),
      internalResponse: {
        requestId: input.apiRequestId,
        reasons,
        linkedPipelineResponse: input.linkedPipelineResponse
      }
    };
  }

  const userId =
    parseOptionalUuid(input.payload.userId ?? undefined) ??
    parseOptionalUuid(input.authContext.authenticatedUserId ?? undefined);

  if (!userId) {
    reasons.push("api_user_id_invalid");
    return {
      reasons,
      publicResponse: basePublic({
        ok: false,
        status: "api_validation_failed",
        actionIntentId: null,
        pipelineId: null,
        allowedToContinue: false,
        requiresUserAction: true,
        userActionType: "authenticate",
        message: "Valid user context is required.",
        requestId: input.apiRequestId
      }),
      internalResponse: {
        requestId: input.apiRequestId,
        reasons,
        linkedPipelineResponse: null
      }
    };
  }

  if (isMonetaryIntent(intentType as string)) {
    if (!input.payload.idempotencyKey?.trim()) {
      reasons.push("api_idempotency_key_required");
      return {
        reasons,
        publicResponse: basePublic({
          ok: false,
          status: "api_validation_failed",
          actionIntentId: null,
          pipelineId: null,
          allowedToContinue: false,
          requiresUserAction: true,
          userActionType: "retry",
          message: "Idempotency key is required for this action.",
          requestId: input.apiRequestId
        }),
        internalResponse: {
          requestId: input.apiRequestId,
          reasons,
          linkedPipelineResponse: null
        }
      };
    }
    if (!input.payload.dedupeKey?.trim()) {
      reasons.push("api_dedupe_key_required");
      return {
        reasons,
        publicResponse: basePublic({
          ok: false,
          status: "api_validation_failed",
          actionIntentId: null,
          pipelineId: null,
          allowedToContinue: false,
          requiresUserAction: true,
          userActionType: "retry",
          message: "Dedupe key is required for this action.",
          requestId: input.apiRequestId
        }),
        internalResponse: {
          requestId: input.apiRequestId,
          reasons,
          linkedPipelineResponse: null
        }
      };
    }
  }

  if (isAdminIntent(intentType as string)) {
    const actor =
      parseOptionalUuid(input.payload.actorUserId ?? undefined) ??
      parseOptionalUuid(input.authContext.actorUserId ?? undefined);
    const source = (input.payload.requestSource ?? "").toLowerCase();
    const adminSource =
      source === "admin" || source === "moderator" || source === "system";
    if (!actor || !adminSource) {
      reasons.push("api_admin_context_required");
      return {
        reasons,
        publicResponse: basePublic({
          ok: false,
          status: "api_forbidden",
          actionIntentId: null,
          pipelineId: null,
          allowedToContinue: false,
          requiresUserAction: true,
          userActionType: "authenticate",
          message: "Admin context is required for this action.",
          requestId: input.apiRequestId
        }),
        internalResponse: {
          requestId: input.apiRequestId,
          reasons,
          linkedPipelineResponse: null
        }
      };
    }
  }

  if (!intentType) {
    reasons.push("api_intent_type_required");
    return {
      reasons,
      publicResponse: basePublic({
        ok: false,
        status: "api_validation_failed",
        actionIntentId: null,
        pipelineId: null,
        allowedToContinue: false,
        requiresUserAction: true,
        userActionType: "retry",
        message: "intentType is required.",
        requestId: input.apiRequestId
      }),
      internalResponse: {
        requestId: input.apiRequestId,
        reasons,
        linkedPipelineResponse: null
      }
    };
  }

  const known = ACTION_INTENT_RULES.some(
    (r) => r.intentType === intentType && r.active
  );
  if (!known) {
    reasons.push("api_unknown_intent_type");
    return {
      reasons,
      publicResponse: basePublic({
        ok: false,
        status: "api_validation_failed",
        actionIntentId: null,
        pipelineId: null,
        allowedToContinue: false,
        requiresUserAction: true,
        userActionType: "retry",
        message: "Unknown intent type.",
        requestId: input.apiRequestId
      }),
      internalResponse: {
        requestId: input.apiRequestId,
        reasons,
        linkedPipelineResponse: null
      }
    };
  }

  if (input.currentStatus === "api_request_created" && !input.actionCreated) {
    reasons.push("api_preflight_ok");
    return {
      reasons,
      publicResponse: basePublic({
        ok: true,
        status: "api_request_validated",
        actionIntentId: null,
        pipelineId: null,
        allowedToContinue: true,
        requiresUserAction: false,
        userActionType: "none",
        message: "Request validated.",
        requestId: input.apiRequestId
      }),
      internalResponse: {
        requestId: input.apiRequestId,
        reasons,
        linkedPipelineResponse: null
      }
    };
  }

  if (input.pipelineCreated && input.linkedPipelineResponse) {
    reasons.push("api_pipeline_ready");
    const lp = input.linkedPipelineResponse;
    const userAction: ActionApiUserActionType = lp.requiresUserAction
      ? lp.userActionType
      : "none";
    return {
      reasons,
      publicResponse: basePublic({
        ok: true,
        status: "api_response_ready",
        actionIntentId: input.actionIntentId,
        pipelineId: lp.pipelineId,
        allowedToContinue: lp.allowedToContinue,
        requiresUserAction: lp.requiresUserAction,
        userActionType: userAction,
        message: lp.publicMessage,
        requestId: input.apiRequestId
      }),
      internalResponse: {
        requestId: input.apiRequestId,
        reasons,
        linkedPipelineResponse: lp
      }
    };
  }

  reasons.push("api_unknown_state");
  return {
    reasons,
    publicResponse: basePublic({
      ok: false,
      status: "api_failed",
      actionIntentId: input.actionIntentId,
      pipelineId: input.pipelineId,
      allowedToContinue: false,
      requiresUserAction: true,
      userActionType: "retry",
      message: "Request could not be processed.",
      requestId: input.apiRequestId
    }),
    internalResponse: {
      requestId: input.apiRequestId,
      reasons,
      linkedPipelineResponse: input.linkedPipelineResponse
    }
  };
}
