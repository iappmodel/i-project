import { createServiceDbClient } from "../db-client";

function q(id: string): string {
  return id.replace(/"/g, '\\"');
}

export async function fetchSystemTimelineRelatedRowsDb(params: {
  objectType: string;
  objectId: string;
  maxEntries?: number;
}) {
  const db = createServiceDbClient();
  const limit = params.maxEntries ?? 250;
  const id = q(params.objectId);

  const [
    events,
    ledgers,
    executions,
    policies,
    pipelines,
    sagas,
    transfers,
    reconciliations,
    compensations,
    reviews,
    audits,
    notifications,
    idempotency,
    dedupe
  ] = await Promise.all([
    db
      .from("alphabet_events")
      .select("*")
      .or(
        `object_id.eq.${id},user_id.eq.${id},metadata_json->>executionRequestId.eq.${id},metadata_json->>externalTransferId.eq.${id},metadata_json->>compensationId.eq.${id},metadata_json->>reviewCaseId.eq.${id}`
      )
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("ledger_entries")
      .select("*")
      .or(
        `ledger_entry_id.eq.${id},wallet_id.eq.${id},wallet_account_id.eq.${id},user_id.eq.${id},source_object_id.eq.${id}`
      )
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("execution_requests")
      .select("*")
      .or(`execution_request_id.eq.${id},source_policy_decision_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("policy_decisions")
      .select("*")
      .or(`policy_decision_id.eq.${id},user_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("pipeline_records")
      .select("*")
      .or(`pipeline_id.eq.${id},user_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("saga_records")
      .select("*")
      .or(`saga_id.eq.${id},user_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("external_transfers")
      .select("*")
      .or(
        `external_transfer_id.eq.${id},user_id.eq.${id},wallet_id.eq.${id},original_execution_request_id.eq.${id},original_ledger_entry_id.eq.${id},pipeline_id.eq.${id},saga_id.eq.${id}`
      )
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("provider_reconciliation_records")
      .select("*")
      .or(`reconciliation_id.eq.${id},external_transfer_id.eq.${id},provider_transfer_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("compensation_records")
      .select("*")
      .or(
        `compensation_id.eq.${id},original_user_id.eq.${id},original_wallet_id.eq.${id},original_execution_request_id.eq.${id},original_ledger_entry_id.eq.${id},reversal_ledger_entry_id.eq.${id}`
      )
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("admin_review_cases")
      .select("*")
      .or(
        `review_case_id.eq.${id},user_id.eq.${id},wallet_id.eq.${id},external_transfer_id.eq.${id},compensation_id.eq.${id},policy_decision_id.eq.${id},pipeline_id.eq.${id},saga_id.eq.${id},execution_request_id.eq.${id},provider_reconciliation_id.eq.${id}`
      )
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("audit_records")
      .select("*")
      .or(
        `audit_record_id.eq.${id},user_id.eq.${id},wallet_id.eq.${id},execution_request_id.eq.${id},pipeline_id.eq.${id},saga_id.eq.${id},policy_decision_id.eq.${id}`
      )
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("notification_records")
      .select("*")
      .or(`notification_id.eq.${id},recipient_user_id.eq.${id},source_object_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(limit),

    db
      .from("idempotency_keys")
      .select("*")
      .or(`idempotency_key.eq.${id},user_id.eq.${id},object_id.eq.${id}`)
      .order("last_seen_at", { ascending: false })
      .limit(limit),

    db
      .from("dedupe_keys")
      .select("*")
      .or(`dedupe_key.eq.${id},user_id.eq.${id},object_id.eq.${id}`)
      .order("last_seen_at", { ascending: false })
      .limit(limit)
  ]);

  const errors = [
    events.error,
    ledgers.error,
    executions.error,
    policies.error,
    pipelines.error,
    sagas.error,
    transfers.error,
    reconciliations.error,
    compensations.error,
    reviews.error,
    audits.error,
    notifications.error,
    idempotency.error,
    dedupe.error
  ].filter(Boolean);

  if (errors.length) {
    throw errors[0];
  }

  return {
    events: (events.data ?? []) as Record<string, unknown>[],
    ledgers: (ledgers.data ?? []) as Record<string, unknown>[],
    executions: (executions.data ?? []) as Record<string, unknown>[],
    policies: (policies.data ?? []) as Record<string, unknown>[],
    pipelines: (pipelines.data ?? []) as Record<string, unknown>[],
    sagas: (sagas.data ?? []) as Record<string, unknown>[],
    transfers: (transfers.data ?? []) as Record<string, unknown>[],
    reconciliations: (reconciliations.data ?? []) as Record<string, unknown>[],
    compensations: (compensations.data ?? []) as Record<string, unknown>[],
    reviews: (reviews.data ?? []) as Record<string, unknown>[],
    audits: (audits.data ?? []) as Record<string, unknown>[],
    notifications: (notifications.data ?? []) as Record<string, unknown>[],
    idempotency: (idempotency.data ?? []) as Record<string, unknown>[],
    dedupe: (dedupe.data ?? []) as Record<string, unknown>[]
  };
}
