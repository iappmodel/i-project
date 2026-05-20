import type { Json } from "@/types/alphabet/database.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  OperationalAlertLinkedObjectIds,
  OperationalAlertRiskScores,
  OperationalAlertSignalInput
} from "@/types/alphabet/operational-alert.types";
import { evaluateOperationalAlert } from "./operational-alert-engine";
import { routeOperationalAlert } from "./operational-alert-router";
import {
  getOpenOperationalAlertByDedupeKeyDb,
  insertOperationalAlertDb,
  listOperationalAlertsDb,
  getOperationalAlertDb,
  updateOperationalAlertStatusDb,
  updateOperationalAlertReviewCaseIdDb
} from "../db-repositories/operational-alerts.repository";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import { createAdminReviewCase } from "../admin-review/admin-review-store";
import type { AdminReviewCaseType, AdminReviewTrigger } from "@/types/alphabet/admin-review.types";

async function persistAlphabetEventFromEvaluation(ev: AlphabetEvent): Promise<string> {
  const saved = await insertAlphabetEvent({
    userId: ev.userId,
    coinCode: ev.coinCode,
    eventType: ev.eventType,
    objectType: ev.objectType,
    objectId: ev.objectId,
    sourceContext: ev.sourceContext,
    rawScore: ev.rawScore ?? null,
    qualityScore: ev.qualityScore ?? null,
    trustScoreAtEvent: ev.trustScoreAtEvent ?? null,
    riskScore: ev.riskScore ?? null,
    ageBand: ev.ageBand ?? null,
    verificationStatus: ev.verificationStatus,
    metadata: (ev.metadata ?? {}) as Json
  });

  return saved.event_id;
}

async function persistEvaluationEvents(events: Array<AlphabetEvent | null | undefined>): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const ev of events) {
    if (!ev) continue;
    if (seen.has(ev.eventId)) continue;
    seen.add(ev.eventId);
    ids.push(await persistAlphabetEventFromEvaluation(ev));
  }

  return ids;
}

function defaultRiskScores(overrides: Partial<OperationalAlertRiskScores> = {}): OperationalAlertRiskScores {
  return {
    alertConfidenceScore: overrides.alertConfidenceScore ?? 0.9,
    financialRiskScore: overrides.financialRiskScore ?? 0.5,
    userImpactScore: overrides.userImpactScore ?? 0.5,
    platformRiskScore: overrides.platformRiskScore ?? 0.5,
    exploitabilityScore: overrides.exploitabilityScore ?? 0.3,
    urgencyScore: overrides.urgencyScore ?? 0.5,
    recurrenceRiskScore: overrides.recurrenceRiskScore ?? 0.3
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "23505" || Boolean(e.message?.includes("duplicate key"));
}

function reviewCaseTypeForTeam(
  team: string,
  alertType: OperationalAlertSignalInput["alertType"]
): AdminReviewCaseType {
  if (team === "fraud" || alertType === "fraud_freeze_recommended") return "fraud_review";
  if (team === "payments") return "external_transfer_review";
  if (team === "policy" || alertType === "campaign_budget_invariant_broken") return "campaign_review";
  if (team === "wallet_ops") return "wallet_review";
  return "manual_admin_action_review";
}

function reviewTriggerForAlert(alertType: OperationalAlertSignalInput["alertType"]): AdminReviewTrigger {
  if (alertType === "provider_unknown_without_review") return "external_transfer_unknown";
  if (alertType === "fraud_freeze_recommended") return "fraud_risk_above_threshold";
  if (alertType === "campaign_budget_invariant_broken") return "policy_requires_review";
  return "system_uncertainty";
}

export async function createOperationalAlert(input: OperationalAlertSignalInput) {
  let evaluation = evaluateOperationalAlert(input);
  const existing = await getOpenOperationalAlertByDedupeKeyDb(evaluation.dedupeKey);

  if (existing) {
    evaluation = evaluateOperationalAlert({
      ...input,
      existingOpenAlertCount: Math.max(1, input.existingOpenAlertCount + 1)
    });
  }

  const eventIds = await persistEvaluationEvents([
    evaluation.operationalAlertCreatedEvent,
    evaluation.operationalAlertSuppressedEvent,
    evaluation.operationalAlertFailedEvent
  ]);

  if (!evaluation.shouldCreateAlert) {
    return {
      ok: !evaluation.failed,
      alert: existing ?? null,
      evaluation,
      reviewCase: null,
      eventIds,
      reasonCodes: evaluation.reasons
    };
  }

  const route = routeOperationalAlert(input);

  let alert: Record<string, unknown>;
  try {
    alert = (await insertOperationalAlertDb({
      alertType: input.alertType,
      alertSource: input.alertSource,
      status: evaluation.shouldEscalate ? "alert_escalated" : "alert_open",
      severity: evaluation.severity,
      priority: evaluation.priority,

      assignedTeam: route.assignedTeam,
      routeReason: route.routeReason,

      userId: input.linkedObjectIds.userId ?? null,
      walletId: input.linkedObjectIds.walletId ?? null,
      walletAccountId: input.linkedObjectIds.walletAccountId ?? null,
      ledgerEntryId: input.linkedObjectIds.ledgerEntryId ?? null,
      originalLedgerEntryId: input.linkedObjectIds.originalLedgerEntryId ?? null,
      reversalLedgerEntryId: input.linkedObjectIds.reversalLedgerEntryId ?? null,
      externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
      compensationId: input.linkedObjectIds.compensationId ?? null,
      providerReconciliationId: input.linkedObjectIds.providerReconciliationId ?? null,
      reviewCaseId: input.linkedObjectIds.reviewCaseId ?? null,
      policyDecisionId: input.linkedObjectIds.policyDecisionId ?? null,
      pipelineId: input.linkedObjectIds.pipelineId ?? null,
      sagaId: input.linkedObjectIds.sagaId ?? null,
      executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
      campaignId: input.linkedObjectIds.campaignId ?? null,
      notificationId: input.linkedObjectIds.notificationId ?? null,
      auditRecordId: input.linkedObjectIds.auditRecordId ?? null,
      alphabetEventId: input.linkedObjectIds.alphabetEventId ?? null,

      sourceAnomalyIds: input.sourceAnomalyIds,
      sourceEventIds: input.sourceEventIds,

      evidence: input.evidence,
      redactedEvidence: input.redactedEvidence,

      publicSummary: input.publicSummary ?? null,
      internalSummary: input.internalSummary ?? null,

      riskScores: input.riskScores as unknown as Json,
      metadata: {
        evaluation,
        route,
        ...(input.metadata as Record<string, unknown> | undefined)
      } as unknown as Json,

      dedupeKey: evaluation.dedupeKey,
      idempotencyKey: evaluation.idempotencyKey
    })) as Record<string, unknown>;
  } catch (err) {
    if (isUniqueViolation(err)) {
      const dup = await getOpenOperationalAlertByDedupeKeyDb(evaluation.dedupeKey);
      return {
        ok: true,
        alert: dup,
        evaluation: { ...evaluation, status: "alert_skip_duplicate" as const },
        reviewCase: null,
        eventIds,
        reasonCodes: [...evaluation.reasons, "operational_alert_unique_dedupe_race"]
      };
    }
    throw err;
  }

  const routedEventIds = await persistEvaluationEvents([evaluation.operationalAlertRoutedEvent]);

  let reviewCase: Record<string, unknown> | null = null;

  if (evaluation.shouldCreateReviewCase) {
    const reviewResult = await createAdminReviewCase({
      reviewCaseType: reviewCaseTypeForTeam(route.assignedTeam, input.alertType),
      reviewTrigger: reviewTriggerForAlert(input.alertType),
      userId: input.linkedObjectIds.userId ?? null,
      walletId: input.linkedObjectIds.walletId ?? null,
      externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
      compensationId: input.linkedObjectIds.compensationId ?? null,
      policyDecisionId: input.linkedObjectIds.policyDecisionId ?? null,
      pipelineId: input.linkedObjectIds.pipelineId ?? null,
      sagaId: input.linkedObjectIds.sagaId ?? null,
      executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
      providerReconciliationId: input.linkedObjectIds.providerReconciliationId ?? null,
      rawEvidence: input.evidence as Record<string, unknown>,
      internalSummary: input.internalSummary ?? null,
      severity: evaluation.severity,
      priority: evaluation.priority,
      idempotencyKey: `review:${evaluation.idempotencyKey}`,
      dedupeKey: `review:${evaluation.dedupeKey}`,
      sourceEventIds: input.sourceEventIds,
      metadata: {
        operationalAlertId: alert.alert_id,
        alertType: input.alertType
      }
    });

    reviewCase = reviewResult.case as Record<string, unknown>;

    const reviewCaseId = reviewCase?.review_case_id;
    if (reviewCaseId) {
      await updateOperationalAlertReviewCaseIdDb({
        alertId: String(alert.alert_id),
        reviewCaseId: String(reviewCaseId)
      });
    }
  }

  return {
    ok: true,
    alert,
    evaluation,
    reviewCase,
    eventIds: [...eventIds, ...routedEventIds],
    reasonCodes: evaluation.reasons
  };
}

export async function createOperationalAlertFromPartial(params: {
  alertType: OperationalAlertSignalInput["alertType"];
  alertSource: OperationalAlertSignalInput["alertSource"];
  linkedObjectIds?: OperationalAlertLinkedObjectIds;
  evidence?: Record<string, unknown>;
  redactedEvidence?: Record<string, unknown>;
  publicSummary?: string | null;
  internalSummary?: string | null;
  riskScores?: Partial<OperationalAlertRiskScores>;
  sourceAnomalyIds?: string[];
  sourceEventIds?: string[];
  metadata?: Record<string, unknown>;
}) {
  return createOperationalAlert({
    alertType: params.alertType,
    alertSource: params.alertSource,
    linkedObjectIds: params.linkedObjectIds ?? {},
    sourceAnomalyIds: params.sourceAnomalyIds ?? [],
    sourceEventIds: params.sourceEventIds ?? [],
    evidence: (params.evidence ?? {}) as Json,
    redactedEvidence: (params.redactedEvidence ?? params.evidence ?? {}) as Json,
    publicSummary: params.publicSummary ?? null,
    internalSummary: params.internalSummary ?? null,
    riskScores: defaultRiskScores(params.riskScores),
    existingOpenAlertCount: 0,
    suppressRequested: false,
    now: new Date().toISOString(),
    metadata: (params.metadata ?? {}) as Json
  });
}

export async function listRiskInboxAlerts(params?: {
  status?: string | null;
  severity?: string | null;
  assignedTeam?: string | null;
  limit?: number;
}) {
  return listOperationalAlertsDb(params);
}

export async function getRiskInboxAlert(alertId: string) {
  return getOperationalAlertDb(alertId);
}

export async function acknowledgeRiskInboxAlert(params: { alertId: string; actorUserId: string }) {
  return updateOperationalAlertStatusDb({
    alertId: params.alertId,
    status: "alert_acknowledged",
    actorUserId: params.actorUserId
  });
}

export async function resolveRiskInboxAlert(params: {
  alertId: string;
  actorUserId: string;
  reasonCodes: string[];
  notes?: string | null;
}) {
  return updateOperationalAlertStatusDb({
    alertId: params.alertId,
    status: "alert_resolved",
    actorUserId: params.actorUserId,
    reasonCodes: params.reasonCodes,
    notes: params.notes ?? null
  });
}

export async function escalateRiskInboxAlert(params: {
  alertId: string;
  actorUserId: string;
  reasonCodes: string[];
}) {
  return updateOperationalAlertStatusDb({
    alertId: params.alertId,
    status: "alert_escalated",
    actorUserId: params.actorUserId,
    reasonCodes: params.reasonCodes
  });
}
