import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { Json } from "@/types/alphabet/database.types";
import type { OperationalAlertType } from "@/types/alphabet/operational-alert.types";
import type { WalletInvariantSignalInput } from "@/types/alphabet/wallet-invariant.types";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import {
  insertWalletInvariantResultDb,
  updateWalletInvariantResultSidecarsDb
} from "../db-repositories/wallet-invariants.repository";
import { createOperationalAlertFromPartial } from "../operational-alerts/operational-alert-store";
import { createAdminReviewCase } from "../admin-review/admin-review-store";
import { evaluateWalletInvariant } from "./wallet-invariant-engine";

async function persistEvaluationEvents(events: Array<AlphabetEvent | null | undefined>): Promise<string[]> {
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

function alertTypeForInvariant(invariantType: string): OperationalAlertType {
  if (invariantType.includes("negative")) return "wallet_negative_balance";
  if (invariantType === "reversal_without_original" || invariantType === "duplicate_reversal_detected") {
    return "reversal_without_original";
  }
  if (invariantType === "external_transfer_without_debit") return "external_transfer_success_without_debit";
  if (invariantType === "compensation_without_reversal_ledger") {
    return "compensation_completed_without_reversal";
  }
  if (invariantType === "campaign_reserve_mismatch") return "campaign_budget_invariant_broken";
  if (
    invariantType === "withdrawal_debit_without_external_transfer" ||
    invariantType === "external_transfer_amount_mismatch"
  ) {
    return "payout_stuck_pending";
  }
  if (invariantType === "ledger_without_execution") return "ledger_without_execution";
  return "audit_risk_high";
}

export async function evaluateAndPersistWalletInvariant(input: WalletInvariantSignalInput) {
  const evaluation = evaluateWalletInvariant(input);

  const eventIds = await persistEvaluationEvents([
    evaluation.walletInvariantScanStartedEvent,
    evaluation.walletInvariantPassedEvent,
    evaluation.walletInvariantWarningEvent,
    evaluation.walletInvariantFailedEvent,
    evaluation.walletInvariantCriticalEvent,
    evaluation.walletInvariantScanCompletedEvent
  ]);

  const resultRow = await insertWalletInvariantResultDb({
    invariantType: input.invariantType,
    scanScope: input.scanScope,
    status: evaluation.dbStatus,
    severity: evaluation.severity,

    userId: input.linkedObjectIds.userId ?? null,
    walletId: input.linkedObjectIds.walletId ?? null,
    walletAccountId: input.linkedObjectIds.walletAccountId ?? null,

    ledgerEntryId: input.linkedObjectIds.ledgerEntryId ?? null,
    originalLedgerEntryId: input.linkedObjectIds.originalLedgerEntryId ?? null,
    reversalLedgerEntryId: input.linkedObjectIds.reversalLedgerEntryId ?? null,
    valueLotId: input.linkedObjectIds.valueLotId ?? null,

    externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
    compensationId: input.linkedObjectIds.compensationId ?? null,
    campaignId: input.linkedObjectIds.campaignId ?? null,

    executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
    pipelineId: input.linkedObjectIds.pipelineId ?? null,
    sagaId: input.linkedObjectIds.sagaId ?? null,

    computedAvailableBalance: input.balances.computedAvailableBalance ?? null,
    computedPendingBalance: input.balances.computedPendingBalance ?? null,
    computedReservedBalance: input.balances.computedReservedBalance ?? null,
    computedTotalBalance: input.balances.computedTotalBalance ?? null,

    storedAvailableBalance: input.balances.storedAvailableBalance ?? null,
    storedPendingBalance: input.balances.storedPendingBalance ?? null,
    storedReservedBalance: input.balances.storedReservedBalance ?? null,
    storedTotalBalance: input.balances.storedTotalBalance ?? null,

    availableDelta: input.balances.availableDelta ?? null,
    pendingDelta: input.balances.pendingDelta ?? null,
    reservedDelta: input.balances.reservedDelta ?? null,
    totalDelta: input.balances.totalDelta ?? null,

    riskScores: input.riskScores as unknown as Json,
    evidence: input.evidence,
    redactedEvidence: input.redactedEvidence,
    sourceEventIds: eventIds,
    createdAlertIds: [],
    createdReviewCaseIds: [],
    reasonCodes: evaluation.reasons,
    metadata: {
      invariantSeverityScore: evaluation.invariantSeverityScore,
      invariantConfidenceScore: evaluation.invariantConfidenceScore,
      outcomeStatus: evaluation.status,
      invariantType: input.invariantType
    } as Json
  });

  const invariantResultId = String((resultRow as Record<string, unknown>).invariant_result_id);

  let operationalAlert: Awaited<ReturnType<typeof createOperationalAlertFromPartial>> | null = null;
  let extraReviewCase: Record<string, unknown> | null = null;
  const createdAlertIds: string[] = [];
  const createdReviewCaseIds: string[] = [];

  if (evaluation.shouldCreateOperationalAlert) {
    operationalAlert = await createOperationalAlertFromPartial({
      alertType: alertTypeForInvariant(input.invariantType),
      alertSource: "wallet",
      linkedObjectIds: {
        userId: input.linkedObjectIds.userId ?? null,
        walletId: input.linkedObjectIds.walletId ?? null,
        walletAccountId: input.linkedObjectIds.walletAccountId ?? null,
        ledgerEntryId: input.linkedObjectIds.ledgerEntryId ?? null,
        originalLedgerEntryId: input.linkedObjectIds.originalLedgerEntryId ?? null,
        reversalLedgerEntryId: input.linkedObjectIds.reversalLedgerEntryId ?? null,
        externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
        compensationId: input.linkedObjectIds.compensationId ?? null,
        campaignId: input.linkedObjectIds.campaignId ?? null,
        executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
        pipelineId: input.linkedObjectIds.pipelineId ?? null,
        sagaId: input.linkedObjectIds.sagaId ?? null
      },
      evidence: {
        invariantResultId,
        invariantType: input.invariantType,
        balances: input.balances,
        evidence: input.evidence
      },
      redactedEvidence: {
        invariantResultId,
        invariantType: input.invariantType,
        balances: input.balances
      },
      publicSummary: "Wallet invariant failure detected.",
      internalSummary: `Wallet invariant failed: ${input.invariantType}.`,
      sourceEventIds: eventIds,
      riskScores: {
        alertConfidenceScore: input.riskScores.confidenceScore,
        financialRiskScore: input.riskScores.financialImpactScore,
        userImpactScore: input.riskScores.userImpactScore,
        platformRiskScore: Math.max(input.riskScores.financialImpactScore, input.riskScores.recurrenceRiskScore),
        exploitabilityScore: input.riskScores.exploitabilityScore,
        urgencyScore: evaluation.critical ? 0.95 : 0.7,
        recurrenceRiskScore: input.riskScores.recurrenceRiskScore
      },
      metadata: {
        invariantResultId,
        invariantType: input.invariantType,
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

  if (
    evaluation.shouldCreateReviewCase &&
    !(operationalAlert?.reviewCase && (operationalAlert.reviewCase as Record<string, unknown>)?.review_case_id)
  ) {
    const reviewResult = await createAdminReviewCase({
      reviewCaseType: "wallet_review",
      reviewTrigger: "system_uncertainty",
      userId: input.linkedObjectIds.userId ?? null,
      walletId: input.linkedObjectIds.walletId ?? null,
      campaignId: input.linkedObjectIds.campaignId ?? null,
      externalTransferId: input.linkedObjectIds.externalTransferId ?? null,
      compensationId: input.linkedObjectIds.compensationId ?? null,
      pipelineId: input.linkedObjectIds.pipelineId ?? null,
      sagaId: input.linkedObjectIds.sagaId ?? null,
      executionRequestId: input.linkedObjectIds.executionRequestId ?? null,
      rawEvidence: {
        invariantResultId,
        invariantType: input.invariantType,
        evidence: input.evidence,
        balances: input.balances
      },
      internalSummary: `Critical wallet invariant failure: ${input.invariantType}.`,
      severity: "critical",
      priority: "urgent",
      idempotencyKey: `wallet-invariant-review:${invariantResultId}`,
      dedupeKey: `wallet-invariant-review:${input.invariantType}:${input.linkedObjectIds.walletAccountId ?? input.linkedObjectIds.walletId ?? input.linkedObjectIds.ledgerEntryId ?? "unknown"}`,
      sourceEventIds: eventIds,
      metadata: {
        invariantResultId
      }
    });
    extraReviewCase = reviewResult.case as Record<string, unknown>;
    if (extraReviewCase?.review_case_id) {
      createdReviewCaseIds.push(String(extraReviewCase.review_case_id));
    }
  }

  if (createdAlertIds.length > 0 || createdReviewCaseIds.length > 0) {
    await updateWalletInvariantResultSidecarsDb({
      invariantResultId,
      createdAlertIds,
      createdReviewCaseIds
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
