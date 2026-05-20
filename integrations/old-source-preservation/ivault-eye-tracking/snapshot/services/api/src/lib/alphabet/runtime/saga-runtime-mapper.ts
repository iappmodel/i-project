import type { ActionIntentEvaluationResult } from "@/types/alphabet/action-intent.types";
import type { RuntimeSagaDraft } from "@/types/alphabet/runtime.types";

export function buildSagaDraftFromIntent(params: {
  intent: ActionIntentEvaluationResult;
  policyDecisionId?: string | null;
  sourceEventIds: string[];
  idempotencyKey?: string | null;
}): RuntimeSagaDraft {
  return {
    sagaType: params.intent.sagaRequest.sagaType,
    userId: params.intent.userId,
    walletId: params.intent.walletId ?? null,
    contentId: params.intent.contentId ?? null,
    campaignId: params.intent.campaignId ?? null,
    grantEligibilityId: params.intent.grantEligibilityId ?? null,
    sourceActionIntentId: params.intent.actionIntentId,
    policyDecisionId: params.policyDecisionId ?? null,
    idempotencyKey: params.idempotencyKey ?? null,
    sourceEventIds: params.sourceEventIds
  };
}

export function buildDefaultSagaSteps(params: {
  requiresPolicy: boolean;
  requiresExecution: boolean;
  requiresHandlerValidation: boolean;
  requiresAudit: boolean;
  requiresNotification: boolean;
}): Array<{
  stepType: string;
  status: string;
  label: string;
  dependsOnStepIds: string[];
  compensationRequired: boolean;
  compensationAction?: string | null;
}> {
  const steps: Array<{
    stepType: string;
    status: string;
    label: string;
    dependsOnStepIds: string[];
    compensationRequired: boolean;
    compensationAction?: string | null;
  }> = [];

  if (params.requiresPolicy) {
    steps.push({
      stepType: "policy",
      status: "passed",
      label: "Policy decision",
      dependsOnStepIds: [],
      compensationRequired: false
    });
  }

  if (params.requiresHandlerValidation) {
    steps.push({
      stepType: "handler_validation",
      status: "pending",
      label: "Handler validation",
      dependsOnStepIds: [],
      compensationRequired: false
    });
  }

  if (params.requiresExecution) {
    steps.push({
      stepType: "execution",
      status: "pending",
      label: "Execution request",
      dependsOnStepIds: [],
      compensationRequired: true,
      compensationAction: "review_and_reverse_if_needed"
    });
  }

  if (params.requiresAudit) {
    steps.push({
      stepType: "audit",
      status: "pending",
      label: "Audit record",
      dependsOnStepIds: [],
      compensationRequired: false
    });
  }

  if (params.requiresNotification) {
    steps.push({
      stepType: "notification",
      status: "pending",
      label: "Notification",
      dependsOnStepIds: [],
      compensationRequired: false
    });
  }

  steps.push({
    stepType: "finalization",
    status: "pending",
    label: "Finalization",
    dependsOnStepIds: [],
    compensationRequired: false
  });

  return steps;
}
