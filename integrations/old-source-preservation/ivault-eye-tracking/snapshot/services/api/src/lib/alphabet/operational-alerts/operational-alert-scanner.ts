import type { Json } from "@/types/alphabet/database.types";
import type { OperationalAlertLinkedObjectIds } from "@/types/alphabet/operational-alert.types";
import type { SystemTimelineAnomaly } from "@/types/alphabet/system-timeline.types";
import type { SystemTimelineAnomalyType } from "@/types/alphabet/system-timeline.types";
import { createServiceDbClient } from "../db-client";
import { getSystemTimeline } from "../system-timeline/system-timeline-store";
import { createOperationalAlertFromPartial } from "./operational-alert-store";

function isMissingRelation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "42P01" || Boolean(e.message?.includes("does not exist"));
}

/** Maps system-timeline anomaly types to operational alert types (exported for tests). */
export function operationalAlertTypeFromTimelineAnomaly(
  anomalyType: SystemTimelineAnomalyType
):
  | "provider_unknown_without_review"
  | "provider_failure_without_compensation"
  | "compensation_completed_without_reversal"
  | "ledger_without_execution"
  | "reversal_without_original"
  | "external_transfer_success_without_debit"
  | "dedupe_duplicate_spike"
  | "audit_risk_high"
  | null {
  switch (anomalyType) {
    case "provider_unknown_without_review":
      return "provider_unknown_without_review";
    case "provider_failure_without_compensation_or_review":
      return "provider_failure_without_compensation";
    case "compensation_without_reversal":
      return "compensation_completed_without_reversal";
    case "transfer_success_without_debit":
      return "external_transfer_success_without_debit";
    case "ledger_without_execution":
      return "ledger_without_execution";
    case "reversal_without_original":
      return "reversal_without_original";
    case "duplicate_mutation_risk":
      return "dedupe_duplicate_spike";
    case "unreviewed_high_risk_state":
    case "missing_link":
    case "orphan_object":
    case "inconsistent_state":
      return "audit_risk_high";
    default:
      return null;
  }
}

function linkedIdsForAnomaly(anomaly: SystemTimelineAnomaly): OperationalAlertLinkedObjectIds {
  const base: OperationalAlertLinkedObjectIds = {
    userId: null,
    externalTransferId: null,
    compensationId: null,
    ledgerEntryId: null,
    originalLedgerEntryId: null,
    executionRequestId: null,
    walletId: null
  };

  if (anomaly.objectType === "external_transfer") {
    base.externalTransferId = anomaly.objectId;
  } else if (anomaly.objectType === "compensation") {
    base.compensationId = anomaly.objectId;
  } else if (anomaly.objectType === "ledger_entry") {
    base.ledgerEntryId = anomaly.objectId;
  } else if (anomaly.objectType === "execution_request") {
    base.executionRequestId = anomaly.objectId;
  } else if (anomaly.objectType === "wallet") {
    base.walletId = anomaly.objectId;
  }

  const rel0 = anomaly.relatedObjectIds[0];
  if (rel0 && !base.originalLedgerEntryId) {
    base.originalLedgerEntryId = rel0;
  }

  return base;
}

export async function scanExternalTransferForOperationalAlerts(params: { externalTransferId: string }) {
  const timeline = await getSystemTimeline({
    objectType: "external_transfer",
    objectId: params.externalTransferId,
    includeRawPayloads: false,
    includeServiceOnly: false,
    maxEntries: 250
  });

  const results: Awaited<ReturnType<typeof createOperationalAlertFromPartial>>[] = [];

  for (const anomaly of timeline.anomalies) {
    const alertType = operationalAlertTypeFromTimelineAnomaly(anomaly.anomalyType);
    if (!alertType) continue;

    const linkedObjectIds = linkedIdsForAnomaly(anomaly);
    linkedObjectIds.externalTransferId ??= params.externalTransferId;

    const baseRisk = {
      alertConfidenceScore: 0.92,
      financialRiskScore: 0.88,
      userImpactScore: 0.82,
      platformRiskScore: 0.82,
      exploitabilityScore: 0.35,
      urgencyScore: 0.88,
      recurrenceRiskScore: 0.35
    };

    if (alertType === "audit_risk_high") {
      baseRisk.alertConfidenceScore = 0.72;
      baseRisk.financialRiskScore = 0.45;
    }

    if (alertType === "dedupe_duplicate_spike") {
      baseRisk.financialRiskScore = 0.55;
      baseRisk.alertConfidenceScore = 0.78;
    }

    results.push(
      await createOperationalAlertFromPartial({
        alertType,
        alertSource: "system_timeline",
        linkedObjectIds,
        evidence: anomaly.evidence as Record<string, unknown>,
        redactedEvidence: anomaly.redactedEvidence as Record<string, unknown>,
        publicSummary: anomaly.title,
        internalSummary: anomaly.summary,
        sourceAnomalyIds: [anomaly.anomalyId],
        sourceEventIds: [],
        riskScores: baseRisk,
        metadata: { timelineRoot: params.externalTransferId, anomalyType: anomaly.anomalyType }
      })
    );
  }

  return {
    checked: params.externalTransferId,
    anomalies: timeline.anomalies.length,
    created: results.length,
    results
  };
}

export async function scanPendingExternalTransfers(params?: {
  olderThanMinutes?: number;
  limit?: number;
}): Promise<{ checked: number; created: number; transferIds: string[] }> {
  const db = createServiceDbClient();
  const olderThanMinutes = params?.olderThanMinutes ?? 60;
  const limit = params?.limit ?? 50;
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();

  const { data: rows, error } = await db
    .from("external_transfers")
    .select(
      "external_transfer_id,user_id,wallet_id,wallet_account_id,status,updated_at,original_execution_request_id,pipeline_id,saga_id"
    )
    .in("status", ["provider_pending", "provider_request_sent", "provider_request_created"])
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      return { checked: 0, created: 0, transferIds: [] };
    }
    throw error;
  }

  const list = rows ?? [];
  const transferIds: string[] = [];

  for (const row of list) {
    const r = row as Record<string, unknown>;
    const id = String(r.external_transfer_id);
    transferIds.push(id);

    await createOperationalAlertFromPartial({
      alertType: "payout_stuck_pending",
      alertSource: "scheduled_scanner",
      linkedObjectIds: {
        userId: (r.user_id as string | null) ?? null,
        walletId: (r.wallet_id as string | null) ?? null,
        walletAccountId: (r.wallet_account_id as string | null) ?? null,
        externalTransferId: id,
        executionRequestId: (r.original_execution_request_id as string | null) ?? null,
        pipelineId: (r.pipeline_id as string | null) ?? null,
        sagaId: (r.saga_id as string | null) ?? null
      },
      evidence: {
        status: r.status,
        updatedAt: r.updated_at,
        cutoff
      } as Record<string, unknown>,
      publicSummary: "Payout has been pending longer than expected.",
      internalSummary: `External transfer ${id} stuck in provider-pending states beyond ${olderThanMinutes} minutes.`,
      riskScores: {
        alertConfidenceScore: 0.9,
        financialRiskScore: 0.75,
        userImpactScore: 0.8,
        platformRiskScore: 0.75,
        exploitabilityScore: 0.2,
        urgencyScore: 0.7,
        recurrenceRiskScore: 0.35
      },
      metadata: { scan: "payout_stuck_pending" }
    });
  }

  return { checked: list.length, created: list.length, transferIds };
}

const OPEN_REVIEW_SLA_STATUSES = [
  "review_created",
  "review_queued",
  "review_assigned",
  "review_in_progress",
  "review_needs_more_info",
  "review_escalated"
] as const;

export async function scanReviewSlaBreaches(params?: {
  limit?: number;
}): Promise<{ checked: number; created: number; reviewCaseIds: string[] }> {
  const db = createServiceDbClient();
  const limit = params?.limit ?? 50;
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await db
    .from("admin_review_cases")
    .select("*")
    .not("due_at", "is", null)
    .lt("due_at", nowIso)
    .is("breached_at", null)
    .in("status", [...OPEN_REVIEW_SLA_STATUSES])
    .order("due_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      return { checked: 0, created: 0, reviewCaseIds: [] };
    }
    throw error;
  }

  const list = rows ?? [];
  const reviewCaseIds: string[] = [];

  for (const row of list) {
    const r = row as Record<string, unknown>;
    const reviewCaseId = String(r.review_case_id);
    reviewCaseIds.push(reviewCaseId);

    const hasMoneyAdj = Boolean(r.external_transfer_id || r.compensation_id);

    await createOperationalAlertFromPartial({
      alertType: "review_sla_breached",
      alertSource: "admin_review",
      linkedObjectIds: {
        userId: (r.user_id as string | null) ?? null,
        walletId: (r.wallet_id as string | null) ?? null,
        reviewCaseId,
        externalTransferId: (r.external_transfer_id as string | null) ?? null,
        compensationId: (r.compensation_id as string | null) ?? null,
        executionRequestId: (r.execution_request_id as string | null) ?? null
      },
      evidence: r as Record<string, unknown>,
      redactedEvidence: (r.redacted_evidence as Json as object) as Record<string, unknown>,
      publicSummary: "Review case breached its SLA.",
      internalSummary: `Admin review ${reviewCaseId} is past due_at (${String(r.due_at)}).`,
      riskScores: {
        alertConfidenceScore: 0.95,
        financialRiskScore: hasMoneyAdj ? 0.8 : 0.4,
        userImpactScore: 0.7,
        platformRiskScore: 0.7,
        exploitabilityScore: 0.15,
        urgencyScore: 0.85,
        recurrenceRiskScore: 0.4
      },
      metadata: { scan: "review_sla_breached" }
    });
  }

  return { checked: list.length, created: list.length, reviewCaseIds };
}

export async function scanWalletInvariantViolations(params?: {
  limit?: number;
}): Promise<{ checked: number; created: number }> {
  const db = createServiceDbClient();
  const limit = params?.limit ?? 50;

  const { data: rows, error } = await db
    .from("wallet_invariant_results")
    .select("*")
    .not("status", "eq", "passed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      return { checked: 0, created: 0 };
    }
    throw error;
  }

  const list = rows ?? [];

  for (const row of list) {
    const r = row as Record<string, unknown>;
    const invariantType = String(r.invariant_type ?? "");
    const reasonBlob = `${invariantType} ${JSON.stringify(r.reason_codes ?? [])}`.toLowerCase();
    const isNegative =
      reasonBlob.includes("negative") || invariantType.toLowerCase().includes("negative_balance");
    const isCampaign = invariantType.toLowerCase().includes("campaign") || Boolean(r.campaign_id);

    const alertType = isNegative
      ? "wallet_negative_balance"
      : isCampaign
        ? "campaign_budget_invariant_broken"
        : "audit_risk_high";

    await createOperationalAlertFromPartial({
      alertType,
      alertSource: "wallet",
      linkedObjectIds: {
        userId: (r.user_id as string | null) ?? null,
        walletId: (r.wallet_id as string | null) ?? null,
        walletAccountId: (r.wallet_account_id as string | null) ?? null,
        ledgerEntryId: (r.ledger_entry_id as string | null) ?? null,
        originalLedgerEntryId: (r.original_ledger_entry_id as string | null) ?? null,
        reversalLedgerEntryId: (r.reversal_ledger_entry_id as string | null) ?? null,
        externalTransferId: (r.external_transfer_id as string | null) ?? null,
        compensationId: (r.compensation_id as string | null) ?? null,
        campaignId: (r.campaign_id as string | null) ?? null,
        executionRequestId: (r.execution_request_id as string | null) ?? null,
        pipelineId: (r.pipeline_id as string | null) ?? null,
        sagaId: (r.saga_id as string | null) ?? null
      },
      evidence: r as Record<string, unknown>,
      redactedEvidence: (r.redacted_evidence as Json as object) as Record<string, unknown>,
      publicSummary:
        alertType === "wallet_negative_balance"
          ? "Wallet invariant scan detected a negative or inconsistent balance."
          : alertType === "campaign_budget_invariant_broken"
            ? "Campaign budget invariant may be broken."
            : "Wallet invariant scan raised a high audit-risk signal.",
      internalSummary: `wallet_invariant_results ${String(r.invariant_result_id)} status=${String(r.status)} type=${invariantType}`,
      sourceAnomalyIds: [String(r.invariant_result_id)],
      sourceEventIds: (r.source_event_ids as string[] | undefined) ?? [],
      riskScores: {
        alertConfidenceScore: alertType === "audit_risk_high" ? 0.7 : 0.88,
        financialRiskScore:
          alertType === "wallet_negative_balance" ? 0.92 : alertType === "campaign_budget_invariant_broken" ? 0.78 : 0.5,
        userImpactScore: 0.75,
        platformRiskScore: 0.8,
        exploitabilityScore: 0.25,
        urgencyScore: 0.82,
        recurrenceRiskScore: 0.35
      },
      metadata: { scan: "wallet_invariant_results" }
    });
  }

  return { checked: list.length, created: list.length };
}

export async function scanWorkerDeadLetters(params?: {
  limit?: number;
}): Promise<{ checked: number; created: number }> {
  const db = createServiceDbClient();
  const limit = params?.limit ?? 50;

  const { data: rows, error } = await db
    .from("scheduled_job_runs")
    .select("*")
    .or("status.eq.job_dead_letter,status.eq.job_dead_lettered,dead_lettered_at.not.is.null")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      return { checked: 0, created: 0 };
    }
    throw error;
  }

  const list = rows ?? [];

  for (const row of list) {
    const r = row as Record<string, unknown>;
    await createOperationalAlertFromPartial({
      alertType: "worker_dead_lettered",
      alertSource: "worker",
      linkedObjectIds: {},
      evidence: r as Record<string, unknown>,
      redactedEvidence: {
        job_key: String(r.job_key ?? ""),
        job_run_id: String(r.job_run_id ?? ""),
        status: String(r.status ?? "")
      },
      publicSummary: "A scheduled job run was dead-lettered.",
      internalSummary: `Job ${String(r.job_key)} run ${String(r.job_run_id)} dead-lettered.`,
      riskScores: {
        alertConfidenceScore: 0.85,
        financialRiskScore: 0.45,
        userImpactScore: 0.55,
        platformRiskScore: 0.78,
        exploitabilityScore: 0.2,
        urgencyScore: 0.72,
        recurrenceRiskScore: 0.4
      },
      metadata: { scan: "scheduled_job_runs_dead_letter" }
    });
  }

  return { checked: list.length, created: list.length };
}

export async function scanIdempotencyConflictSpike(params?: {
  windowMinutes?: number;
  minEvents?: number;
  limit?: number;
}): Promise<{ checked: number; created: number }> {
  const db = createServiceDbClient();
  const windowMinutes = params?.windowMinutes ?? 30;
  const minEvents = params?.minEvents ?? 5;
  const limit = params?.limit ?? 80;
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { data: rows, error } = await db
    .from("alphabet_events")
    .select("event_id,created_at,metadata,user_id")
    .eq("event_type", "idempotency_conflict_detected")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      return { checked: 0, created: 0 };
    }
    throw error;
  }

  const list = rows ?? [];
  if (list.length < minEvents) {
    return { checked: list.length, created: 0 };
  }

  await createOperationalAlertFromPartial({
    alertType: "idempotency_conflict_spike",
    alertSource: "scheduled_scanner",
    linkedObjectIds: {},
    evidence: { windowMinutes, count: list.length, sampleEventIds: list.slice(0, 10).map((r) => (r as { event_id: string }).event_id) },
    publicSummary: "Spike in idempotency conflicts detected.",
    internalSummary: `${list.length} idempotency_conflict_detected events in ${windowMinutes}m window.`,
    riskScores: {
      alertConfidenceScore: 0.82,
      financialRiskScore: 0.55,
      userImpactScore: 0.5,
      platformRiskScore: 0.72,
      exploitabilityScore: 0.35,
      urgencyScore: 0.68,
      recurrenceRiskScore: 0.45
    },
    metadata: { scan: "idempotency_conflict_spike" }
  });

  return { checked: list.length, created: 1 };
}

export async function scanDedupeDuplicateSpike(params?: {
  windowMinutes?: number;
  minEvents?: number;
  limit?: number;
}): Promise<{ checked: number; created: number }> {
  const db = createServiceDbClient();
  const windowMinutes = params?.windowMinutes ?? 60;
  const minEvents = params?.minEvents ?? 8;
  const limit = params?.limit ?? 120;
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { data: rows, error } = await db
    .from("alphabet_events")
    .select("event_id,created_at,user_id")
    .eq("event_type", "dedupe_duplicate_detected")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      return { checked: 0, created: 0 };
    }
    throw error;
  }

  const list = rows ?? [];
  if (list.length < minEvents) {
    return { checked: list.length, created: 0 };
  }

  await createOperationalAlertFromPartial({
    alertType: "dedupe_duplicate_spike",
    alertSource: "scheduled_scanner",
    linkedObjectIds: {},
    evidence: { windowMinutes, count: list.length },
    publicSummary: "Spike in dedupe duplicate detections.",
    internalSummary: `${list.length} dedupe_duplicate_detected events in ${windowMinutes}m.`,
    riskScores: {
      alertConfidenceScore: 0.78,
      financialRiskScore: 0.5,
      userImpactScore: 0.45,
      platformRiskScore: 0.65,
      exploitabilityScore: 0.4,
      urgencyScore: 0.6,
      recurrenceRiskScore: 0.5
    },
    metadata: { scan: "dedupe_duplicate_spike" }
  });

  return { checked: list.length, created: 1 };
}

export async function scanSuspiciousRewardVelocity(params?: {
  windowHours?: number;
  minEventsPerUser?: number;
  limit?: number;
}): Promise<{ checked: number; created: number }> {
  const db = createServiceDbClient();
  const windowHours = params?.windowHours ?? 24;
  const minEventsPerUser = params?.minEventsPerUser ?? 25;
  const limit = params?.limit ?? 400;
  const since = new Date(Date.now() - windowHours * 60 * 60_000).toISOString();

  const { data: rows, error } = await db
    .from("alphabet_events")
    .select("user_id,event_id")
    .in("event_type", ["campaign_reward_authorized", "work_reward_pending"])
    .gte("created_at", since)
    .not("user_id", "is", null)
    .limit(limit);

  if (error) {
    if (isMissingRelation(error)) {
      return { checked: 0, created: 0 };
    }
    throw error;
  }

  const list = rows ?? [];
  const byUser = new Map<string, number>();
  for (const row of list) {
    const uid = String((row as { user_id: string }).user_id);
    byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
  }

  let created = 0;
  for (const [userId, count] of byUser) {
    if (count < minEventsPerUser) continue;
    await createOperationalAlertFromPartial({
      alertType: "suspicious_reward_velocity",
      alertSource: "trust_engine",
      linkedObjectIds: { userId },
      evidence: { windowHours, count, userId },
      publicSummary: "Unusual reward authorization velocity for a user.",
      internalSummary: `${count} reward-related events in ${windowHours}h for user ${userId}.`,
      riskScores: {
        alertConfidenceScore: 0.72,
        financialRiskScore: 0.62,
        userImpactScore: 0.55,
        platformRiskScore: 0.58,
        exploitabilityScore: 0.42,
        urgencyScore: 0.62,
        recurrenceRiskScore: 0.48
      },
      metadata: { scan: "suspicious_reward_velocity" }
    });
    created += 1;
  }

  return { checked: list.length, created };
}

export async function runOperationalAlertScannerOnce(): Promise<{
  pending: { checked: number; created: number };
  sla: { checked: number; created: number };
  wallet: { checked: number; created: number };
  jobs: { checked: number; created: number };
  idempotency: { checked: number; created: number };
  dedupe: { checked: number; created: number };
  rewards: { checked: number; created: number };
  totalCreated: number;
}> {
  const pending = await scanPendingExternalTransfers({ olderThanMinutes: 60, limit: 50 });
  const sla = await scanReviewSlaBreaches({ limit: 50 });
  const wallet = await scanWalletInvariantViolations({ limit: 50 });
  const jobs = await scanWorkerDeadLetters({ limit: 50 });
  const idempotency = await scanIdempotencyConflictSpike({
    windowMinutes: 30,
    minEvents: 5,
    limit: 80
  });
  const dedupe = await scanDedupeDuplicateSpike({
    windowMinutes: 60,
    minEvents: 8,
    limit: 120
  });
  const rewards = await scanSuspiciousRewardVelocity({
    windowHours: 24,
    minEventsPerUser: 25,
    limit: 400
  });

  const totalCreated =
    pending.created +
    sla.created +
    wallet.created +
    jobs.created +
    idempotency.created +
    dedupe.created +
    rewards.created;

  return {
    pending,
    sla,
    wallet,
    jobs,
    idempotency,
    dedupe,
    rewards,
    totalCreated
  };
}
