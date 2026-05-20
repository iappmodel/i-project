// MOCK / DEMO STORE
// This module is demo/in-memory/mock-only and not an authoritative backend source of truth.
// Do not use as the final writer for economy, rewards, wallet, trust, or fraud decisions.
// Backend/API + DB event flows remain authoritative per ownership contract.

import type { RiskInboxAlertRow } from "@/lib/risk-inbox/risk-inbox-client";

const alerts = new Map<string, RiskInboxAlertRow>();

let seeded = false;

function seedIfNeeded(): void {
  if (seeded) return;
  seeded = true;

  const base = new Date().toISOString();

  const samples: RiskInboxAlertRow[] = [
    {
      alert_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001",
      alert_type: "provider_unknown_without_review",
      alert_source: "system_timeline",
      status: "alert_open",
      severity: "critical",
      priority: "urgent",
      assigned_team: "payments",
      assigned_user_id: null,
      route_reason: "Payment-state alert routed to payments.",
      user_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      wallet_id: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
      external_transfer_id: "dddddddd-dddd-4ddd-dddd-dddddddddddd",
      compensation_id: null,
      provider_reconciliation_id: null,
      review_case_id: null,
      execution_request_id: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee",
      pipeline_id: null,
      saga_id: null,
      ledger_entry_id: null,
      public_summary: "External transfer provider state is unknown and no review case exists.",
      internal_summary: "Timeline anomaly: provider_unknown_without_review.",
      redacted_evidence: { transfer_ref: "****2210", corridor: "US→EU" },
      risk_scores: {
        alertConfidenceScore: 0.95,
        financialRiskScore: 0.95,
        userImpactScore: 0.9,
        platformRiskScore: 0.9,
        exploitabilityScore: 0.4,
        urgencyScore: 0.95,
        recurrenceRiskScore: 0.4
      },
      acknowledged_by_user_id: null,
      acknowledged_at: null,
      resolved_by_user_id: null,
      resolved_at: null,
      resolution_reason_codes: null,
      resolution_notes: null,
      escalated_by_user_id: null,
      escalated_at: null,
      escalation_reason_codes: null,
      created_at: base,
      updated_at: base
    },
    {
      alert_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0002",
      alert_type: "payout_stuck_pending",
      alert_source: "scheduled_scanner",
      status: "alert_acknowledged",
      severity: "high",
      priority: "urgent",
      assigned_team: "payments",
      assigned_user_id: "ffffffff-ffff-4fff-ffff-ffffffffffff",
      route_reason: "Payment-state alert routed to payments.",
      user_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      wallet_id: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
      external_transfer_id: "11111111-1111-4111-1111-111111111111",
      compensation_id: null,
      provider_reconciliation_id: null,
      review_case_id: null,
      execution_request_id: null,
      pipeline_id: "22222222-2222-4222-2222-222222222222",
      saga_id: "33333333-3333-4333-3333-333333333333",
      ledger_entry_id: null,
      public_summary: "Payout has been pending longer than expected.",
      internal_summary: "External transfer stuck in provider-pending states.",
      redacted_evidence: { status: "provider_pending", age_minutes: 90 },
      risk_scores: {
        alertConfidenceScore: 0.9,
        financialRiskScore: 0.75,
        userImpactScore: 0.8,
        platformRiskScore: 0.75,
        exploitabilityScore: 0.2,
        urgencyScore: 0.7,
        recurrenceRiskScore: 0.35
      },
      acknowledged_by_user_id: "ffffffff-ffff-4fff-ffff-ffffffffffff",
      acknowledged_at: base,
      resolved_by_user_id: null,
      resolved_at: null,
      resolution_reason_codes: null,
      resolution_notes: null,
      escalated_by_user_id: null,
      escalated_at: null,
      escalation_reason_codes: null,
      created_at: base,
      updated_at: base
    },
    {
      alert_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0003",
      alert_type: "wallet_negative_balance",
      alert_source: "wallet",
      status: "alert_escalated",
      severity: "critical",
      priority: "urgent",
      assigned_team: "wallet_ops",
      assigned_user_id: null,
      route_reason: "Wallet/ledger invariant alert routed to wallet ops.",
      user_id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      wallet_id: "44444444-4444-4444-4444-444444444444",
      external_transfer_id: null,
      compensation_id: null,
      provider_reconciliation_id: null,
      review_case_id: "55555555-5555-4555-5555-555555555555",
      execution_request_id: null,
      pipeline_id: null,
      saga_id: null,
      ledger_entry_id: "66666666-6666-4666-6666-666666666666",
      public_summary: "Wallet invariant scan detected a negative or inconsistent balance.",
      internal_summary: "Invariant scan flagged non-passing wallet row.",
      redacted_evidence: { invariant_type: "balance_reconciliation", status: "failed" },
      risk_scores: {
        alertConfidenceScore: 0.88,
        financialRiskScore: 0.92,
        userImpactScore: 0.75,
        platformRiskScore: 0.8,
        exploitabilityScore: 0.25,
        urgencyScore: 0.82,
        recurrenceRiskScore: 0.35
      },
      acknowledged_by_user_id: null,
      acknowledged_at: null,
      resolved_by_user_id: null,
      resolved_at: null,
      resolution_reason_codes: null,
      resolution_notes: null,
      escalated_by_user_id: "ffffffff-ffff-4fff-ffff-ffffffffffff",
      escalated_at: base,
      escalation_reason_codes: ["manual_escalation"],
      created_at: base,
      updated_at: base
    }
  ];

  for (const row of samples) {
    alerts.set(row.alert_id, row);
  }
}

export interface ListRiskInboxAlertsParams {
  status?: string | null;
  severity?: string | null;
  assignedTeam?: string | null;
  limit?: number;
}

export function listRiskInboxAlerts(params: ListRiskInboxAlertsParams = {}): RiskInboxAlertRow[] {
  seedIfNeeded();
  let rows = [...alerts.values()];

  if (params.status) {
    rows = rows.filter((r) => r.status === params.status);
  }
  if (params.severity) {
    rows = rows.filter((r) => r.severity === params.severity);
  }
  if (params.assignedTeam) {
    rows = rows.filter((r) => r.assigned_team === params.assignedTeam);
  }

  rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const limit = params.limit ?? 100;
  return rows.slice(0, limit);
}

export function getRiskInboxAlert(alertId: string): RiskInboxAlertRow | null {
  seedIfNeeded();
  const row = alerts.get(alertId);
  return row ? { ...row } : null;
}

export function acknowledgeRiskInboxAlert(params: { alertId: string; actorUserId: string }): RiskInboxAlertRow | null {
  seedIfNeeded();
  const row = alerts.get(params.alertId);
  if (!row) return null;

  const now = new Date().toISOString();
  const next: RiskInboxAlertRow = {
    ...row,
    status: "alert_acknowledged",
    acknowledged_by_user_id: params.actorUserId,
    acknowledged_at: now,
    updated_at: now
  };
  alerts.set(params.alertId, next);
  return next;
}

export function resolveRiskInboxAlert(params: {
  alertId: string;
  actorUserId: string;
  reasonCodes: string[];
  notes?: string | null;
}): RiskInboxAlertRow | null {
  seedIfNeeded();
  const row = alerts.get(params.alertId);
  if (!row) return null;

  const now = new Date().toISOString();
  const next: RiskInboxAlertRow = {
    ...row,
    status: "alert_resolved",
    resolved_by_user_id: params.actorUserId,
    resolved_at: now,
    resolution_reason_codes: params.reasonCodes,
    resolution_notes: params.notes ?? null,
    updated_at: now
  };
  alerts.set(params.alertId, next);
  return next;
}

export function escalateRiskInboxAlert(params: {
  alertId: string;
  actorUserId: string;
  reasonCodes: string[];
}): RiskInboxAlertRow | null {
  seedIfNeeded();
  const row = alerts.get(params.alertId);
  if (!row) return null;

  const now = new Date().toISOString();
  const next: RiskInboxAlertRow = {
    ...row,
    status: "alert_escalated",
    escalated_by_user_id: params.actorUserId,
    escalated_at: now,
    escalation_reason_codes: params.reasonCodes,
    updated_at: now
  };
  alerts.set(params.alertId, next);
  return next;
}
