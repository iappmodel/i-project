export interface AdminReviewCaseRow {
  review_case_id: string;
  review_case_type: string;
  review_trigger: string;
  status: string;
  decision?: string | null;

  user_id?: string | null;
  actor_user_id?: string | null;
  wallet_id?: string | null;
  content_id?: string | null;
  campaign_id?: string | null;
  grant_eligibility_id?: string | null;
  external_transfer_id?: string | null;
  compensation_id?: string | null;
  policy_decision_id?: string | null;
  pipeline_id?: string | null;
  saga_id?: string | null;
  execution_request_id?: string | null;
  provider_reconciliation_id?: string | null;

  redacted_evidence?: unknown;
  raw_evidence?: unknown;

  public_summary?: string | null;
  internal_summary?: string | null;

  assigned_reviewer_id?: string | null;
  assigned_team?: string | null;
  assigned_at?: string | null;

  decided_by_user_id?: string | null;
  decided_at?: string | null;

  severity: string;
  priority: string;

  due_at?: string | null;
  breached_at?: string | null;

  source_event_ids?: string[];

  decision_reason_codes?: string[];
  decision_notes?: string | null;

  safety_scores?: Record<string, number> | unknown;
  metadata?: unknown;

  created_at?: string | null;
  updated_at?: string | null;
}

export async function fetchReviewCases(params?: {
  status?: string;
  assignedReviewerId?: string;
  limit?: number;
  escalationsOnly?: boolean;
}): Promise<AdminReviewCaseRow[]> {
  const query = new URLSearchParams();

  if (params?.status) query.set("status", params.status);
  if (params?.assignedReviewerId) query.set("assignedReviewerId", params.assignedReviewerId);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.escalationsOnly) query.set("escalationsOnly", "1");

  const res = await fetch(`/api/admin/review-cases?${query.toString()}`, {
    cache: "no-store",
    headers: {
      "x-role": "admin"
    }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch review cases.");
  }

  const json: unknown = await res.json();
  const cases = (json as { cases?: AdminReviewCaseRow[] }).cases ?? [];
  return cases;
}

export async function fetchReviewCase(reviewCaseId: string): Promise<AdminReviewCaseRow> {
  const res = await fetch(`/api/admin/review-cases/${reviewCaseId}`, {
    cache: "no-store",
    headers: {
      "x-role": "admin"
    }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch review case.");
  }

  const json: unknown = await res.json();
  return (json as { reviewCase: AdminReviewCaseRow }).reviewCase;
}

export async function assignReviewCase(params: {
  reviewCaseId: string;
  assignedReviewerId: string;
  assignedTeam?: string | null;
}) {
  const res = await fetch(`/api/admin/review-cases/${params.reviewCaseId}/assign`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "admin",
      "x-user-id": params.assignedReviewerId
    },
    body: JSON.stringify({
      assignedReviewerId: params.assignedReviewerId,
      assignedTeam: params.assignedTeam ?? null
    })
  });

  if (!res.ok) {
    throw new Error("Failed to assign review case.");
  }

  return res.json() as Promise<{ ok: boolean; reviewCase: AdminReviewCaseRow }>;
}

export async function decideReviewCase(params: {
  reviewCaseId: string;
  decision: string;
  decidedByUserId: string;
  decisionReasonCodes: string[];
  decisionNotes?: string | null;
}) {
  const res = await fetch(`/api/admin/review-cases/${params.reviewCaseId}/decision`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "admin",
      "x-user-id": params.decidedByUserId
    },
    body: JSON.stringify({
      decision: params.decision,
      decisionReasonCodes: params.decisionReasonCodes,
      decisionNotes: params.decisionNotes ?? null
    })
  });

  if (!res.ok) {
    throw new Error("Failed to apply review decision.");
  }

  return res.json() as Promise<{
    ok: boolean;
    status: string;
    reviewCase: AdminReviewCaseRow;
  }>;
}
