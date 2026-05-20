// MOCK / DEMO STORE
// This module is demo/in-memory/mock-backed and is not production canonical persistence.
// Do not use this as authoritative state in backend or admin decision flows.
// See ownership and runtime wiring docs:
// docs/source-of-truth-ownership-contract.md
// docs/runtime-wiring-matrix.md

import type { AdminReviewCaseRow } from "@/lib/admin-review/admin-review-client";
import { isEscalatedCase } from "@/lib/admin-review/admin-review-ui-rules";

const cases = new Map<string, AdminReviewCaseRow>();

let seeded = false;

function seedIfNeeded(): void {
  if (seeded) return;
  seeded = true;

  const base = new Date().toISOString();
  const samples: AdminReviewCaseRow[] = [
    {
      review_case_id: "rc_demo_queued_001",
      review_case_type: "external_transfer_review",
      review_trigger: "external_transfer_unknown",
      status: "review_queued",
      decision: null,
      user_id: "user_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      wallet_id: "wal_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      content_id: null,
      campaign_id: null,
      grant_eligibility_id: null,
      external_transfer_id: "ext_cccccccc-cccc-cccc-cccc-cccccccccccc",
      compensation_id: null,
      policy_decision_id: null,
      pipeline_id: null,
      saga_id: null,
      execution_request_id: null,
      provider_reconciliation_id: null,
      redacted_evidence: { transfer_ref: "****9921", corridor: "US→EU", amount_minor: 12500 },
      raw_evidence: { transfer_ref: "ACH-7721", bank_meta: { routing: "***" } },
      public_summary: "External transfer requires manual classification before release.",
      internal_summary: "Provider returned ambiguous status; check ledger reservation line.",
      assigned_reviewer_id: null,
      assigned_team: null,
      assigned_at: null,
      decided_by_user_id: null,
      decided_at: null,
      severity: "high",
      priority: "high",
      due_at: base,
      breached_at: null,
      source_event_ids: ["evt_1", "evt_2"],
      decision_reason_codes: [],
      decision_notes: null,
      safety_scores: {
        evidenceCompletenessScore: 0.72,
        reviewerAuthorityScore: 0.5,
        decisionConfidenceScore: 0.4,
        downstreamSafetyScore: 0.68,
        userImpactScore: 0.55,
        platformRiskScore: 0.42
      },
      metadata: { channel: "alphabet" },
      created_at: base,
      updated_at: base
    },
    {
      review_case_id: "rc_demo_assigned_002",
      review_case_type: "compensation_review",
      review_trigger: "compensation_requires_review",
      status: "review_assigned",
      decision: null,
      user_id: "user_dddddddd-dddd-dddd-dddd-dddddddddddd",
      wallet_id: null,
      external_transfer_id: null,
      compensation_id: "cmp_eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      redacted_evidence: { case: "comp-44", lines: 1 },
      raw_evidence: { internal_ticket: "T-9012", pii: "redacted-in-prod" },
      public_summary: "Compensation event flagged for human verification.",
      internal_summary: "Possible duplicate credit; compare with saga replay.",
      assigned_reviewer_id: "admin_rev_ffffffff-ffff-ffff-ffff-ffffffffffff",
      assigned_team: "payments",
      assigned_at: base,
      severity: "medium",
      priority: "normal",
      due_at: null,
      breached_at: null,
      source_event_ids: ["evt_c1"],
      decision_reason_codes: [],
      decision_notes: null,
      safety_scores: {
        evidenceCompletenessScore: 0.88,
        reviewerAuthorityScore: 0.9,
        decisionConfidenceScore: 0.6,
        downstreamSafetyScore: 0.77,
        userImpactScore: 0.3,
        platformRiskScore: 0.25
      },
      metadata: {},
      created_at: base,
      updated_at: base
    },
    {
      review_case_id: "rc_demo_escalated_003",
      review_case_type: "fraud_review",
      review_trigger: "fraud_risk_above_threshold",
      status: "review_escalated",
      decision: null,
      user_id: null,
      wallet_id: "wal_11111111-1111-1111-1111-111111111111",
      redacted_evidence: { risk_band: "L3", signals: ["velocity", "device"] },
      raw_evidence: { model_scores: { raw: [0.12, 0.98] } },
      public_summary: "Automated fraud pipeline requested senior review.",
      internal_summary: "Cross-wallet velocity; freeze recommended pending decision.",
      assigned_reviewer_id: null,
      assigned_team: "trust",
      assigned_at: null,
      severity: "critical",
      priority: "urgent",
      due_at: base,
      breached_at: null,
      source_event_ids: [],
      decision_reason_codes: ["fraud_velocity"],
      decision_notes: "Escalated from auto-router.",
      safety_scores: {
        evidenceCompletenessScore: 0.5,
        reviewerAuthorityScore: 0.4,
        decisionConfidenceScore: 0.35,
        downstreamSafetyScore: 0.5,
        userImpactScore: 0.8,
        platformRiskScore: 0.9
      },
      metadata: {},
      created_at: base,
      updated_at: base
    },
    {
      review_case_id: "rc_demo_closed_004",
      review_case_type: "policy_review",
      review_trigger: "policy_requires_review",
      status: "review_approved",
      decision: "approve_continue",
      user_id: "user_22222222-2222-2222-2222-222222222222",
      policy_decision_id: "pol_33333333-3333-3333-3333-333333333333",
      redacted_evidence: { policy: "KYC-T1" },
      raw_evidence: {},
      public_summary: "Policy hold cleared after verification.",
      internal_summary: null,
      assigned_reviewer_id: "admin_rev_ffffffff-ffff-ffff-ffff-ffffffffffff",
      assigned_team: "policy",
      assigned_at: base,
      decided_by_user_id: "admin_rev_ffffffff-ffff-ffff-ffff-ffffffffffff",
      decided_at: base,
      severity: "low",
      priority: "low",
      due_at: null,
      breached_at: null,
      source_event_ids: ["evt_p1"],
      decision_reason_codes: ["policy_ok"],
      decision_notes: "Standard approval.",
      safety_scores: {
        evidenceCompletenessScore: 0.95,
        reviewerAuthorityScore: 0.95,
        decisionConfidenceScore: 0.92,
        downstreamSafetyScore: 0.9,
        userImpactScore: 0.1,
        platformRiskScore: 0.1
      },
      metadata: {},
      created_at: base,
      updated_at: base
    },
    {
      review_case_id: "rc_demo_needs_info_005",
      review_case_type: "provider_reconciliation_review",
      review_trigger: "provider_reconciliation_unmatched",
      status: "review_needs_more_info",
      decision: null,
      provider_reconciliation_id: "prv_44444444-4444-4444-4444-444444444444",
      redacted_evidence: { batch: "2026-04-26", unmatched: 3 },
      raw_evidence: { webhook_payload_digest: "sha256:abc..." },
      public_summary: "Provider reconciliation batch needs additional identifiers.",
      internal_summary: "Ask provider for trace id mapping.",
      assigned_reviewer_id: null,
      assigned_team: null,
      assigned_at: null,
      severity: "medium",
      priority: "normal",
      due_at: null,
      breached_at: null,
      source_event_ids: [],
      decision_reason_codes: [],
      decision_notes: null,
      safety_scores: {
        evidenceCompletenessScore: 0.4,
        reviewerAuthorityScore: 0.5,
        decisionConfidenceScore: 0.2,
        downstreamSafetyScore: 0.6,
        userImpactScore: 0.2,
        platformRiskScore: 0.35
      },
      metadata: {},
      created_at: base,
      updated_at: base
    }
  ];

  for (const row of samples) {
    cases.set(row.review_case_id, row);
  }
}

function stripRawEvidence(row: AdminReviewCaseRow): AdminReviewCaseRow {
  const { raw_evidence: _raw, ...rest } = row;
  return { ...rest, raw_evidence: undefined };
}

export interface ListAdminReviewCasesParams {
  status?: string;
  assignedReviewerId?: string;
  limit?: number;
  /** When true, returns cases that are escalated by status or critical severity. */
  escalationsOnly?: boolean;
}

export function listAdminReviewCases(
  params: ListAdminReviewCasesParams = {}
): AdminReviewCaseRow[] {
  seedIfNeeded();
  let rows = [...cases.values()];

  if (params.escalationsOnly) {
    rows = rows.filter((r) => isEscalatedCase(r.status, r.severity));
  } else if (params.status) {
    rows = rows.filter((r) => r.status === params.status);
  }

  if (params.assignedReviewerId) {
    rows = rows.filter((r) => r.assigned_reviewer_id === params.assignedReviewerId);
  }

  rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const limit = params.limit ?? 100;
  return rows.slice(0, limit).map(stripRawEvidence);
}

export function getAdminReviewCase(reviewCaseId: string): AdminReviewCaseRow | null {
  seedIfNeeded();
  const row = cases.get(reviewCaseId);
  return row ? { ...row } : null;
}

export function assignAdminReviewCaseInStore(params: {
  reviewCaseId: string;
  assignedReviewerId: string;
  assignedTeam?: string | null;
  assignedAt?: string;
}): AdminReviewCaseRow | null {
  seedIfNeeded();
  const row = cases.get(params.reviewCaseId);
  if (!row) return null;

  const now = new Date().toISOString();
  const next: AdminReviewCaseRow = {
    ...row,
    assigned_reviewer_id: params.assignedReviewerId,
    assigned_team: params.assignedTeam ?? row.assigned_team ?? null,
    assigned_at: params.assignedAt ?? now,
    status: "review_assigned",
    updated_at: now
  };
  cases.set(next.review_case_id, next);
  return next;
}

function decisionToStatus(decision: string): string {
  switch (decision) {
    case "approve_continue":
    case "approve_with_limits":
      return "review_approved";
    case "reject_block":
      return "review_rejected";
    case "escalate":
      return "review_escalated";
    case "request_more_info":
      return "review_needs_more_info";
    case "cancel_case":
      return "review_canceled";
    case "reverse_and_compensate":
    case "freeze_wallet":
    case "freeze_withdrawals":
    case "freeze_campaign":
    case "release_hold":
      return "review_closed";
    default:
      return "review_closed";
  }
}

export function applyAdminReviewDecisionInStore(params: {
  reviewCaseId: string;
  decision: string;
  decidedByUserId: string;
  decisionReasonCodes: string[];
  decisionNotes?: string | null;
}): AdminReviewCaseRow | null {
  seedIfNeeded();
  const row = cases.get(params.reviewCaseId);
  if (!row) return null;

  const now = new Date().toISOString();
  const nextStatus = decisionToStatus(params.decision);
  const next: AdminReviewCaseRow = {
    ...row,
    decision: params.decision,
    status: nextStatus,
    decided_by_user_id: params.decidedByUserId,
    decided_at: now,
    decision_reason_codes: params.decisionReasonCodes,
    decision_notes: params.decisionNotes ?? null,
    updated_at: now
  };
  cases.set(next.review_case_id, next);
  return next;
}

export function createAdminReviewCaseInStore(
  partial: Partial<AdminReviewCaseRow> & Pick<AdminReviewCaseRow, "review_case_type" | "review_trigger">
): AdminReviewCaseRow {
  seedIfNeeded();
  const id = `rc_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const row: AdminReviewCaseRow = {
    review_case_id: id,
    review_case_type: partial.review_case_type,
    review_trigger: partial.review_trigger,
    status: partial.status ?? "review_queued",
    decision: partial.decision ?? null,
    user_id: partial.user_id ?? null,
    actor_user_id: partial.actor_user_id ?? null,
    wallet_id: partial.wallet_id ?? null,
    content_id: partial.content_id ?? null,
    campaign_id: partial.campaign_id ?? null,
    grant_eligibility_id: partial.grant_eligibility_id ?? null,
    external_transfer_id: partial.external_transfer_id ?? null,
    compensation_id: partial.compensation_id ?? null,
    policy_decision_id: partial.policy_decision_id ?? null,
    pipeline_id: partial.pipeline_id ?? null,
    saga_id: partial.saga_id ?? null,
    execution_request_id: partial.execution_request_id ?? null,
    provider_reconciliation_id: partial.provider_reconciliation_id ?? null,
    redacted_evidence: partial.redacted_evidence ?? {},
    raw_evidence: partial.raw_evidence ?? {},
    public_summary: partial.public_summary ?? null,
    internal_summary: partial.internal_summary ?? null,
    assigned_reviewer_id: partial.assigned_reviewer_id ?? null,
    assigned_team: partial.assigned_team ?? null,
    assigned_at: partial.assigned_at ?? null,
    decided_by_user_id: partial.decided_by_user_id ?? null,
    decided_at: partial.decided_at ?? null,
    severity: partial.severity ?? "medium",
    priority: partial.priority ?? "normal",
    due_at: partial.due_at ?? null,
    breached_at: partial.breached_at ?? null,
    source_event_ids: partial.source_event_ids ?? [],
    decision_reason_codes: partial.decision_reason_codes ?? [],
    decision_notes: partial.decision_notes ?? null,
    safety_scores: partial.safety_scores ?? {
      evidenceCompletenessScore: 0.5,
      reviewerAuthorityScore: 0.5,
      decisionConfidenceScore: 0.5,
      downstreamSafetyScore: 0.5,
      userImpactScore: 0.5,
      platformRiskScore: 0.5
    },
    metadata: partial.metadata ?? {},
    created_at: now,
    updated_at: now
  };
  cases.set(id, row);
  return row;
}
