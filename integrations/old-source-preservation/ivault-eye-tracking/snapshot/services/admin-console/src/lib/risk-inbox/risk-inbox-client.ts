export interface RiskInboxAlertRow {
  alert_id: string;
  alert_type: string;
  alert_source: string;
  status: string;
  severity: string;
  priority: string;

  assigned_team?: string | null;
  assigned_user_id?: string | null;
  route_reason?: string | null;

  user_id?: string | null;
  wallet_id?: string | null;
  external_transfer_id?: string | null;
  compensation_id?: string | null;
  provider_reconciliation_id?: string | null;
  review_case_id?: string | null;
  execution_request_id?: string | null;
  pipeline_id?: string | null;
  saga_id?: string | null;
  ledger_entry_id?: string | null;

  public_summary?: string | null;
  internal_summary?: string | null;

  redacted_evidence?: unknown;
  risk_scores?: unknown;

  acknowledged_by_user_id?: string | null;
  acknowledged_at?: string | null;
  resolved_by_user_id?: string | null;
  resolved_at?: string | null;
  resolution_reason_codes?: string[] | null;
  resolution_notes?: string | null;
  escalated_by_user_id?: string | null;
  escalated_at?: string | null;
  escalation_reason_codes?: string[] | null;

  created_at: string;
  updated_at: string;
}

export async function fetchRiskInboxAlerts(params?: {
  status?: string;
  severity?: string;
  assignedTeam?: string;
  limit?: number;
}): Promise<RiskInboxAlertRow[]> {
  const query = new URLSearchParams();

  if (params?.status) query.set("status", params.status);
  if (params?.severity) query.set("severity", params.severity);
  if (params?.assignedTeam) query.set("assignedTeam", params.assignedTeam);
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await fetch(`/api/admin/risk-inbox?${query.toString()}`, {
    cache: "no-store",
    headers: {
      "x-role": "admin"
    }
  });

  if (!res.ok) throw new Error("Failed to fetch risk inbox alerts.");

  const json = (await res.json()) as { alerts?: RiskInboxAlertRow[] };
  return json.alerts ?? [];
}

export async function fetchRiskInboxAlert(alertId: string): Promise<RiskInboxAlertRow> {
  const res = await fetch(`/api/admin/risk-inbox/${alertId}`, {
    cache: "no-store",
    headers: {
      "x-role": "admin"
    }
  });

  if (!res.ok) throw new Error("Failed to fetch risk inbox alert.");

  const json = (await res.json()) as { alert: RiskInboxAlertRow };
  return json.alert;
}

export async function acknowledgeRiskAlert(alertId: string, actorUserId: string) {
  const res = await fetch(`/api/admin/risk-inbox/${alertId}/acknowledge`, {
    method: "POST",
    headers: {
      "x-role": "admin",
      "x-user-id": actorUserId
    }
  });

  if (!res.ok) throw new Error("Failed to acknowledge alert.");
  return res.json() as Promise<{ ok: boolean; alert: RiskInboxAlertRow }>;
}

export async function resolveRiskAlert(params: {
  alertId: string;
  actorUserId: string;
  reasonCodes: string[];
  notes?: string | null;
}) {
  const res = await fetch(`/api/admin/risk-inbox/${params.alertId}/resolve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "admin",
      "x-user-id": params.actorUserId
    },
    body: JSON.stringify({
      reasonCodes: params.reasonCodes,
      notes: params.notes ?? null
    })
  });

  if (!res.ok) throw new Error("Failed to resolve alert.");
  return res.json() as Promise<{ ok: boolean; alert: RiskInboxAlertRow }>;
}

export async function escalateRiskAlert(params: {
  alertId: string;
  actorUserId: string;
  reasonCodes: string[];
}) {
  const res = await fetch(`/api/admin/risk-inbox/${params.alertId}/escalate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "admin",
      "x-user-id": params.actorUserId
    },
    body: JSON.stringify({
      reasonCodes: params.reasonCodes
    })
  });

  if (!res.ok) throw new Error("Failed to escalate alert.");
  return res.json() as Promise<{ ok: boolean; alert: RiskInboxAlertRow }>;
}
