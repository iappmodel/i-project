import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { Json } from "@/types/alphabet/database.types";
import type { OperationalAlertType } from "@/types/alphabet/operational-alert.types";
import type { StuckSagaSignalInput } from "@/types/alphabet/stuck-saga.types";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import {
  insertStuckSagaResultDb,
  updateStuckSagaResultSidecarsDb
} from "../db-repositories/stuck-saga.repository";
import { createOperationalAlertFromPartial } from "../operational-alerts/operational-alert-store";
import { createAdminReviewCase } from "../admin-review/admin-review-store";
import { evaluateStuckSaga } from "./stuck-saga-engine";

async function persistEvaluationEvents(
  events: Array<AlphabetEvent | null | undefined>
): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const ev of events) {
    if (!ev) continue;
    if (seen.has(ev.eventId)) continue;
    seen.add(ev.eventId);

    const saved = await insertAlphabetEvent({
      userId: ev.userId,
      coinCode: ev.coinCode ?? null,
      eventType: ev.eventType,
      objectType: ev.objectType ?? null,
      objectId: ev.objectId ?? null,
      sourceContext: ev.sourceContext,
      rawScore: ev.rawScore ?? null,
      qualityScore: ev.qualityScore ?? null,
      trustScoreAtEvent: ev.trustScoreAtEvent ?? null,
      riskScore: ev.riskScore ?? null,
      ageBand: ev.ageBand ?? null,
      verificationStatus: ev.verificationStatus,
      metadata: (ev.metadata ?? {}) as Json
    });

    ids.push(saved.event_id);
  }

  return ids;
}

function alertTypeForStuckSaga(stuckType: string): OperationalAlertType {
  if (
    stuckType.includes("dead_lettered") ||
    stuckType.includes("retry_exhausted")
  ) {
    return "worker_dead_lettered";
  }

  if (
    stuckType.includes("external_transfer") ||
    stuckType.includes("provider") ||
    stuckType.includes("money")
  ) {
    return "payout_stuck_pending";
  }

  return "audit_risk_high";
}

export async function evaluateAndPersistStuckSaga(input: StuckSagaSignalInput) {
  const evaluation = evaluateStuckSaga(input);

  const eventIds = await persistEvaluationEvents([
    evaluation.stuckSagaScanStartedEvent,
    evaluation.stuckSagaPassedEvent,
    evaluation.stuckSagaWarningEvent,
    evaluation.stuckSagaFailedEvent,
    evaluation.stuckSagaCriticalEvent,
    evaluation.stuckSagaScanCompletedEvent
  ]);

  const resultRow = await insertStuckSagaResultDb({
    stuckType: input.stuckType,
    scanScope: input.scanScope,
    status: evaluation.dbStatus,
    severity: evaluation.severity,

    userId: input.linkedObjectIds.userId ?? null,
    walletId: input.linkedObjectIds.walletId ?? null,
    walletAccountId: input.linkedObjectIds.walletAccountId ?? null,

    sagaId: input.linkedObjectIds.sagaId ?? null,
    pipelineId: input.linkedObjectIds.pipelineId ?? null,
    executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
    policyDecisionId: input.linkedObjectIds.policyDecisionId ?? null,

    ledgerEntryId: input.linkedObjectIds.ledgerEntryId ?? null,
    externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
    providerReconciliationId: input.linkedObjectIds.providerReconciliationId ?? null,
    compensationId: input.linkedObjectIds.compensationId ?? null,
    reviewCaseId: input.linkedObjectIds.reviewCaseId ?? null,

    startedAt: input.timing.startedAt ?? null,
    updatedAt: input.timing.updatedAt ?? null,
    lastProgressAt: input.timing.lastProgressAt ?? null,

    ageSeconds: input.timing.ageSeconds,
    staleSeconds: input.timing.staleSeconds,
    maxAllowedAgeSeconds: input.timing.maxAllowedAgeSeconds,
    maxAllowedStaleSeconds: input.timing.maxAllowedStaleSeconds,

    internalDebitAmount: input.moneyExposure.internalDebitAmount,
    externalTransferAmount: input.moneyExposure.externalTransferAmount,
    pendingAmount: input.moneyExposure.pendingAmount,
    unknownAmount: input.moneyExposure.unknownAmount,
    compensationAmount: input.moneyExposure.compensationAmount,
    exposureAmount: input.moneyExposure.exposureAmount,

    riskScores: input.riskScores as unknown as Json,
    evidence: input.evidence,
    redactedEvidence: input.redactedEvidence,
    sourceEventIds: eventIds,
    createdAlertIds: [],
    createdReviewCaseIds: [],
    reasonCodes: evaluation.reasons,
    metadata: {
      stuckSeverityScore: evaluation.stuckSeverityScore,
      stuckConfidenceScore: evaluation.stuckConfidenceScore,
      outcomeStatus: evaluation.status,
      stuckType: input.stuckType
    } as Json
  });

  const stuckSagaResultId = String(
    (resultRow as Record<string, unknown>).stuck_saga_result_id
  );

  let operationalAlert: Awaited<
    ReturnType<typeof createOperationalAlertFromPartial>
  > | null = null;
  let extraReviewCase: Record<string, unknown> | null = null;
  const createdAlertIds: string[] = [];
  const createdReviewCaseIds: string[] = [];

  if (evaluation.shouldCreateOperationalAlert) {
    operationalAlert = await createOperationalAlertFromPartial({
      alertType: alertTypeForStuckSaga(input.stuckType),
      alertSource: "scheduled_scanner",
      linkedObjectIds: {
        userId: input.linkedObjectIds.userId ?? null,
        walletId: input.linkedObjectIds.walletId ?? null,
        walletAccountId: input.linkedObjectIds.walletAccountId ?? null,
        ledgerEntryId: input.linkedObjectIds.ledgerEntryId ?? null,
        externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
        compensationId: input.linkedObjectIds.compensationId ?? null,
        reviewCaseId: input.linkedObjectIds.reviewCaseId ?? null,
        policyDecisionId: input.linkedObjectIds.policyDecisionId ?? null,
        pipelineId: input.linkedObjectIds.pipelineId ?? null,
        sagaId: input.linkedObjectIds.sagaId ?? null,
        executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
        providerReconciliationId: input.linkedObjectIds.providerReconciliationId ?? null
      },
      evidence: {
        stuckSagaResultId,
        stuckType: input.stuckType,
        timing: input.timing,
        moneyExposure: input.moneyExposure,
        evidence: input.evidence
      },
      redactedEvidence: {
        stuckSagaResultId,
        stuckType: input.stuckType,
        timing: input.timing,
        moneyExposure: input.moneyExposure
      },
      publicSummary: "Stuck orchestration flow detected.",
      internalSummary: `Stuck saga scanner detected ${input.stuckType}.`,
      sourceEventIds: eventIds,
      riskScores: {
        alertConfidenceScore: input.riskScores.confidenceScore,
        financialRiskScore: input.riskScores.financialExposureScore,
        userImpactScore: input.riskScores.userImpactScore,
        platformRiskScore: input.riskScores.platformImpactScore,
        exploitabilityScore: 0.25,
        urgencyScore: evaluation.critical ? 0.95 : 0.7,
        recurrenceRiskScore: input.riskScores.orchestrationRiskScore
      },
      metadata: {
        stuckSagaResultId,
        severity: evaluation.severity,
        stuckType: input.stuckType
      }
    });

    const alertRow = operationalAlert.alert as Record<string, unknown> | null | undefined;
    if (alertRow?.alert_id) {
      createdAlertIds.push(String(alertRow.alert_id));
    }
    const opReview = operationalAlert.reviewCase as Record<string, unknown> | null | undefined;
    if (opReview?.review_case_id) {
      createdReviewCaseIds.push(String(opReview.review_case_id));
    }
  }

  if (
    evaluation.shouldCreateReviewCase &&
    !(operationalAlert?.reviewCase &&
      (operationalAlert.reviewCase as Record<string, unknown>)?.review_case_id)
  ) {
    const reviewResult = await createAdminReviewCase({
      reviewCaseType:
        input.moneyMovementAffected || input.providerAffected
          ? "external_transfer_review"
          : "manual_admin_action_review",
      reviewTrigger:
        input.providerAffected || input.moneyMovementAffected
          ? "external_transfer_unknown"
          : "system_uncertainty",
      userId: input.linkedObjectIds.userId ?? null,
      walletId: input.linkedObjectIds.walletId ?? null,
      externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
      compensationId: input.linkedObjectIds.compensationId ?? null,
      policyDecisionId: input.linkedObjectIds.policyDecisionId ?? null,
      pipelineId: input.linkedObjectIds.pipelineId ?? null,
      sagaId: input.linkedObjectIds.sagaId ?? null,
      executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
      providerReconciliationId: input.linkedObjectIds.providerReconciliationId ?? null,
      rawEvidence: {
        stuckSagaResultId,
        stuckType: input.stuckType,
        evidence: input.evidence,
        timing: input.timing,
        moneyExposure: input.moneyExposure
      },
      internalSummary: `Critical stuck orchestration flow: ${input.stuckType}.`,
      severity: "critical",
      priority: "urgent",
      idempotencyKey: `stuck-saga-review:${stuckSagaResultId}`,
      dedupeKey: `stuck-saga-review:${input.stuckType}:${input.linkedObjectIds.sagaId ?? input.linkedObjectIds.executionRequestId ?? input.linkedObjectIds.externalTransferId ?? "unknown"}`,
      sourceEventIds: eventIds,
      metadata: {
        stuckSagaResultId
      }
    });
    extraReviewCase = reviewResult.case as Record<string, unknown>;
    if (extraReviewCase?.review_case_id) {
      createdReviewCaseIds.push(String(extraReviewCase.review_case_id));
    }
  }

  const opReviewCase = operationalAlert?.reviewCase as
    | { review_case_id?: string }
    | undefined;
  const primaryReviewCaseId =
    (extraReviewCase?.review_case_id as string | undefined) ??
    opReviewCase?.review_case_id ??
    input.linkedObjectIds.reviewCaseId ??
    null;

  if (createdAlertIds.length > 0 || createdReviewCaseIds.length > 0 || primaryReviewCaseId) {
    await updateStuckSagaResultSidecarsDb({
      stuckSagaResultId,
      createdAlertIds,
      createdReviewCaseIds,
      reviewCaseId: primaryReviewCaseId ?? null
    });
  }

  return {
    result: resultRow,
    evaluation,
    eventIds,
    operationalAlert,
    extraReviewCase
  };
}
