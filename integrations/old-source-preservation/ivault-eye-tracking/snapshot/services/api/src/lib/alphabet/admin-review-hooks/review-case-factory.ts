import type {
  AdminReviewHookEvaluationResult,
  AdminReviewHookInput
} from "@/types/alphabet/admin-review-hooks.types";
import type { AdminReviewSafetyScores } from "@/types/alphabet/admin-review.types";
import type { Json } from "@/types/alphabet/database.types";
import { redactEvidence } from "../admin-review/evidence-redactor";

export function buildReviewCaseParamsFromHook(params: {
  input: AdminReviewHookInput;
  evaluation: AdminReviewHookEvaluationResult;
}) {
  const { input, evaluation } = params;

  if (!evaluation.reviewCaseType || !evaluation.reviewTrigger) {
    throw new Error("Review case type and trigger are required.");
  }

  const redactedEvidence =
    input.redactedEvidence !== undefined && input.redactedEvidence !== null
      ? (input.redactedEvidence as Json)
      : (redactEvidence(input.rawEvidence as never) as Json);

  const safetyScores: Partial<AdminReviewSafetyScores> = {
    evidenceCompletenessScore: input.sourceEventIds.length > 0 ? 0.9 : 0.75,
    reviewerAuthorityScore: 0.9,
    decisionConfidenceScore: 0.85,
    downstreamSafetyScore:
      input.paymentUncertainty || input.moneyMovementPossible ? 0.82 : 0.9,
    userImpactScore: input.userImpactScore,
    platformRiskScore: input.platformImpactScore
  };

  return {
    reviewCaseType: evaluation.reviewCaseType,
    reviewTrigger: evaluation.reviewTrigger,

    userId: input.subjectIds.userId ?? null,
    actorUserId: input.subjectIds.actorUserId ?? null,
    walletId: input.subjectIds.walletId ?? null,
    contentId: input.subjectIds.contentId ?? null,
    campaignId: input.subjectIds.campaignId ?? null,
    grantEligibilityId: input.subjectIds.grantEligibilityId ?? null,
    externalTransferId: input.subjectIds.externalTransferId ?? null,
    compensationId: input.subjectIds.compensationId ?? null,
    policyDecisionId: input.subjectIds.policyDecisionId ?? null,
    pipelineId: input.subjectIds.pipelineId ?? null,
    sagaId: input.subjectIds.sagaId ?? null,
    executionRequestId: input.subjectIds.executionRequestId ?? null,
    providerReconciliationId: input.subjectIds.providerReconciliationId ?? null,

    rawEvidence: input.rawEvidence as Record<string, unknown>,
    redactedEvidence: redactedEvidence as Record<string, unknown>,
    publicSummary: input.publicSummary ?? null,

    internalSummary:
      input.internalSummary ??
      `Auto-created by ${input.hookSource} for ${input.hookTrigger}.`,

    severity: evaluation.severity,
    priority: evaluation.priority,
    dueAt: evaluation.dueAt ?? null,

    idempotencyKey: evaluation.idempotencyKey,
    dedupeKey: evaluation.dedupeKey,

    sourceEventIds: input.sourceEventIds,
    safetyScores,

    metadata: {
      hookSource: input.hookSource,
      hookTrigger: input.hookTrigger,
      sourceObjectType: input.sourceObjectType,
      sourceObjectId: input.sourceObjectId,
      hookRiskScore: evaluation.hookRiskScore,
      reviewNecessityScore: evaluation.reviewNecessityScore,
      duplicateCaseRisk: evaluation.duplicateCaseRisk,
      hookReasons: evaluation.reasons,
      ...(input.metadata as Record<string, unknown> | undefined)
    }
  };
}
