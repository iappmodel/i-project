import type { ActionApiRequestPayload } from "@/types/alphabet/action-api.types";
import type { RuntimeAuditDraft } from "@/types/alphabet/runtime.types";

export function buildAuditDraft(params: {
  payload: ActionApiRequestPayload;
  userId: string;
  actorUserId?: string | null;
  policyDecisionId?: string | null;
  executionRequestId?: string | null;
  sagaId?: string | null;
  pipelineId?: string | null;
  sourceEventIds: string[];
  reasonCodes: string[];
}): RuntimeAuditDraft {
  return {
    auditType: `runtime:${params.payload.intentType ?? "unknown"}`,
    status: "created",
    userId: params.userId,
    actorUserId: params.actorUserId ?? null,
    walletId: params.payload.walletId ?? null,
    contentId: params.payload.contentId ?? null,
    campaignId: params.payload.campaignId ?? null,
    policyDecisionId: params.policyDecisionId ?? null,
    executionRequestId: params.executionRequestId ?? null,
    sagaId: params.sagaId ?? null,
    pipelineId: params.pipelineId ?? null,
    sourceEventIds: params.sourceEventIds,
    publicSummary: "Action reviewed by platform systems.",
    internalSummary: "Runtime audit record created for action pipeline.",
    evidence: {
      intentType: params.payload.intentType,
      reasonCodes: params.reasonCodes
    },
    redactedEvidence: {
      intentType: params.payload.intentType
    },
    riskSummary: {
      reasonCodes: params.reasonCodes
    },
    metadata: {
      source: "pipeline_runtime"
    }
  };
}
