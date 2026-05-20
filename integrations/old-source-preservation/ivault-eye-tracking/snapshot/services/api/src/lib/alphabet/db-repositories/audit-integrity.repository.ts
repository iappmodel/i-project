import { createServiceDbClient } from "../db-client";
import type { Json } from "@/types/alphabet/database.types";
import type { AuditIntegrityWindowBundle } from "@/types/alphabet/audit-integrity.types";

function isMissingRelation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e.code === "42P01" || Boolean(e.message?.includes("does not exist"));
}

export async function fetchAuditIntegrityWindowBundle(params: {
  periodStart: string;
  periodEnd: string;
  reportDate: string;
  reportScope: string;
}): Promise<AuditIntegrityWindowBundle> {
  const db = createServiceDbClient();

  const [
    ledgersRes,
    auditsRes,
    transfersRes,
    compsRes,
    reconRes,
    finRes,
    eventsRes
  ] = await Promise.all([
    db
      .from("ledger_entries")
      .select("*")
      .gte("created_at", params.periodStart)
      .lte("created_at", params.periodEnd),
    db
      .from("audit_records")
      .select("*")
      .gte("created_at", params.periodStart)
      .lte("created_at", params.periodEnd),
    db
      .from("external_transfers")
      .select("*")
      .gte("created_at", params.periodStart)
      .lte("created_at", params.periodEnd),
    db
      .from("compensation_records")
      .select("*")
      .gte("created_at", params.periodStart)
      .lte("created_at", params.periodEnd),
    db
      .from("provider_reconciliation_records")
      .select("*")
      .gte("created_at", params.periodStart)
      .lte("created_at", params.periodEnd),
    db
      .from("financial_reconciliation_reports")
      .select("*")
      .eq("report_date", params.reportDate)
      .eq("report_scope", params.reportScope),
    db.from("alphabet_events").select("event_id").gte("created_at", params.periodStart).lte("created_at", params.periodEnd)
  ]);

  for (const res of [ledgersRes, auditsRes, transfersRes, compsRes, reconRes, finRes, eventsRes]) {
    if (res.error && !isMissingRelation(res.error)) throw res.error;
  }

  const alphabetEventIds = new Set<string>();
  for (const row of eventsRes.data ?? []) {
    const id = (row as { event_id?: string }).event_id;
    if (id) alphabetEventIds.add(id);
  }

  return {
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    reportDate: params.reportDate,
    reportScope: params.reportScope,
    ledgers: (ledgersRes.data ?? []) as Array<Record<string, unknown>>,
    auditRecords: (auditsRes.data ?? []) as Array<Record<string, unknown>>,
    externalTransfers: (transfersRes.data ?? []) as Array<Record<string, unknown>>,
    compensationRecords: (compsRes.data ?? []) as Array<Record<string, unknown>>,
    providerReconciliations: (reconRes.data ?? []) as Array<Record<string, unknown>>,
    financialReconciliationReports: (finRes.data ?? []) as Array<Record<string, unknown>>,
    alphabetEventIds
  };
}

export async function insertAuditIntegrityReportDb(params: {
  reportScope: string;
  status: string;
  severity: string;
  reportDate: string;
  periodStart: string;
  periodEnd: string;
  gapCount: number;
  criticalGapCount: number;
  ledgerGapCount: number;
  reversalGapCount: number;
  transferGapCount: number;
  compensationGapCount: number;
  providerGapCount: number;
  reconciliationReportGapCount: number;
  scheduledJobGapCount: number;
  alphabetEventGapCount: number;
  trustEvidenceGapCount: number;
  chainBreakGapCount: number;
  riskScore: number;
  complianceScore: number;
  trustScore: number;
  safetyScore: number;
  gaps: Json;
  breakdown: Json;
  sourceEventIds: string[];
  createdAlertIds?: string[];
  createdReviewCaseIds?: string[];
  reasonCodes: string[];
  metadata?: Json;
  generatedBy?: string | null;
}) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("audit_integrity_reports")
    .insert({
      report_scope: params.reportScope,
      status: params.status,
      severity: params.severity,
      report_date: params.reportDate,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      gap_count: params.gapCount,
      critical_gap_count: params.criticalGapCount,
      ledger_gap_count: params.ledgerGapCount,
      reversal_gap_count: params.reversalGapCount,
      transfer_gap_count: params.transferGapCount,
      compensation_gap_count: params.compensationGapCount,
      provider_gap_count: params.providerGapCount,
      reconciliation_report_gap_count: params.reconciliationReportGapCount,
      scheduled_job_gap_count: params.scheduledJobGapCount,
      alphabet_event_gap_count: params.alphabetEventGapCount,
      trust_evidence_gap_count: params.trustEvidenceGapCount,
      chain_break_gap_count: params.chainBreakGapCount,
      risk_score: params.riskScore,
      compliance_score: params.complianceScore,
      trust_score: params.trustScore,
      safety_score: params.safetyScore,
      gaps: params.gaps,
      breakdown: params.breakdown,
      source_event_ids: params.sourceEventIds,
      created_alert_ids: params.createdAlertIds ?? [],
      created_review_case_ids: params.createdReviewCaseIds ?? [],
      reason_codes: params.reasonCodes,
      metadata: params.metadata ?? {},
      generated_by: params.generatedBy ?? "audit_integrity_daily",
      updated_at: now
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function updateAuditIntegrityReportSidecarsDb(params: {
  reportId: string;
  createdAlertIds: string[];
  createdReviewCaseIds: string[];
}) {
  const db = createServiceDbClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("audit_integrity_reports")
    .update({
      created_alert_ids: params.createdAlertIds,
      created_review_case_ids: params.createdReviewCaseIds,
      updated_at: now
    })
    .eq("report_id", params.reportId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function listAuditIntegrityReportsDb(params: {
  limit: number;
  reportDate?: string;
  reportScope?: string;
}) {
  const db = createServiceDbClient();
  let q = db.from("audit_integrity_reports").select("*").order("created_at", { ascending: false }).limit(params.limit);

  if (params.reportDate) {
    q = q.eq("report_date", params.reportDate);
  }
  if (params.reportScope) {
    q = q.eq("report_scope", params.reportScope);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function getAuditIntegrityReportDb(reportId: string) {
  const db = createServiceDbClient();
  const { data, error } = await db.from("audit_integrity_reports").select("*").eq("report_id", reportId).maybeSingle();

  if (error) throw error;
  return data as Record<string, unknown> | null;
}
