import type { Json } from "@/types/alphabet/database.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  AdminReviewCaseType,
  AdminReviewDecision,
  AdminReviewPriority,
  AdminReviewSafetyScores,
  AdminReviewSeverity,
  AdminReviewSignalInput,
  AdminReviewStatus,
  AdminReviewTrigger
} from "@/types/alphabet/admin-review.types";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import {
  assignAdminReviewCaseDb,
  getAdminReviewCaseByIdempotencyKeyDb,
  getAdminReviewCaseDb,
  insertAdminReviewCaseDb,
  listAdminReviewCasesDb,
  updateAdminReviewCaseStatusDb,
  updateAdminReviewDecisionDb
} from "../db-repositories/admin-review.repository";
import { evaluateAdminReview } from "./admin-review-engine";
import { adminReviewFail } from "./admin-review-errors";
import { redactEvidence, buildPublicSummary } from "./evidence-redactor";
import { applyReviewDecision } from "./review-decision-applier";

function mergeMetadata(existing: unknown, patch: Record<string, unknown>): Json {
  const a =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...a, ...patch } as Json;
}

function defaultScores(overrides?: Partial<AdminReviewSafetyScores>): AdminReviewSafetyScores {
  return {
    evidenceCompletenessScore: overrides?.evidenceCompletenessScore ?? 0.9,
    reviewerAuthorityScore: overrides?.reviewerAuthorityScore ?? 0.9,
    decisionConfidenceScore: overrides?.decisionConfidenceScore ?? 0.9,
    downstreamSafetyScore: overrides?.downstreamSafetyScore ?? 0.9,
    userImpactScore: overrides?.userImpactScore ?? 0.5,
    platformRiskScore: overrides?.platformRiskScore ?? 0.1
  };
}

async function persistAlphabetEventFromEvaluation(event: AlphabetEvent): Promise<string> {
  const saved = await insertAlphabetEvent({
    userId: event.userId,
    coinCode: event.coinCode ?? null,
    eventType: event.eventType,
    objectType: event.objectType ?? null,
    objectId: event.objectId ?? null,
    sourceContext: event.sourceContext,
    rawScore: event.rawScore ?? null,
    qualityScore: event.qualityScore ?? null,
    trustScoreAtEvent: event.trustScoreAtEvent ?? null,
    riskScore: event.riskScore ?? null,
    ageBand: event.ageBand ?? null,
    verificationStatus: event.verificationStatus,
    metadata: (event.metadata ?? {}) as Json
  });

  return saved.event_id;
}

async function persistEvaluationEvents(events: Array<AlphabetEvent | null | undefined>): Promise<string[]> {
  const ids: string[] = [];
  for (const event of events) {
    if (!event) continue;
    ids.push(await persistAlphabetEventFromEvaluation(event));
  }
  return ids;
}

function mapInitialEngineOutcomeToDbStatus(outcome: string): AdminReviewStatus {
  switch (outcome) {
    case "review_requires_more_info":
      return "review_needs_more_info";
    case "review_ready":
    case "review_requires_assignment":
      return "review_queued";
    default:
      return "review_created";
  }
}

function mapDecideEngineOutcomeToDbStatus(
  outcome: string,
  decision: AdminReviewDecision | null | undefined
): AdminReviewStatus {
  switch (outcome) {
    case "review_canceled":
      return "review_canceled";
    case "review_closed":
      return "review_closed";
    case "review_escalation_required":
      return "review_escalated";
    case "review_requires_more_info":
      return "review_needs_more_info";
    case "review_decision_blocked":
      return "review_rejected";
    case "review_decision_allowed":
      if (decision === "request_more_info") {
        return "review_needs_more_info";
      }
      return "review_approved";
    default:
      return "review_created";
  }
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function safetyScoresPartialFromRow(value: unknown): Partial<AdminReviewSafetyScores> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Partial<AdminReviewSafetyScores>;
  }
  return {};
}

function rowToSignalInput(
  row: Record<string, unknown>,
  overrides: Partial<AdminReviewSignalInput>
): AdminReviewSignalInput {
  const safety =
    row.safety_scores &&
    typeof row.safety_scores === "object" &&
    !Array.isArray(row.safety_scores)
      ? (row.safety_scores as AdminReviewSafetyScores)
      : defaultScores();

  return {
    reviewCaseId: String(row.review_case_id),
    reviewCaseType: row.review_case_type as AdminReviewSignalInput["reviewCaseType"],
    reviewTrigger: row.review_trigger as AdminReviewSignalInput["reviewTrigger"],
    currentStatus: row.status as AdminReviewSignalInput["currentStatus"],
    decision: (row.decision as AdminReviewDecision | null) ?? null,

    subjectIds: {
      userId: (row.user_id as string | null) ?? null,
      actorUserId: (row.actor_user_id as string | null) ?? null,
      walletId: (row.wallet_id as string | null) ?? null,
      contentId: (row.content_id as string | null) ?? null,
      campaignId: (row.campaign_id as string | null) ?? null,
      grantEligibilityId: (row.grant_eligibility_id as string | null) ?? null,
      externalTransferId: (row.external_transfer_id as string | null) ?? null,
      compensationId: (row.compensation_id as string | null) ?? null,
      policyDecisionId: (row.policy_decision_id as string | null) ?? null,
      pipelineId: (row.pipeline_id as string | null) ?? null,
      sagaId: (row.saga_id as string | null) ?? null,
      executionRequestId: (row.execution_request_id as string | null) ?? null,
      providerReconciliationId: (row.provider_reconciliation_id as string | null) ?? null
    },

    rawEvidence: (row.raw_evidence as Json) ?? {},
    redactedEvidence: (row.redacted_evidence as Json) ?? {},
    publicSummary: (row.public_summary as string | null) ?? null,
    internalSummary: (row.internal_summary as string | null) ?? null,

    assignedReviewerId: (row.assigned_reviewer_id as string | null) ?? null,
    assignedTeam: (row.assigned_team as string | null) ?? null,

    decidedByUserId: (row.decided_by_user_id as string | null) ?? null,
    decisionReasonCodes: coerceStringArray(row.decision_reason_codes),
    decisionNotes: (row.decision_notes as string | null) ?? null,

    severity: (row.severity as AdminReviewSeverity) ?? "medium",
    priority: (row.priority as AdminReviewPriority) ?? "normal",

    dueAt: (row.due_at as string | null) ?? null,
    breachedAt: (row.breached_at as string | null) ?? null,

    idempotencyKey: (row.idempotency_key as string | null) ?? null,
    dedupeKey: (row.dedupe_key as string | null) ?? null,

    sourceEventIds: coerceStringArray(row.source_event_ids),

    safetyScores: safety,

    assignmentRequested: false,
    reviewStarted: false,
    moreInfoRequested: false,
    decisionSubmitted: false,
    closeRequested: false,
    cancelRequested: false,

    now: new Date().toISOString(),
    metadata: (row.metadata as Json) ?? {},
    ...overrides
  };
}

export async function createAdminReviewCase(params: {
  reviewCaseType: AdminReviewCaseType;
  reviewTrigger: AdminReviewTrigger;

  userId?: string | null;
  actorUserId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  providerReconciliationId?: string | null;

  rawEvidence?: Record<string, unknown>;
  /** Pre-redacted or partial evidence; still passed through `redactEvidence` for defense in depth. */
  redactedEvidence?: Json | Record<string, unknown> | null;
  internalSummary?: string | null;
  /** When set (e.g. auto-hooks), overrides `buildPublicSummary`. */
  publicSummary?: string | null;

  severity?: AdminReviewSeverity;
  priority?: AdminReviewPriority;

  dueAt?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds?: string[];

  safetyScores?: Partial<AdminReviewSafetyScores>;
  metadata?: Record<string, unknown>;
}) {
  if (params.idempotencyKey) {
    const dup = await getAdminReviewCaseByIdempotencyKeyDb(params.idempotencyKey);
    if (dup) {
      const evaluation = evaluateAdminReview(
        rowToSignalInput(dup as Record<string, unknown>, {
          assignmentRequested: false,
          reviewStarted: false,
          moreInfoRequested: false,
          decisionSubmitted: false,
          closeRequested: false,
          cancelRequested: false,
          now: new Date().toISOString()
        })
      );
      return { deduped: true as const, case: dup, evaluation, eventIds: [] as string[] };
    }
  }

  const rawEvidence = params.rawEvidence ?? {};
  const redactedEvidence =
    params.redactedEvidence !== undefined && params.redactedEvidence !== null
      ? redactEvidence(params.redactedEvidence as Json)
      : redactEvidence(rawEvidence as Json);

  const publicSummary =
    params.publicSummary ??
    buildPublicSummary({
      reviewCaseType: params.reviewCaseType,
      reviewTrigger: params.reviewTrigger,
      severity: params.severity ?? "medium"
    });

  const scores = defaultScores(params.safetyScores);

  const seed = await insertAdminReviewCaseDb({
    reviewCaseType: params.reviewCaseType,
    reviewTrigger: params.reviewTrigger,
    status: "review_created",

    userId: params.userId ?? null,
    actorUserId: params.actorUserId ?? null,
    walletId: params.walletId ?? null,
    contentId: params.contentId ?? null,
    campaignId: params.campaignId ?? null,
    grantEligibilityId: params.grantEligibilityId ?? null,
    externalTransferId: params.externalTransferId ?? null,
    compensationId: params.compensationId ?? null,
    policyDecisionId: params.policyDecisionId ?? null,
    pipelineId: params.pipelineId ?? null,
    sagaId: params.sagaId ?? null,
    executionRequestId: params.executionRequestId ?? null,
    providerReconciliationId: params.providerReconciliationId ?? null,

    rawEvidence: rawEvidence as Json,
    redactedEvidence: redactedEvidence as Json,
    publicSummary,
    internalSummary: params.internalSummary ?? null,

    severity: params.severity ?? "medium",
    priority: params.priority ?? "normal",
    dueAt: params.dueAt ?? null,

    idempotencyKey: params.idempotencyKey ?? null,
    dedupeKey: params.dedupeKey ?? null,

    sourceEventIds: params.sourceEventIds ?? [],
    safetyScores: scores as unknown as Json,
    metadata: (params.metadata ?? {}) as Json
  });

  const row = seed as Record<string, unknown>;

  const evaluation = evaluateAdminReview(
    rowToSignalInput(row, {
      rawEvidence: rawEvidence as Json,
      redactedEvidence: redactedEvidence as Json,
      publicSummary,
      internalSummary: params.internalSummary ?? null,
      safetyScores: scores,
      assignmentRequested: false,
      reviewStarted: false,
      moreInfoRequested: false,
      decisionSubmitted: false,
      closeRequested: false,
      cancelRequested: false,
      now: new Date().toISOString(),
      metadata: mergeMetadata(params.metadata, {})
    })
  );

  const nextStatus = mapInitialEngineOutcomeToDbStatus(evaluation.status);

  const updated =
    nextStatus !== "review_created"
      ? await updateAdminReviewCaseStatusDb({
          reviewCaseId: String(row.review_case_id),
          status: nextStatus,
          metadata: mergeMetadata(row.metadata, {
            lastEvaluation: {
              status: evaluation.status,
              reasons: evaluation.reasons,
              reviewReadinessScore: evaluation.reviewReadinessScore,
              decisionSafetyScore: evaluation.decisionSafetyScore
            }
          })
        })
      : seed;

  const eventIds = await persistEvaluationEvents([
    evaluation.adminReviewCreatedEvent,
    evaluation.adminReviewQueuedEvent,
    evaluation.adminReviewMoreInfoRequestedEvent
  ]);

  return {
    deduped: false as const,
    case: updated,
    evaluation,
    eventIds
  };
}

export async function listAdminReviewCases(params?: {
  status?: string;
  assignedReviewerId?: string;
  limit?: number;
}) {
  return listAdminReviewCasesDb(params);
}

export async function getAdminReviewCase(reviewCaseId: string) {
  return getAdminReviewCaseDb(reviewCaseId);
}

export async function assignAdminReviewCase(params: {
  reviewCaseId: string;
  assignedReviewerId: string;
  assignedTeam?: string | null;
}) {
  const updated = await assignAdminReviewCaseDb(params);

  const evaluation = evaluateAdminReview(
    rowToSignalInput(updated as Record<string, unknown>, {
      assignedReviewerId: params.assignedReviewerId,
      assignedTeam: params.assignedTeam ?? null,
      reviewStarted: false,
      assignmentRequested: false,
      moreInfoRequested: false,
      decisionSubmitted: false,
      now: new Date().toISOString()
    })
  );

  const eventIds = await persistEvaluationEvents([evaluation.adminReviewAssignedEvent]);

  return {
    case: updated,
    evaluation,
    eventIds
  };
}

export async function decideAdminReviewCase(params: {
  reviewCaseId: string;
  decision: AdminReviewDecision;
  decidedByUserId: string;
  decisionReasonCodes: string[];
  decisionNotes?: string | null;
  safetyScores?: Partial<AdminReviewSafetyScores>;
}) {
  const existing = await getAdminReviewCaseDb(params.reviewCaseId);
  if (!existing) {
    adminReviewFail({
      code: "ADMIN_REVIEW_NOT_FOUND",
      message: "Review case not found.",
      statusCode: 404
    });
  }

  const row = existing as Record<string, unknown>;

  const scores = defaultScores({
    ...safetyScoresPartialFromRow(row.safety_scores),
    ...(params.safetyScores ?? {})
  });

  const evaluation = evaluateAdminReview(
    rowToSignalInput(row, {
      decision: params.decision,
      decidedByUserId: params.decidedByUserId,
      decisionReasonCodes: params.decisionReasonCodes,
      decisionNotes: params.decisionNotes ?? null,
      safetyScores: scores,
      assignmentRequested: false,
      reviewStarted: true,
      moreInfoRequested: params.decision === "request_more_info",
      decisionSubmitted: true,
      closeRequested: false,
      cancelRequested: params.decision === "cancel_case",
      now: new Date().toISOString()
    })
  );

  const nextStatus = mapDecideEngineOutcomeToDbStatus(evaluation.status, params.decision);

  const updated = await updateAdminReviewDecisionDb({
    reviewCaseId: String(row.review_case_id),
    status: nextStatus,
    decision: params.decision,
    decidedByUserId: params.decidedByUserId,
    decisionReasonCodes: params.decisionReasonCodes,
    decisionNotes: params.decisionNotes ?? null,
    metadata: mergeMetadata(row.metadata, {
      lastEvaluation: {
        status: evaluation.status,
        reasons: evaluation.reasons,
        reviewReadinessScore: evaluation.reviewReadinessScore,
        decisionSafetyScore: evaluation.decisionSafetyScore
      }
    })
  });

  const eventIds = await persistEvaluationEvents([
    evaluation.adminReviewApprovedEvent,
    evaluation.adminReviewRejectedEvent,
    evaluation.adminReviewEscalatedEvent,
    evaluation.adminReviewMoreInfoRequestedEvent,
    evaluation.adminReviewClosedEvent,
    evaluation.adminReviewCanceledEvent
  ]);

  const applied = await applyReviewDecision({
    reviewCase: updated as Record<string, unknown>,
    evaluation,
    decision: params.decision,
    decidedByUserId: params.decidedByUserId,
    decisionReasonCodes: params.decisionReasonCodes
  });

  return {
    case: updated,
    evaluation,
    applied,
    eventIds
  };
}

export function toPublicReviewCaseListItem(row: Record<string, unknown>): Record<string, unknown> {
  const { raw_evidence: _raw, internal_summary: _int, decision_notes: _notes, ...rest } = row;
  return rest;
}

/** Admin API detail: never exposes `raw_evidence` (service-role / break-glass DB access only). */
export function toAdminReviewCaseDetail(row: Record<string, unknown>): Record<string, unknown> {
  const { raw_evidence: _raw, ...rest } = row;
  return rest;
}
