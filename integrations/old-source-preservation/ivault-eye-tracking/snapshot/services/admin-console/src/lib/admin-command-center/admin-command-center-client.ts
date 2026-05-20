import type { AdminCommandLinkedObjectIds } from "@/types/alphabet/admin-command-center.types";

/** Dev default; override with `NEXT_PUBLIC_ADMIN_ACTOR_ID` for consistent assignment in UI. */
export const DEV_ADMIN_ACTOR_ID =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_ACTOR_ID
    ? process.env.NEXT_PUBLIC_ADMIN_ACTOR_ID
    : "00000000-0000-4000-8000-000000000001";

export function adminCommandCenterHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-role": "admin",
    "x-user-id": DEV_ADMIN_ACTOR_ID
  };
}

export interface AdminCommandItemRow {
  command_item_id: string;

  item_type: string;
  queue_scope: string;
  status: string;
  severity: string;
  priority: string;

  title: string;
  summary: string;

  user_id?: string | null;
  creator_id?: string | null;
  wallet_id?: string | null;
  wallet_account_id?: string | null;
  campaign_id?: string | null;
  payout_id?: string | null;
  external_transfer_id?: string | null;
  ledger_entry_id?: string | null;
  policy_decision_id?: string | null;
  review_case_id?: string | null;
  alert_id?: string | null;
  device_cluster_id?: string | null;
  identity_cluster_id?: string | null;
  presence_session_id?: string | null;
  alphabet_event_id?: string | null;
  stuck_saga_result_id?: string | null;
  wallet_invariant_result_id?: string | null;
  financial_reconciliation_report_id?: string | null;
  audit_integrity_report_id?: string | null;
  trust_fraud_batch_id?: string | null;

  source_object_type?: string | null;
  source_object_id?: string | null;

  recommended_actions: string[];
  approved_actions: string[];
  rejected_actions: string[];

  evidence: unknown;
  redacted_evidence: unknown;

  source_event_ids: string[];
  linked_alert_ids: string[];
  linked_review_case_ids: string[];

  assigned_to_admin_id?: string | null;
  due_at?: string | null;

  reason_codes: string[];
  tags: string[];

  created_at: string;
  updated_at: string;
}

export function linkedObjectIdsFromItemRow(item: AdminCommandItemRow): AdminCommandLinkedObjectIds {
  return {
    userId: item.user_id ?? null,
    creatorId: item.creator_id ?? null,
    walletId: item.wallet_id ?? null,
    walletAccountId: item.wallet_account_id ?? null,
    campaignId: item.campaign_id ?? null,
    payoutId: item.payout_id ?? null,
    externalTransferId: item.external_transfer_id ?? null,
    ledgerEntryId: item.ledger_entry_id ?? null,
    policyDecisionId: item.policy_decision_id ?? null,
    reviewCaseId: item.review_case_id ?? null,
    alertId: item.alert_id ?? null,
    deviceClusterId: item.device_cluster_id ?? null,
    identityClusterId: item.identity_cluster_id ?? null,
    presenceSessionId: item.presence_session_id ?? null,
    alphabetEventId: item.alphabet_event_id ?? null,
    stuckSagaResultId: item.stuck_saga_result_id ?? null,
    walletInvariantResultId: item.wallet_invariant_result_id ?? null,
    financialReconciliationReportId: item.financial_reconciliation_report_id ?? null,
    auditIntegrityReportId: item.audit_integrity_report_id ?? null,
    trustFraudBatchId: item.trust_fraud_batch_id ?? null
  };
}

export interface AdminCommandSummary {
  totalOpen: number;
  urgentCount: number;
  criticalCount: number;
  assignedToMeCount: number;
  waitingForEvidenceCount: number;
  actionRecommendedCount: number;
  financeCount: number;
  walletCount: number;
  payoutCount: number;
  complianceCount: number;
  systemCount: number;
}

export async function fetchAdminCommandSummary(): Promise<AdminCommandSummary> {
  const res = await fetch("/api/admin/command-center/summary", {
    cache: "no-store",
    headers: adminCommandCenterHeaders()
  });

  if (!res.ok) throw new Error("Failed to fetch command center summary.");

  const json = (await res.json()) as { summary: AdminCommandSummary };
  return json.summary;
}

export async function fetchAdminCommandItems(params?: {
  status?: string;
  severity?: string;
  priority?: string;
  queueScope?: string;
  assignedToAdminId?: string;
  limit?: number;
}): Promise<AdminCommandItemRow[]> {
  const query = new URLSearchParams();

  if (params?.status) query.set("status", params.status);
  if (params?.severity) query.set("severity", params.severity);
  if (params?.priority) query.set("priority", params.priority);
  if (params?.queueScope) query.set("queueScope", params.queueScope);
  if (params?.assignedToAdminId) query.set("assignedToAdminId", params.assignedToAdminId);
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await fetch(`/api/admin/command-center/items?${query.toString()}`, {
    cache: "no-store",
    headers: adminCommandCenterHeaders()
  });

  if (!res.ok) throw new Error("Failed to fetch command items.");

  const json = (await res.json()) as { items?: AdminCommandItemRow[] };
  return json.items ?? [];
}

export async function fetchAdminCommandItem(itemId: string): Promise<{
  ok: boolean;
  item: AdminCommandItemRow;
  timeline: { decisions?: unknown[]; notes?: unknown[] };
}> {
  const res = await fetch(`/api/admin/command-center/items/${itemId}`, {
    cache: "no-store",
    headers: adminCommandCenterHeaders()
  });

  if (!res.ok) throw new Error("Failed to fetch command item.");

  return res.json() as Promise<{
    ok: boolean;
    item: AdminCommandItemRow;
    timeline: { decisions?: unknown[]; notes?: unknown[] };
  }>;
}

export async function postCommandCenterSync(): Promise<unknown> {
  const res = await fetch("/api/admin/command-center", {
    method: "POST",
    headers: adminCommandCenterHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { message?: string }).message ?? "Sync failed.");
  return json;
}
