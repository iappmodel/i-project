// MOCK / DEMO REPOSITORY
// This module is demo/in-memory/mock-only and not an authoritative backend source of truth.
// Do not use as the final writer for economy, rewards, wallet, trust, or fraud decisions.
// Backend/API + DB event flows remain authoritative per ownership contract.

import type { Json } from "@/types/alphabet/database.types";
import { listRiskInboxAlerts } from "@/lib/alphabet/operational-alerts/operational-alert-store";
import { listAdminReviewCases } from "@/lib/alphabet/admin-review/admin-review-store";

export type AdminCommandItemDbRow = Record<string, unknown> & {
  command_item_id: string;
  source_object_type?: string | null;
  source_object_id?: string | null;
};

const items = new Map<string, AdminCommandItemDbRow>();
const decisions = new Map<string, Record<string, unknown>>();
const decisionsByIdempotency = new Map<string, Record<string, unknown>>();
const notes = new Map<string, Record<string, unknown>>();

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function findAdminCommandItemBySourceDb(
  sourceObjectType: string,
  sourceObjectId: string
): AdminCommandItemDbRow | null {
  for (const row of items.values()) {
    if (row.source_object_type === sourceObjectType && row.source_object_id === sourceObjectId) {
      return row;
    }
  }
  return null;
}

export async function insertAdminCommandItemDb(params: {
  itemType: string;
  queueScope: string;
  status: string;
  severity: string;
  priority: string;
  title: string;
  summary: string;

  linkedObjectIds?: Record<string, string | null | undefined>;

  sourceObjectType?: string | null;
  sourceObjectId?: string | null;

  recommendedActions?: string[];

  evidence?: Json;
  redactedEvidence?: Json;

  sourceEventIds?: string[];
  linkedAlertIds?: string[];
  linkedReviewCaseIds?: string[];

  dueAt?: string | null;

  reasonCodes?: string[];
  tags?: string[];
  metadata?: Json;
}): Promise<AdminCommandItemDbRow> {
  const ids = params.linkedObjectIds ?? {};
  const now = new Date().toISOString();
  const commandItemId = crypto.randomUUID();

  const row: AdminCommandItemDbRow = {
    command_item_id: commandItemId,
    item_type: params.itemType,
    queue_scope: params.queueScope,
    status: params.status,
    severity: params.severity,
    priority: params.priority,
    title: params.title,
    summary: params.summary,

    user_id: ids.userId ?? null,
    creator_id: ids.creatorId ?? null,
    wallet_id: ids.walletId ?? null,
    wallet_account_id: ids.walletAccountId ?? null,
    campaign_id: ids.campaignId ?? null,
    payout_id: ids.payoutId ?? null,
    external_transfer_id: ids.externalTransferId ?? null,
    ledger_entry_id: ids.ledgerEntryId ?? null,
    policy_decision_id: ids.policyDecisionId ?? null,
    review_case_id: ids.reviewCaseId ?? null,
    alert_id: ids.alertId ?? null,
    device_cluster_id: ids.deviceClusterId ?? null,
    identity_cluster_id: ids.identityClusterId ?? null,
    presence_session_id: ids.presenceSessionId ?? null,
    alphabet_event_id: ids.alphabetEventId ?? null,
    stuck_saga_result_id: ids.stuckSagaResultId ?? null,
    wallet_invariant_result_id: ids.walletInvariantResultId ?? null,
    financial_reconciliation_report_id: ids.financialReconciliationReportId ?? null,
    audit_integrity_report_id: ids.auditIntegrityReportId ?? null,
    trust_fraud_batch_id: ids.trustFraudBatchId ?? null,

    source_object_type: params.sourceObjectType ?? null,
    source_object_id: params.sourceObjectId ?? null,

    recommended_actions: params.recommendedActions ?? [],
    approved_actions: [] as string[],
    rejected_actions: [] as string[],

    evidence: params.evidence ?? {},
    redacted_evidence: params.redactedEvidence ?? {},

    source_event_ids: params.sourceEventIds ?? [],
    linked_alert_ids: params.linkedAlertIds ?? [],
    linked_review_case_ids: params.linkedReviewCaseIds ?? [],

    due_at: params.dueAt ?? null,

    reason_codes: params.reasonCodes ?? [],
    tags: params.tags ?? [],
    metadata: params.metadata ?? {},

    assigned_to_admin_id: null,
    assigned_at: null,
    assigned_by_admin_id: null,
    resolved_at: null,
    resolved_by_admin_id: null,
    dismissed_at: null,
    dismissed_by_admin_id: null,
    escalated_at: null,
    escalated_by_admin_id: null,

    created_at: now,
    updated_at: now
  };

  items.set(commandItemId, row);
  return row;
}

export async function listAdminCommandItemsDb(params?: {
  status?: string | null;
  severity?: string | null;
  priority?: string | null;
  queueScope?: string | null;
  assignedToAdminId?: string | null;
  limit?: number;
}): Promise<AdminCommandItemDbRow[]> {
  let list = [...items.values()];

  if (params?.status) list = list.filter((r) => r.status === params.status);
  if (params?.severity) list = list.filter((r) => r.severity === params.severity);
  if (params?.priority) list = list.filter((r) => r.priority === params.priority);
  if (params?.queueScope) list = list.filter((r) => r.queue_scope === params.queueScope);
  if (params?.assignedToAdminId) {
    list = list.filter((r) => r.assigned_to_admin_id === params.assignedToAdminId);
  }

  list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const limit = params?.limit ?? 100;
  return list.slice(0, limit);
}

export async function getAdminCommandItemDb(commandItemId: string): Promise<AdminCommandItemDbRow | null> {
  return items.get(commandItemId) ?? null;
}

export async function updateAdminCommandItemDb(params: {
  commandItemId: string;
  patch: Record<string, unknown>;
}): Promise<AdminCommandItemDbRow> {
  const prev = items.get(params.commandItemId);
  if (!prev) throw new Error("admin_command_item_not_found");

  const now = new Date().toISOString();
  const next = { ...prev, ...params.patch, updated_at: now } as AdminCommandItemDbRow;
  items.set(params.commandItemId, next);
  return next;
}

export async function getAdminCommandDecisionByIdempotencyDb(
  idempotencyKey: string
): Promise<Record<string, unknown> | null> {
  return decisionsByIdempotency.get(idempotencyKey) ?? null;
}

export async function insertAdminCommandDecisionDb(params: {
  commandItemId: string;
  actorAdminId: string;
  actorRole: string;
  decisionType: string;
  decisionStatus: string;
  requestedAction?: string | null;
  approvedAction?: string | null;
  rejectedAction?: string | null;
  reasonCodes: string[];
  evidenceSummary: string;
  linkedObjectIds: Json;
  beforeState: Json;
  afterState: Json;
  idempotencyKey: string;
  dedupeKey: string;
  sourceEventIds?: string[];
  metadata?: Json;
}): Promise<Record<string, unknown>> {
  if (decisionsByIdempotency.has(params.idempotencyKey)) {
    return decisionsByIdempotency.get(params.idempotencyKey)!;
  }

  const id = newId("cmd_dec");
  const now = new Date().toISOString();
  const row = {
    command_decision_id: id,
    command_item_id: params.commandItemId,
    actor_admin_id: params.actorAdminId,
    actor_role: params.actorRole,
    decision_type: params.decisionType,
    decision_status: params.decisionStatus,
    requested_action: params.requestedAction ?? null,
    approved_action: params.approvedAction ?? null,
    rejected_action: params.rejectedAction ?? null,
    reason_codes: params.reasonCodes,
    evidence_summary: params.evidenceSummary,
    linked_object_ids: params.linkedObjectIds,
    before_state: params.beforeState,
    after_state: params.afterState,
    idempotency_key: params.idempotencyKey,
    dedupe_key: params.dedupeKey,
    source_event_ids: params.sourceEventIds ?? [],
    metadata: params.metadata ?? {},
    created_at: now
  };

  decisions.set(id, row);
  decisionsByIdempotency.set(params.idempotencyKey, row);
  return row;
}

export async function insertAdminCommandNoteDb(params: {
  commandItemId: string;
  actorAdminId: string;
  actorRole: string;
  noteBody: string;
  visibility?: string;
  evidenceRefs?: Json;
  sourceEventIds?: string[];
  metadata?: Json;
}): Promise<Record<string, unknown>> {
  const id = newId("cmd_note");
  const now = new Date().toISOString();
  const row = {
    command_note_id: id,
    command_item_id: params.commandItemId,
    actor_admin_id: params.actorAdminId,
    actor_role: params.actorRole,
    note_body: params.noteBody,
    visibility: params.visibility ?? "internal",
    evidence_refs: params.evidenceRefs ?? [],
    source_event_ids: params.sourceEventIds ?? [],
    metadata: params.metadata ?? {},
    created_at: now
  };
  notes.set(id, row);
  return row;
}

export async function listAdminCommandItemTimelineDb(commandItemId: string): Promise<{
  decisions: Record<string, unknown>[];
  notes: Record<string, unknown>[];
}> {
  const decs = [...decisions.values()].filter(
    (d) => (d as { command_item_id?: string }).command_item_id === commandItemId
  );
  const nts = [...notes.values()].filter(
    (n) => (n as { command_item_id?: string }).command_item_id === commandItemId
  );

  decs.sort((a, b) => String((b as { created_at?: string }).created_at).localeCompare(String((a as { created_at?: string }).created_at)));
  nts.sort((a, b) => String((b as { created_at?: string }).created_at).localeCompare(String((a as { created_at?: string }).created_at)));

  return { decisions: decs, notes: nts };
}

/** Source rows for queue sync (in-memory stores; extend when DB tables exist). */
export async function fetchCommandCenterSourceRowsDb(): Promise<{
  operationalAlerts: ReturnType<typeof listRiskInboxAlerts>;
  adminReviewCases: ReturnType<typeof listAdminReviewCases>;
  walletInvariantResults: unknown[];
  stuckSagaResults: unknown[];
  financialReconciliationReports: unknown[];
  auditIntegrityReports: unknown[];
  trustFraudReviewBatches: unknown[];
}> {
  const operationalAlerts = listRiskInboxAlerts({ limit: 500 }).filter((a) => a.status !== "alert_resolved");

  const adminReviewCases = listAdminReviewCases({ limit: 500 }).filter((c) => {
    const s = String(c.status);
    return !["review_approved", "review_rejected", "review_canceled", "review_closed"].includes(s);
  });

  return {
    operationalAlerts,
    adminReviewCases,
    walletInvariantResults: [],
    stuckSagaResults: [],
    financialReconciliationReports: [],
    auditIntegrityReports: [],
    trustFraudReviewBatches: []
  };
}
