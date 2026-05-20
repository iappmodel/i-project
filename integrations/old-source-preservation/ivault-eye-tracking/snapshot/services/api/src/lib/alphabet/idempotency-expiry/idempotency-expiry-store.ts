import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { Json } from "@/types/alphabet/database.types";
import type { OperationalAlertType } from "@/types/alphabet/operational-alert.types";
import type { IdempotencyExpirySignalInput } from "@/types/alphabet/idempotency-expiry.types";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import {
  archiveDedupeKeyDb,
  archiveIdempotencyKeyDb,
  expireDedupeLockDb,
  expireIdempotencyLockDb,
  insertIdempotencyExpiryResultDb,
  suppressDedupeKeyDb,
  suppressIdempotencyKeyDb,
  updateIdempotencyExpiryResultSidecarsDb
} from "../db-repositories/idempotency-expiry.repository";
import { createOperationalAlertFromPartial } from "../operational-alerts/operational-alert-store";
import { createAdminReviewCase } from "../admin-review/admin-review-store";
import { evaluateIdempotencyExpiry } from "./idempotency-expiry-engine";

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

function alertTypeForExpiry(input: IdempotencyExpirySignalInput): OperationalAlertType {
  if (input.expiryType.includes("conflict")) return "idempotency_conflict_spike";
  if (input.expiryType.includes("duplicate")) return "dedupe_duplicate_spike";
  if (input.expiryType.includes("replay")) return "dedupe_duplicate_spike";
  return "audit_risk_high";
}

function slimEvaluationMetadata(
  evaluation: ReturnType<typeof evaluateIdempotencyExpiry>
): Json {
  return {
    status: evaluation.status,
    dbStatus: evaluation.dbStatus,
    severity: evaluation.severity,
    expiryType: evaluation.expiryType,
    expiryScope: evaluation.expiryScope,
    reasons: evaluation.reasons,
    decisions: evaluation.decisions
  } as unknown as Json;
}

export async function evaluateAndPersistIdempotencyExpiry(input: IdempotencyExpirySignalInput) {
  const evaluation = evaluateIdempotencyExpiry(input);

  const eventIds = await persistEvaluationEvents([
    evaluation.startedEvent,
    evaluation.archivedEvent,
    evaluation.suppressedEvent,
    evaluation.warningEvent,
    evaluation.failedEvent,
    evaluation.criticalEvent,
    evaluation.completedEvent
  ]);

  if (evaluation.decisions.shouldExpireLock && input.keyMetadata.keyValue) {
    if (input.keyMetadata.keyType === "idempotency") {
      await expireIdempotencyLockDb(input.keyMetadata.keyValue);
    } else {
      await expireDedupeLockDb(input.keyMetadata.keyValue);
    }
  }

  const meta = slimEvaluationMetadata(evaluation);

  if (evaluation.decisions.shouldArchive && input.keyMetadata.keyValue) {
    if (input.keyMetadata.keyType === "idempotency") {
      await archiveIdempotencyKeyDb({
        keyValue: input.keyMetadata.keyValue,
        reasonCodes: evaluation.reasons,
        metadata: meta
      });
    } else {
      await archiveDedupeKeyDb({
        keyValue: input.keyMetadata.keyValue,
        reasonCodes: evaluation.reasons,
        metadata: meta
      });
    }
  }

  if (evaluation.decisions.shouldSuppress && input.keyMetadata.keyValue) {
    if (input.keyMetadata.keyType === "idempotency") {
      await suppressIdempotencyKeyDb({
        keyValue: input.keyMetadata.keyValue,
        reasonCodes: evaluation.reasons,
        metadata: meta
      });
    } else {
      await suppressDedupeKeyDb({
        keyValue: input.keyMetadata.keyValue,
        reasonCodes: evaluation.reasons,
        metadata: meta
      });
    }
  }

  const resultRow = await insertIdempotencyExpiryResultDb({
    expiryType: input.expiryType,
    expiryScope: input.expiryScope,
    status: evaluation.dbStatus,
    severity: evaluation.severity,

    keyId: input.keyMetadata.keyId ?? null,
    keyType: input.keyMetadata.keyType,
    scope: input.keyMetadata.scope ?? null,
    keyValue: input.keyMetadata.keyValue ?? null,
    objectType: input.keyMetadata.objectType ?? null,
    objectId: input.keyMetadata.objectId ?? null,
    keyStatus: input.keyMetadata.status ?? null,

    firstSeenAt: input.keyMetadata.firstSeenAt ?? null,
    lastSeenAt: input.keyMetadata.lastSeenAt ?? null,
    expiresAt: input.keyMetadata.expiresAt ?? null,
    lockedAt: input.keyMetadata.lockedAt ?? null,
    lockExpiresAt: input.keyMetadata.lockExpiresAt ?? null,

    hitCount: input.keyMetadata.hitCount,
    conflictCount: input.keyMetadata.conflictCount,
    replayCount: input.keyMetadata.replayCount,

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
    notificationId: input.linkedObjectIds.notificationId ?? null,
    alphabetEventId: input.linkedObjectIds.alphabetEventId ?? null,

    shouldArchive: evaluation.decisions.shouldArchive,
    shouldSuppress: evaluation.decisions.shouldSuppress,
    shouldAlert: evaluation.decisions.shouldAlert,
    shouldReview: evaluation.decisions.shouldReview,
    shouldExpireLock: evaluation.decisions.shouldExpireLock,

    riskScores: input.riskScores as unknown as Json,
    evidence: input.evidence,
    redactedEvidence: input.redactedEvidence,
    sourceEventIds: eventIds,
    createdAlertIds: [],
    createdReviewCaseIds: [],
    reasonCodes: evaluation.reasons,
    metadata: {
      ...((input.metadata as Record<string, unknown>) ?? {}),
      evaluationSummary: meta
    } as unknown as Json
  });

  const expiryResultId = String((resultRow as Record<string, unknown>).expiry_result_id);

  const createdAlertIds: string[] = [];
  const createdReviewCaseIds: string[] = [];

  let operationalAlert: Awaited<ReturnType<typeof createOperationalAlertFromPartial>> | null = null;

  if (evaluation.decisions.shouldAlert) {
    operationalAlert = await createOperationalAlertFromPartial({
      alertType: alertTypeForExpiry(input),
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
        notificationId: input.linkedObjectIds.notificationId ?? null,
        alphabetEventId: input.linkedObjectIds.alphabetEventId ?? null
      },
      evidence: {
        expiryResultId,
        expiryType: input.expiryType,
        keyMetadata: input.keyMetadata,
        evidence: input.evidence
      },
      redactedEvidence: {
        expiryResultId,
        expiryType: input.expiryType,
        keyType: input.keyMetadata.keyType,
        scope: input.keyMetadata.scope,
        objectType: input.keyMetadata.objectType,
        objectId: input.keyMetadata.objectId,
        hitCount: input.keyMetadata.hitCount,
        conflictCount: input.keyMetadata.conflictCount,
        replayCount: input.keyMetadata.replayCount
      },
      publicSummary: "Idempotency or dedupe risk detected during expiry scan.",
      internalSummary: `Expiry scanner detected ${input.expiryType}.`,
      sourceEventIds: eventIds,
      riskScores: {
        alertConfidenceScore: input.riskScores.confidenceScore,
        financialRiskScore: input.riskScores.financialRiskScore,
        userImpactScore: input.moneyScoped ? 0.8 : 0.3,
        platformRiskScore: Math.max(input.riskScores.abuseRiskScore, input.riskScores.conflictRiskScore),
        exploitabilityScore: Math.max(input.riskScores.replayRiskScore, input.riskScores.abuseRiskScore),
        urgencyScore: evaluation.critical ? 0.95 : 0.65,
        recurrenceRiskScore: Math.max(input.riskScores.replayRiskScore, input.riskScores.conflictRiskScore)
      },
      metadata: {
        expiryResultId,
        severity: evaluation.severity
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

  let manualReview: Awaited<ReturnType<typeof createAdminReviewCase>> | null = null;

  if (
    evaluation.decisions.shouldReview &&
    !(
      operationalAlert?.reviewCase &&
      (operationalAlert.reviewCase as Record<string, unknown>)?.review_case_id
    )
  ) {
    manualReview = await createAdminReviewCase({
      reviewCaseType: input.moneyScoped ? "wallet_review" : "manual_admin_action_review",
      reviewTrigger: input.moneyScoped ? "fraud_risk_above_threshold" : "system_uncertainty",
      userId: input.linkedObjectIds.userId ?? null,
      walletId: input.linkedObjectIds.walletId ?? null,
      externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
      compensationId: input.linkedObjectIds.compensationId ?? null,
      policyDecisionId: input.linkedObjectIds.policyDecisionId ?? null,
      pipelineId: input.linkedObjectIds.pipelineId ?? null,
      sagaId: input.linkedObjectIds.sagaId ?? null,
      executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
      rawEvidence: {
        expiryResultId,
        expiryType: input.expiryType,
        keyMetadata: input.keyMetadata,
        evidence: input.evidence
      },
      internalSummary: `Critical idempotency or dedupe risk: ${input.expiryType}.`,
      severity: "critical",
      priority: "urgent",
      idempotencyKey: `idempotency-expiry-review:${expiryResultId}`,
      dedupeKey: `idempotency-expiry-review:${input.expiryType}:${input.keyMetadata.keyValue ?? "unknown"}`,
      sourceEventIds: eventIds,
      metadata: {
        expiryResultId
      }
    });

    const manualCase = manualReview.case as Record<string, unknown> | null | undefined;
    if (manualCase?.review_case_id && !manualReview.deduped) {
      createdReviewCaseIds.push(String(manualCase.review_case_id));
    }
  }

  const opReviewCase = operationalAlert?.reviewCase as { review_case_id?: string } | undefined;
  const manualCase = manualReview?.case as { review_case_id?: string } | undefined;
  const primaryReviewCaseId =
    (manualCase?.review_case_id as string | undefined) ??
    opReviewCase?.review_case_id ??
    input.linkedObjectIds.reviewCaseId ??
    null;

  if (createdAlertIds.length > 0 || createdReviewCaseIds.length > 0 || primaryReviewCaseId) {
    await updateIdempotencyExpiryResultSidecarsDb({
      expiryResultId,
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
    manualReview
  };
}
