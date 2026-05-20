import type {
  TrustFraudFinding,
  TrustFraudReviewCounts,
  TrustFraudReviewScope
} from "@/types/alphabet/trust-fraud-review.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import { evaluateTrustFraudReview } from "./trust-fraud-review-engine";
import {
  getTrustFraudReviewBatchDb,
  insertTrustFraudReviewBatchDb,
  listTrustFraudReviewBatchesDb,
  updateTrustFraudReviewBatchSidecarsDb
} from "../db-repositories/trust-fraud-review.repository";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import { createOperationalAlertFromPartial } from "../operational-alerts/operational-alert-store";
import { createAdminReviewCase } from "../admin-review/admin-review-store";

async function persistEvaluationEvents(events: Array<AlphabetEvent | null | undefined>) {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    if (!event) continue;
    const eventId = String(event.eventId ?? "");
    if (eventId && seen.has(eventId)) continue;
    if (eventId) seen.add(eventId);

    const saved = await insertAlphabetEvent({
      userId: event.userId ?? null,
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
      metadata: (event.metadata ?? {}) as never
    });
    ids.push(saved.event_id);
  }

  return ids;
}

function reviewCaseTypeForFinding(finding: TrustFraudFinding) {
  if (finding.category === "wallet") return "wallet_review";
  if (finding.category === "payout") return "payout_review";
  if (finding.category === "campaign") return "campaign_review";
  if (finding.category === "age_policy") return "policy_review";
  if (finding.category === "identity" || finding.findingType === "sybil_cluster_candidate") {
    return "fraud_review";
  }
  return "manual_admin_action_review";
}

function reviewTriggerForFinding(finding: TrustFraudFinding) {
  if (finding.category === "age_policy") return "policy_requires_review";
  if (finding.category === "identity" || finding.findingType === "sybil_cluster_candidate") {
    return "fraud_risk_above_threshold";
  }
  if (finding.category === "wallet" || finding.category === "payout") return "fraud_risk_above_threshold";
  return "system_uncertainty";
}

export async function createTrustFraudReviewBatch(params: {
  batchScope: TrustFraudReviewScope;
  batchDate: string;
  periodStart: string;
  periodEnd: string;
  batchObjectId: string;
  counts: TrustFraudReviewCounts;
  findings: TrustFraudFinding[];
  sourceEventIds?: string[];
  generatedBy?: string;
  breakdown?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const evaluation = evaluateTrustFraudReview({
    batchScope: params.batchScope,
    batchObjectId: params.batchObjectId,
    batchDate: params.batchDate,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    counts: params.counts,
    findings: params.findings,
    sourceEventIds: params.sourceEventIds ?? [],
    generatedBy: params.generatedBy ?? "scheduled_job",
    now: new Date().toISOString(),
    metadata: (params.metadata ?? {}) as never
  });

  const eventIds = await persistEvaluationEvents([
    evaluation.trustFraudReviewStartedEvent,
    evaluation.trustFraudReviewCompletedEvent,
    evaluation.trustFraudReviewWarningEvent,
    evaluation.trustFraudReviewFailedEvent,
    evaluation.trustFraudReviewCriticalEvent,
    evaluation.trustFraudReviewRequiredEvent
  ]);

  const batch = await insertTrustFraudReviewBatchDb({
    batchId: params.batchObjectId,
    batchScope: params.batchScope,
    status: evaluation.dbStatus,
    severity: evaluation.severity,
    batchDate: params.batchDate,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    counts: params.counts,
    findingCount: evaluation.findingCount,
    criticalFindingCount: evaluation.criticalFindingCount,
    fraudFindingCount: evaluation.fraudFindingCount,
    walletFindingCount: evaluation.walletFindingCount,
    payoutFindingCount: evaluation.payoutFindingCount,
    campaignFindingCount: evaluation.campaignFindingCount,
    identityFindingCount: evaluation.identityFindingCount,
    deviceFindingCount: evaluation.deviceFindingCount,
    rewardFindingCount: evaluation.rewardFindingCount,
    presenceFindingCount: evaluation.presenceFindingCount,
    agePolicyFindingCount: evaluation.agePolicyFindingCount,
    batchRiskScore: evaluation.batchRiskScore,
    batchConfidenceScore: evaluation.batchConfidenceScore,
    actionUrgencyScore: evaluation.actionUrgencyScore,
    findings: params.findings as never,
    recommendedActions: evaluation.recommendedActions as never,
    breakdown: (params.breakdown ?? {}) as never,
    sourceEventIds: eventIds,
    reasonCodes: evaluation.reasons,
    generatedBy: params.generatedBy ?? "scheduled_job",
    metadata: {
      evaluation,
      ...(params.metadata ?? {})
    } as never
  });

  let alert: Awaited<ReturnType<typeof createOperationalAlertFromPartial>> | null = null;
  const reviewCases: Array<Record<string, unknown>> = [];
  const createdAlertIds: string[] = [];
  const createdReviewCaseIds: string[] = [];

  if (evaluation.shouldCreateOperationalAlert) {
    alert = await createOperationalAlertFromPartial({
      alertType: "fraud_freeze_recommended",
      alertSource: "fraud_engine",
      linkedObjectIds: {},
      evidence: {
        batchId: batch.batch_id,
        batchScope: params.batchScope,
        batchDate: params.batchDate,
        findings: params.findings,
        recommendedActions: evaluation.recommendedActions
      },
      redactedEvidence: {
        batchId: batch.batch_id,
        batchScope: params.batchScope,
        batchDate: params.batchDate,
        findingCount: evaluation.findingCount,
        criticalFindingCount: evaluation.criticalFindingCount,
        recommendedActions: evaluation.recommendedActions
      },
      publicSummary: "Daily trust/fraud review detected elevated risk findings.",
      internalSummary: `Trust/fraud review ${evaluation.status}.`,
      sourceEventIds: eventIds,
      riskScores: {
        alertConfidenceScore: evaluation.batchConfidenceScore,
        financialRiskScore: evaluation.payoutFindingCount > 0 || evaluation.walletFindingCount > 0 ? 0.85 : 0.3,
        userImpactScore: evaluation.findingCount > 0 ? 0.7 : 0.2,
        platformRiskScore: evaluation.batchRiskScore,
        exploitabilityScore: Math.max(evaluation.batchRiskScore, evaluation.actionUrgencyScore),
        urgencyScore: evaluation.requiresReview || evaluation.critical ? 0.95 : 0.65,
        recurrenceRiskScore: evaluation.batchRiskScore
      },
      metadata: { batchId: batch.batch_id }
    });

    const alertId = (alert.alert as Record<string, unknown> | undefined)?.alert_id;
    if (alertId) createdAlertIds.push(String(alertId));
    const reviewCaseId = (alert.reviewCase as Record<string, unknown> | undefined)?.review_case_id;
    if (reviewCaseId) createdReviewCaseIds.push(String(reviewCaseId));
  }

  if (evaluation.shouldCreateReviewCase) {
    const criticalFindings = params.findings.filter((finding) => finding.severity === "critical").slice(0, 25);
    for (const finding of criticalFindings) {
      const result = await createAdminReviewCase({
        reviewCaseType: reviewCaseTypeForFinding(finding),
        reviewTrigger: reviewTriggerForFinding(finding),
        userId: finding.linkedObjectIds.userId ?? null,
        walletId: finding.linkedObjectIds.walletId ?? null,
        campaignId: finding.linkedObjectIds.campaignId ?? null,
        externalTransferId: finding.linkedObjectIds.externalTransferId ?? null,
        compensationId: null,
        policyDecisionId: finding.linkedObjectIds.policyDecisionId ?? null,
        executionRequestId: null,
        pipelineId: null,
        sagaId: null,
        rawEvidence: {
          batchId: batch.batch_id,
          finding
        },
        internalSummary: `Critical trust/fraud finding: ${finding.findingType}.`,
        severity: "critical",
        priority: "urgent",
        idempotencyKey: `trust-fraud-review:${batch.batch_id}:${finding.findingId}`,
        dedupeKey: `trust-fraud-review:${finding.findingType}:${finding.linkedObjectIds.userId ?? finding.linkedObjectIds.walletId ?? finding.linkedObjectIds.campaignId ?? finding.findingId}`,
        sourceEventIds: eventIds,
        metadata: {
          batchId: batch.batch_id,
          findingId: finding.findingId,
          recommendedActions: finding.recommendedActions
        }
      });
      reviewCases.push(result.case as Record<string, unknown>);
      createdReviewCaseIds.push(String((result.case as Record<string, unknown>).review_case_id));
    }
  }

  if (createdAlertIds.length || createdReviewCaseIds.length) {
    await updateTrustFraudReviewBatchSidecarsDb({
      batchId: String(batch.batch_id),
      createdAlertIds,
      createdReviewCaseIds
    });
  }

  return {
    batch,
    evaluation,
    eventIds,
    alert,
    reviewCases
  };
}

export async function listTrustFraudReviewBatches(params?: {
  status?: string | null;
  severity?: string | null;
  batchScope?: string | null;
  limit?: number;
}) {
  return listTrustFraudReviewBatchesDb(params);
}

export async function getTrustFraudReviewBatch(batchId: string) {
  return getTrustFraudReviewBatchDb(batchId);
}
