import { getAdminReviewRule } from "@/data/alphabet/admin-review-rules";
import { adminReviewFail } from "@/lib/alphabet/admin-review/admin-review-errors";
import {
  assignAdminReviewCase,
  createAdminReviewCase,
  decideAdminReviewCase,
  getAdminReviewCase,
  listAdminReviewCases,
  toAdminReviewCaseDetail,
  toPublicReviewCaseListItem
} from "@/lib/alphabet/admin-review/admin-review-store";
import type {
  CreateAdminReviewCaseBody,
  AdminReviewCasesQuery,
  AssignAdminReviewCaseBody,
  DecideAdminReviewCaseBody
} from "./admin-review-cases.validation";

export async function listAdminReviewCasesService(query: AdminReviewCasesQuery) {
  const rows = await listAdminReviewCases({
    status: query.status,
    assignedReviewerId: query.assignedReviewerId,
    limit: query.limit ?? 50
  });

  return {
    items: rows.map((r) => toPublicReviewCaseListItem(r as Record<string, unknown>))
  };
}

export async function getAdminReviewCaseService(reviewCaseId: string) {
  const row = await getAdminReviewCase(reviewCaseId);
  if (!row) return null;
  return toAdminReviewCaseDetail(row as Record<string, unknown>);
}

export async function createAdminReviewCaseService(params: {
  adminAuthUserId: string;
  body: CreateAdminReviewCaseBody;
}) {
  const rule = getAdminReviewRule(params.body.reviewCaseType);
  if (!rule) {
    adminReviewFail({
      code: "ADMIN_REVIEW_NO_RULE",
      message: "No active admin review rule for this case type.",
      statusCode: 400,
      reasonCodes: ["no_active_admin_review_rule"]
    });
  }

  let actorUserId = params.body.actorUserId ?? null;
  if (rule.requiresActorForManualAction && !actorUserId) {
    actorUserId = params.adminAuthUserId;
  }
  if (rule.requiresActorForManualAction && !actorUserId) {
    adminReviewFail({
      code: "ADMIN_REVIEW_ACTOR_REQUIRED",
      message: "actorUserId is required for this review type.",
      statusCode: 400,
      reasonCodes: ["admin_review_actor_user_required_for_manual_action"]
    });
  }

  return createAdminReviewCase({
    reviewCaseType: params.body.reviewCaseType,
    reviewTrigger: params.body.reviewTrigger,
    userId: params.body.userId ?? null,
    actorUserId,
    walletId: params.body.walletId ?? null,
    contentId: params.body.contentId ?? null,
    campaignId: params.body.campaignId ?? null,
    grantEligibilityId: params.body.grantEligibilityId ?? null,
    externalTransferId: params.body.externalTransferId ?? null,
    compensationId: params.body.compensationId ?? null,
    policyDecisionId: params.body.policyDecisionId ?? null,
    pipelineId: params.body.pipelineId ?? null,
    sagaId: params.body.sagaId ?? null,
    executionRequestId: params.body.executionRequestId ?? null,
    providerReconciliationId: params.body.providerReconciliationId ?? null,
    rawEvidence: params.body.rawEvidence ?? {},
    internalSummary: params.body.internalSummary ?? null,
    severity: params.body.severity,
    priority: params.body.priority,
    dueAt: params.body.dueAt ?? null,
    idempotencyKey: params.body.idempotencyKey ?? null,
    dedupeKey: params.body.dedupeKey ?? null,
    sourceEventIds: params.body.sourceEventIds ?? [],
    safetyScores: params.body.safetyScores ?? undefined,
    metadata: (params.body.metadata ?? {}) as Record<string, unknown>
  });
}

export async function assignAdminReviewCaseService(params: {
  reviewCaseId: string;
  adminAuthUserId: string;
  body: AssignAdminReviewCaseBody;
}) {
  const assignedReviewerId = params.body.assignedReviewerId ?? params.adminAuthUserId;

  return assignAdminReviewCase({
    reviewCaseId: params.reviewCaseId,
    assignedReviewerId,
    assignedTeam: params.body.assignedTeam ?? null
  });
}

export async function decideAdminReviewCaseService(params: {
  reviewCaseId: string;
  adminAuthUserId: string;
  body: DecideAdminReviewCaseBody;
}) {
  return decideAdminReviewCase({
    reviewCaseId: params.reviewCaseId,
    decision: params.body.decision,
    decidedByUserId: params.adminAuthUserId,
    decisionReasonCodes: params.body.decisionReasonCodes,
    decisionNotes: params.body.decisionNotes ?? null,
    safetyScores: params.body.safetyScores ?? undefined
  });
}
