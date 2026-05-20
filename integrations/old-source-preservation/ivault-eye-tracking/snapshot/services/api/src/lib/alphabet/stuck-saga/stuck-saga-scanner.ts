import type { Json } from "@/types/alphabet/database.types";
import type {
  DbExecutionRequest,
  DbLedgerEntry,
  DbPipelineRecord,
  DbSagaRecord
} from "@/types/alphabet/database.types";
import type {
  StuckSagaRiskScores,
  StuckSagaScannerResult,
  StuckSagaSignalInput,
  StuckSagaType
} from "@/types/alphabet/stuck-saga.types";
import { getStuckSagaRule } from "@/data/alphabet/stuck-saga-rules";
import { fetchStuckSagaScanRowsDb } from "../db-repositories/stuck-saga.repository";
import { evaluateAndPersistStuckSaga } from "./stuck-saga-store";
import {
  isMoneyTarget,
  money,
  newestDate,
  secondsBetween,
  sumDebits,
  sumTransferAmount,
  toNumber
} from "./stuck-saga-normalizers";

type ScanBundle = Awaited<ReturnType<typeof fetchStuckSagaScanRowsDb>>;
export type StuckSagaPersistRow = Awaited<ReturnType<typeof evaluateAndPersistStuckSaga>>;

function defaultRiskScores(overrides?: Partial<StuckSagaRiskScores>): StuckSagaRiskScores {
  return {
    orchestrationRiskScore: overrides?.orchestrationRiskScore ?? 0.75,
    financialExposureScore: overrides?.financialExposureScore ?? 0.3,
    userImpactScore: overrides?.userImpactScore ?? 0.4,
    platformImpactScore: overrides?.platformImpactScore ?? 0.6,
    retryExhaustionScore: overrides?.retryExhaustionScore ?? 0.2,
    uncertaintyScore: overrides?.uncertaintyScore ?? 0.6,
    confidenceScore: overrides?.confidenceScore ?? 0.9
  };
}

function metadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const v = (metadata as Record<string, unknown>)[key];
  return v != null && v !== "" ? String(v) : null;
}

function linkedLedgerRows(
  ledgers: DbLedgerEntry[],
  params: {
    sagaId?: string | null;
    pipelineId?: string | null;
    executionRequestId?: string | null;
    externalTransferId?: string | null;
  }
): DbLedgerEntry[] {
  return ledgers.filter((ledger) => {
    if (params.executionRequestId && ledger.source_object_id === params.executionRequestId) {
      return true;
    }
    if (
      params.externalTransferId &&
      metadataString(ledger.metadata, "external_transfer_id") === params.externalTransferId
    ) {
      return true;
    }
    if (params.sagaId && metadataString(ledger.metadata, "saga_id") === params.sagaId) {
      return true;
    }
    if (params.pipelineId && metadataString(ledger.metadata, "pipeline_id") === params.pipelineId) {
      return true;
    }
    return false;
  });
}

function linkedTransferRows(
  transfers: Array<Record<string, unknown>>,
  params: {
    sagaId?: string | null;
    pipelineId?: string | null;
    executionRequestId?: string | null;
  }
): Array<Record<string, unknown>> {
  return transfers.filter((transfer) => {
    if (
      params.executionRequestId &&
      String(transfer.original_execution_request_id ?? "") === params.executionRequestId
    ) {
      return true;
    }
    if (params.pipelineId && String(transfer.pipeline_id ?? "") === params.pipelineId) {
      return true;
    }
    if (params.sagaId && String(transfer.saga_id ?? "") === params.sagaId) {
      return true;
    }
    return false;
  });
}

function linkedCompensationRows(
  rows: Array<Record<string, unknown>>,
  params: {
    sagaId?: string | null;
    pipelineId?: string | null;
    executionRequestId?: string | null;
    ledgerEntryIds?: string[];
  }
): Array<Record<string, unknown>> {
  return rows.filter((compensation) => {
    if (
      params.executionRequestId &&
      String(compensation.original_execution_request_id ?? "") === params.executionRequestId
    ) {
      return true;
    }
    if (params.pipelineId && String(compensation.original_pipeline_id ?? "") === params.pipelineId) {
      return true;
    }
    if (params.sagaId && String(compensation.original_saga_id ?? "") === params.sagaId) {
      return true;
    }
    const lid = String(compensation.original_ledger_entry_id ?? "");
    if (params.ledgerEntryIds?.length && lid && params.ledgerEntryIds.includes(lid)) {
      return true;
    }
    return false;
  });
}

function collectSidecarIds(row: StuckSagaPersistRow): {
  alertIds: string[];
  reviewCaseIds: string[];
  eventIds: string[];
} {
  const alertIds: string[] = [];
  const reviewCaseIds: string[] = [];
  const alert = row.operationalAlert?.alert as { alert_id?: string } | undefined;
  if (alert?.alert_id) alertIds.push(String(alert.alert_id));
  const rc = row.operationalAlert?.reviewCase as { review_case_id?: string } | undefined;
  if (rc?.review_case_id) reviewCaseIds.push(String(rc.review_case_id));
  const extra = row.extraReviewCase as { review_case_id?: string } | undefined;
  if (extra?.review_case_id) reviewCaseIds.push(String(extra.review_case_id));
  return {
    alertIds,
    reviewCaseIds: [...new Set(reviewCaseIds)],
    eventIds: row.eventIds
  };
}

function buildTiming(params: {
  stuckType: StuckSagaType;
  startedAt?: string | null;
  updatedAt?: string | null;
  lastProgressAt?: string | null;
  now: string;
}) {
  const rule = getStuckSagaRule(params.stuckType);

  const startedAt = params.startedAt ?? params.updatedAt ?? params.now;
  const lastProgressAt = params.lastProgressAt ?? params.updatedAt ?? startedAt;

  return {
    startedAt,
    updatedAt: params.updatedAt ?? null,
    lastProgressAt,
    ageSeconds: secondsBetween(startedAt, params.now),
    staleSeconds: secondsBetween(lastProgressAt, params.now),
    maxAllowedAgeSeconds: rule?.maxAgeSeconds ?? 0,
    maxAllowedStaleSeconds: rule?.maxStaleSeconds ?? 0
  };
}

function hasOpenReviewForObject(params: {
  reviews: Array<Record<string, unknown>>;
  sagaId?: string | null;
  pipelineId?: string | null;
  executionRequestId?: string | null;
  externalTransferId?: string | null;
}): boolean {
  return params.reviews.some((review) => {
    return (
      (Boolean(params.sagaId) && String(review.saga_id ?? "") === String(params.sagaId)) ||
      (Boolean(params.pipelineId) && String(review.pipeline_id ?? "") === String(params.pipelineId)) ||
      (Boolean(params.executionRequestId) &&
        String(review.execution_request_id ?? "") === String(params.executionRequestId)) ||
      (Boolean(params.externalTransferId) &&
        String(review.external_transfer_id ?? "") === String(params.externalTransferId))
    );
  });
}

function executionsForSaga(
  sagaId: string,
  pipelines: DbPipelineRecord[],
  executions: DbExecutionRequest[]
): DbExecutionRequest[] {
  const ids = new Set<string>();
  for (const p of pipelines) {
    if (p.saga_id !== sagaId) continue;
    for (const id of p.execution_request_ids ?? []) {
      ids.add(String(id));
    }
  }
  for (const e of executions) {
    if (metadataString(e.metadata, "saga_id") === sagaId) {
      ids.add(e.execution_request_id);
    }
  }
  return executions.filter((e) => ids.has(e.execution_request_id));
}

function transferHasReconciliation(
  externalTransferId: string,
  reconciliations: Array<Record<string, unknown>>
): boolean {
  return reconciliations.some(
    (recon) => String(recon.external_transfer_id ?? "") === externalTransferId
  );
}

async function signal(input: StuckSagaSignalInput) {
  return evaluateAndPersistStuckSaga(input);
}

async function scanSagaRows(rows: ScanBundle, now: string) {
  const results: StuckSagaPersistRow[] = [];

  for (const saga of rows.sagas as DbSagaRecord[]) {
    const sagaId = saga.saga_id;

    const pipelines = rows.pipelines.filter(
      (pipeline) => (pipeline as DbPipelineRecord).saga_id === sagaId
    ) as DbPipelineRecord[];

    const executions = executionsForSaga(sagaId, rows.pipelines as DbPipelineRecord[], rows.executions);

    const ledgers = linkedLedgerRows(rows.ledgers, { sagaId });
    const transfers = linkedTransferRows(rows.transfers as Array<Record<string, unknown>>, { sagaId });
    const compensations = linkedCompensationRows(rows.compensations as Array<Record<string, unknown>>, {
      sagaId,
      ledgerEntryIds: ledgers.map((ledger) => ledger.ledger_entry_id)
    });

    const internalDebitAmount = sumDebits(ledgers as unknown as Array<Record<string, unknown>>);
    const externalTransferAmount = sumTransferAmount(transfers);
    const pendingAmount = sumTransferAmount(transfers, [
      "provider_pending",
      "provider_request_sent",
      "provider_request_created"
    ]);
    const unknownAmount = sumTransferAmount(transfers, ["provider_unknown"]);
    const compensationAmount = money(
      compensations.reduce((sum, compensation) => sum + toNumber(compensation.amount), 0)
    );

    const exposureAmount = Math.max(0, internalDebitAmount - compensationAmount);

    const lastProgressAt = newestDate([
      saga.updated_at,
      ...executions.map((execution) => execution.updated_at),
      ...pipelines.map((pipeline) => pipeline.updated_at),
      ...transfers.map((transfer) => String(transfer.updated_at ?? "")),
      ...compensations.map((comp) => String(comp.updated_at ?? ""))
    ]);

    let stuckType: StuckSagaType | null = null;

    if (String(saga.status) === "saga_started" && executions.length === 0 && pipelines.length === 0) {
      stuckType = "saga_started_no_progress";
    }

    if (!stuckType && String(saga.status) === "saga_running") {
      stuckType = "saga_running_too_long";
    }

    if (!stuckType && String(saga.status) === "saga_partially_completed") {
      stuckType = "saga_partial_failure";
    }

    if (!stuckType && executions.some((e) => String(e.status) === "execution_dead_lettered")) {
      stuckType = "saga_child_execution_dead_lettered";
    }

    if (!stuckType && executions.some((e) => String(e.status) === "execution_failed")) {
      stuckType = "saga_child_execution_failed";
    }

    if (
      !stuckType &&
      internalDebitAmount > 0 &&
      exposureAmount > 0 &&
      transfers.every((transfer) => {
        const st = String(transfer.status ?? "");
        return !["provider_succeeded", "transfer_completed"].includes(st);
      })
    ) {
      stuckType = "saga_money_debited_no_completion";
    }

    if (
      !stuckType &&
      transfers.length > 0 &&
      transfers.some(
        (t) => !transferHasReconciliation(String(t.external_transfer_id ?? ""), rows.reconciliations)
      )
    ) {
      stuckType = "saga_external_transfer_created_no_polling";
    }

    if (!stuckType) continue;

    const reviewAlreadyExists = hasOpenReviewForObject({
      reviews: rows.reviews as Array<Record<string, unknown>>,
      sagaId
    });

    const timing = buildTiming({
      stuckType,
      startedAt: saga.created_at,
      updatedAt: saga.updated_at,
      lastProgressAt,
      now
    });

    results.push(
      await signal({
        stuckType,
        scanScope: "single_saga",
        linkedObjectIds: {
          userId: saga.user_id,
          walletId: saga.wallet_id,
          sagaId,
          pipelineId: pipelines[0]?.pipeline_id ?? null,
          executionRequestId: executions[0]?.execution_request_id ?? null,
          ledgerEntryId: ledgers[0]?.ledger_entry_id ?? null,
          externalTransferId: transfers[0]?.external_transfer_id
            ? String(transfers[0].external_transfer_id)
            : null,
          compensationId: compensations[0]?.compensation_id
            ? String(compensations[0].compensation_id)
            : null
        },
        timing,
        moneyExposure: {
          internalDebitAmount,
          externalTransferAmount,
          pendingAmount,
          unknownAmount,
          compensationAmount,
          exposureAmount
        },
        riskScores: defaultRiskScores({
          orchestrationRiskScore: 0.85,
          financialExposureScore: exposureAmount > 0 ? 0.95 : 0.3,
          userImpactScore: exposureAmount > 0 ? 0.9 : 0.45,
          platformImpactScore: exposureAmount > 0 ? 0.9 : 0.65,
          retryExhaustionScore: executions.some((e) => String(e.status).includes("dead_letter"))
            ? 0.95
            : 0.35,
          uncertaintyScore: unknownAmount > 0 ? 0.95 : 0.65,
          confidenceScore: 0.92
        }),
        evidence: {
          saga,
          executions,
          pipelines,
          ledgers,
          transfers,
          compensations
        } as unknown as Json,
        redactedEvidence: {
          sagaId,
          status: saga.status,
          executionCount: executions.length,
          pipelineCount: pipelines.length,
          ledgerCount: ledgers.length,
          transferCount: transfers.length,
          compensationCount: compensations.length,
          exposureAmount
        } as unknown as Json,
        sourceEventIds: [],
        stuckDetected: true,
        moneyMovementAffected: exposureAmount > 0 || internalDebitAmount > 0,
        providerAffected: transfers.length > 0,
        userVisibleAffected: exposureAmount > 0,
        retryExhausted: executions.some((e) => String(e.status) === "execution_dead_lettered"),
        reviewAlreadyExists,
        now,
        metadata: { scanner: "saga" } as unknown as Json
      })
    );
  }

  return results;
}

async function scanPipelineRows(rows: ScanBundle, now: string) {
  const results: StuckSagaPersistRow[] = [];

  for (const pipeline of rows.pipelines as DbPipelineRecord[]) {
    let stuckType: StuckSagaType | null = null;

    if (String(pipeline.status) === "pipeline_locked") {
      stuckType = "pipeline_locked_too_long";
    }

    if (!stuckType && String(pipeline.status) === "pipeline_running") {
      stuckType = "pipeline_running_too_long";
    }

    if (!stuckType) continue;

    const pipelineId = pipeline.pipeline_id;
    const execIds = new Set((pipeline.execution_request_ids ?? []).map(String));
    const executions = rows.executions.filter((e) => execIds.has(e.execution_request_id));
    const ledgers = linkedLedgerRows(rows.ledgers, { pipelineId });
    const transfers = linkedTransferRows(rows.transfers as Array<Record<string, unknown>>, {
      pipelineId
    });

    const internalDebitAmount = sumDebits(ledgers as unknown as Array<Record<string, unknown>>);
    const pendingAmount = sumTransferAmount(transfers, [
      "provider_pending",
      "provider_request_sent",
      "provider_request_created"
    ]);
    const unknownAmount = sumTransferAmount(transfers, ["provider_unknown"]);
    const exposureAmount = Math.max(internalDebitAmount, pendingAmount, unknownAmount);

    const timing = buildTiming({
      stuckType,
      startedAt: pipeline.created_at,
      updatedAt: pipeline.updated_at,
      lastProgressAt: newestDate([
        pipeline.updated_at,
        ...executions.map((execution) => execution.updated_at),
        ...ledgers.map((ledger) => ledger.created_at),
        ...transfers.map((transfer) => String(transfer.updated_at ?? ""))
      ]),
      now
    });

    results.push(
      await signal({
        stuckType,
        scanScope: "single_pipeline",
        linkedObjectIds: {
          userId: pipeline.user_id,
          walletId: pipeline.wallet_id,
          sagaId: pipeline.saga_id,
          pipelineId,
          executionRequestId: executions[0]?.execution_request_id ?? null,
          ledgerEntryId: ledgers[0]?.ledger_entry_id ?? null,
          externalTransferId: transfers[0]?.external_transfer_id
            ? String(transfers[0].external_transfer_id)
            : null
        },
        timing,
        moneyExposure: {
          internalDebitAmount,
          externalTransferAmount: sumTransferAmount(transfers),
          pendingAmount,
          unknownAmount,
          compensationAmount: 0,
          exposureAmount
        },
        riskScores: defaultRiskScores({
          orchestrationRiskScore: 0.8,
          financialExposureScore: exposureAmount > 0 ? 0.9 : 0.25,
          userImpactScore: exposureAmount > 0 ? 0.85 : 0.35,
          platformImpactScore: 0.7,
          uncertaintyScore: unknownAmount > 0 ? 0.95 : 0.55,
          confidenceScore: 0.9
        }),
        evidence: { pipeline, executions, ledgers, transfers } as unknown as Json,
        redactedEvidence: {
          pipelineId,
          status: pipeline.status,
          executionCount: executions.length,
          ledgerCount: ledgers.length,
          transferCount: transfers.length,
          exposureAmount
        } as unknown as Json,
        sourceEventIds: [],
        stuckDetected: true,
        moneyMovementAffected: exposureAmount > 0,
        providerAffected: transfers.length > 0,
        userVisibleAffected: exposureAmount > 0,
        retryExhausted: false,
        reviewAlreadyExists: hasOpenReviewForObject({
          reviews: rows.reviews as Array<Record<string, unknown>>,
          pipelineId
        }),
        now,
        metadata: { scanner: "pipeline" } as unknown as Json
      })
    );
  }

  return results;
}

function executionMaxRetries(ex: DbExecutionRequest): number {
  const anyEx = ex as unknown as Record<string, unknown>;
  const m = toNumber(anyEx.max_retries);
  if (m > 0) return m;
  const m2 = toNumber(anyEx.maxAttempts);
  return m2 > 0 ? m2 : 999;
}

async function scanExecutionRows(rows: ScanBundle, now: string) {
  const results: StuckSagaPersistRow[] = [];
  const pipelineExecRef = new Set<string>();
  for (const p of rows.pipelines as DbPipelineRecord[]) {
    for (const id of p.execution_request_ids ?? []) {
      pipelineExecRef.add(String(id));
    }
  }

  for (const execution of rows.executions) {
    const status = String(execution.status);
    const targetSystem = String(execution.target_system ?? "");

    let stuckType: StuckSagaType | null = null;

    if (status === "execution_running") {
      stuckType = "execution_running_too_long";
    }

    if (!stuckType && status === "execution_retry_pending") {
      const maxR = executionMaxRetries(execution);
      if (maxR > 0 && toNumber(execution.retry_count) >= maxR) {
        stuckType = "execution_retry_exhausted";
      }
    }

    if (!stuckType && status === "execution_dead_lettered") {
      stuckType = "execution_dead_lettered_unreviewed";
    }

    if (!stuckType && status === "execution_failed" && isMoneyTarget(targetSystem)) {
      stuckType = "execution_money_mutation_uncertain";
    }

    const executionRequestId = execution.execution_request_id;
    const inPipeline = pipelineExecRef.has(executionRequestId);
    const inTransfer = (rows.transfers as Array<Record<string, unknown>>).some(
      (t) => String(t.original_execution_request_id ?? "") === executionRequestId
    );
    const metaSagaFromMetadata = metadataString(execution.metadata, "saga_id");
    const metaPipelineFromMetadata = metadataString(execution.metadata, "pipeline_id");
    if (
      !stuckType &&
      !inPipeline &&
      !inTransfer &&
      !metaSagaFromMetadata &&
      !metaPipelineFromMetadata
    ) {
      stuckType = "orphan_execution_request";
    }

    if (!stuckType) continue;

    const ledgers = linkedLedgerRows(rows.ledgers, { executionRequestId });
    const transfers = linkedTransferRows(rows.transfers as Array<Record<string, unknown>>, {
      executionRequestId
    });
    const internalDebitAmount = sumDebits(ledgers as unknown as Array<Record<string, unknown>>);
    const pendingAmount = sumTransferAmount(transfers, [
      "provider_pending",
      "provider_request_sent",
      "provider_request_created"
    ]);
    const unknownAmount = sumTransferAmount(transfers, ["provider_unknown"]);
    const exposureAmount = Math.max(internalDebitAmount, pendingAmount, unknownAmount);

    const metaUser = metadataString(execution.metadata, "user_id");
    const metaWallet = metadataString(execution.metadata, "wallet_id");
    const metaWalletAccount = metadataString(execution.metadata, "wallet_account_id");
    const metaSaga = metaSagaFromMetadata;
    const metaPipeline = metaPipelineFromMetadata;

    const timing = buildTiming({
      stuckType,
      startedAt: execution.created_at,
      updatedAt: execution.updated_at,
      lastProgressAt: newestDate([
        execution.updated_at,
        ...ledgers.map((ledger) => ledger.created_at),
        ...transfers.map((transfer) => String(transfer.updated_at ?? ""))
      ]),
      now
    });

    results.push(
      await signal({
        stuckType,
        scanScope: "single_execution",
        linkedObjectIds: {
          userId: metaUser,
          walletId: metaWallet,
          walletAccountId: metaWalletAccount,
          sagaId: metaSaga,
          pipelineId: metaPipeline,
          executionRequestId,
          policyDecisionId: execution.source_policy_decision_id,
          ledgerEntryId: ledgers[0]?.ledger_entry_id ?? null,
          externalTransferId: transfers[0]?.external_transfer_id
            ? String(transfers[0].external_transfer_id)
            : null
        },
        timing,
        moneyExposure: {
          internalDebitAmount,
          externalTransferAmount: sumTransferAmount(transfers),
          pendingAmount,
          unknownAmount,
          compensationAmount: 0,
          exposureAmount
        },
        riskScores: defaultRiskScores({
          orchestrationRiskScore: 0.8,
          financialExposureScore:
            exposureAmount > 0 || isMoneyTarget(targetSystem) ? 0.9 : 0.25,
          userImpactScore: exposureAmount > 0 ? 0.85 : 0.35,
          platformImpactScore: 0.75,
          retryExhaustionScore:
            status.includes("dead_letter") || stuckType === "execution_retry_exhausted"
              ? 0.95
              : 0.3,
          uncertaintyScore:
            unknownAmount > 0 || stuckType === "execution_money_mutation_uncertain" ? 0.95 : 0.55,
          confidenceScore: 0.92
        }),
        evidence: { execution, ledgers, transfers } as unknown as Json,
        redactedEvidence: {
          executionRequestId,
          status,
          targetSystem,
          action: execution.action,
          ledgerCount: ledgers.length,
          transferCount: transfers.length,
          exposureAmount
        } as unknown as Json,
        sourceEventIds: [],
        stuckDetected: true,
        moneyMovementAffected: exposureAmount > 0 || isMoneyTarget(targetSystem),
        providerAffected: transfers.length > 0,
        userVisibleAffected: exposureAmount > 0,
        retryExhausted:
          status === "execution_dead_lettered" || stuckType === "execution_retry_exhausted",
        reviewAlreadyExists: hasOpenReviewForObject({
          reviews: rows.reviews as Array<Record<string, unknown>>,
          executionRequestId
        }),
        now,
        metadata: { scanner: "execution" } as unknown as Json
      })
    );
  }

  return results;
}

async function scanExternalTransferRows(rows: ScanBundle, now: string) {
  const results: StuckSagaPersistRow[] = [];

  for (const transfer of rows.transfers as Array<Record<string, unknown>>) {
    const externalTransferId = String(transfer.external_transfer_id ?? "");
    if (!externalTransferId) continue;

    const hasReconciliation = transferHasReconciliation(externalTransferId, rows.reconciliations);

    let stuckType: StuckSagaType | null = null;

    if (!transfer.original_execution_request_id && !transfer.pipeline_id && !transfer.saga_id) {
      stuckType = "orphan_external_transfer";
    }

    if (!stuckType && !hasReconciliation) {
      stuckType = "provider_polling_missing_after_transfer";
    }

    if (!stuckType) continue;

    const linkedLedgers = linkedLedgerRows(rows.ledgers, {
      externalTransferId,
      executionRequestId: transfer.original_execution_request_id
        ? String(transfer.original_execution_request_id)
        : null,
      pipelineId: transfer.pipeline_id ? String(transfer.pipeline_id) : null,
      sagaId: transfer.saga_id ? String(transfer.saga_id) : null
    });

    const internalDebitAmount = sumDebits(linkedLedgers as unknown as Array<Record<string, unknown>>);
    const externalTransferAmount = toNumber(transfer.amount);
    const pendingAmount = ["provider_pending", "provider_request_sent", "provider_request_created"].includes(
      String(transfer.status)
    )
      ? externalTransferAmount
      : 0;
    const unknownAmount = String(transfer.status) === "provider_unknown" ? externalTransferAmount : 0;
    const exposureAmount = Math.max(internalDebitAmount, pendingAmount, unknownAmount, externalTransferAmount);

    const timing = buildTiming({
      stuckType,
      startedAt: String(transfer.created_at ?? ""),
      updatedAt: String(transfer.updated_at ?? ""),
      lastProgressAt: String(transfer.updated_at ?? ""),
      now
    });

    results.push(
      await signal({
        stuckType,
        scanScope: "single_external_transfer",
        linkedObjectIds: {
          userId: transfer.user_id ? String(transfer.user_id) : null,
          walletId: transfer.wallet_id ? String(transfer.wallet_id) : null,
          walletAccountId: transfer.wallet_account_id ? String(transfer.wallet_account_id) : null,
          sagaId: transfer.saga_id ? String(transfer.saga_id) : null,
          pipelineId: transfer.pipeline_id ? String(transfer.pipeline_id) : null,
          executionRequestId: transfer.original_execution_request_id
            ? String(transfer.original_execution_request_id)
            : null,
          ledgerEntryId: transfer.original_ledger_entry_id
            ? String(transfer.original_ledger_entry_id)
            : linkedLedgers[0]?.ledger_entry_id ?? null,
          externalTransferId
        },
        timing,
        moneyExposure: {
          internalDebitAmount,
          externalTransferAmount,
          pendingAmount,
          unknownAmount,
          compensationAmount: 0,
          exposureAmount
        },
        riskScores: defaultRiskScores({
          orchestrationRiskScore: 0.75,
          financialExposureScore: 0.95,
          userImpactScore: 0.9,
          platformImpactScore: 0.85,
          retryExhaustionScore: 0.25,
          uncertaintyScore: hasReconciliation ? 0.45 : 0.9,
          confidenceScore: 0.94
        }),
        evidence: { transfer, linkedLedgers, hasReconciliation } as unknown as Json,
        redactedEvidence: {
          externalTransferId,
          status: transfer.status,
          amount: transfer.amount,
          hasReconciliation,
          linkedLedgerCount: linkedLedgers.length
        } as unknown as Json,
        sourceEventIds: [],
        stuckDetected: true,
        moneyMovementAffected: true,
        providerAffected: true,
        userVisibleAffected: true,
        retryExhausted: false,
        reviewAlreadyExists: hasOpenReviewForObject({
          reviews: rows.reviews as Array<Record<string, unknown>>,
          externalTransferId
        }),
        now,
        metadata: { scanner: "external_transfer" } as unknown as Json
      })
    );
  }

  return results;
}

export async function runStuckSagaScan(params?: {
  olderThanMinutes?: number;
  limit?: number;
}): Promise<StuckSagaScannerResult> {
  const rows = await fetchStuckSagaScanRowsDb({
    olderThanMinutes: params?.olderThanMinutes ?? 15,
    limit: params?.limit ?? 100
  });

  const now = new Date().toISOString();

  const groupedResults: StuckSagaPersistRow[] = [
    ...(await scanSagaRows(rows, now)),
    ...(await scanPipelineRows(rows, now)),
    ...(await scanExecutionRows(rows, now)),
    ...(await scanExternalTransferRows(rows, now))
  ];

  const sourceEventIds: string[] = [];
  const createdAlertIds: string[] = [];
  const createdReviewCaseIds: string[] = [];

  for (const item of groupedResults) {
    const ids = collectSidecarIds(item);
    sourceEventIds.push(...ids.eventIds);
    createdAlertIds.push(...ids.alertIds);
    createdReviewCaseIds.push(...ids.reviewCaseIds);
  }

  const failedCount = groupedResults.filter(
    (item) => item.evaluation.failed || item.evaluation.critical
  ).length;

  const warningCount = groupedResults.filter((item) => item.evaluation.warning).length;

  return {
    ok: failedCount === 0,
    resultPayload: {
      stuckResultsCreated: groupedResults.length,
      failedCount,
      warningCount
    } as unknown as Json,
    scannedObjectCounts: {
      sagas: rows.sagas.length,
      pipelines: rows.pipelines.length,
      executions: rows.executions.length,
      externalTransfers: rows.transfers.length,
      ledgers: rows.ledgers.length,
      reconciliations: rows.reconciliations.length,
      compensations: rows.compensations.length,
      reviews: rows.reviews.length
    },
    mutationCounts: {
      stuckResultsCreated: groupedResults.length,
      alertsCreated: createdAlertIds.length,
      reviewCasesCreated: createdReviewCaseIds.length
    },
    sourceEventIds,
    createdAlertIds,
    createdReviewCaseIds,
    reasonCodes:
      failedCount > 0
        ? ["stuck_saga_scan_completed_with_failures"]
        : ["stuck_saga_scan_completed"],
    retryable: false
  };
}
