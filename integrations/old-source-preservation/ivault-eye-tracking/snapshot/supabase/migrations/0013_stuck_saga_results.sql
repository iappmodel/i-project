-- Stuck saga orchestration scan results (detection layer; no saga state mutation). Requires pgcrypto for gen_random_uuid().

create table if not exists stuck_saga_results (
  stuck_saga_result_id uuid primary key default gen_random_uuid(),

  stuck_type text not null,
  scan_scope text not null,
  status text not null,
  severity text not null,

  user_id uuid,
  wallet_id uuid,
  wallet_account_id uuid,

  saga_id uuid,
  pipeline_id uuid,
  execution_request_id uuid,
  policy_decision_id uuid,

  ledger_entry_id uuid,
  external_transfer_id uuid,
  provider_reconciliation_id uuid,
  compensation_id uuid,
  review_case_id uuid,

  started_at timestamptz,
  updated_at timestamptz,
  last_progress_at timestamptz,

  age_seconds integer not null default 0,
  stale_seconds integer not null default 0,
  max_allowed_age_seconds integer not null default 0,
  max_allowed_stale_seconds integer not null default 0,

  internal_debit_amount numeric not null default 0,
  external_transfer_amount numeric not null default 0,
  pending_amount numeric not null default 0,
  unknown_amount numeric not null default 0,
  compensation_amount numeric not null default 0,
  exposure_amount numeric not null default 0,

  risk_scores jsonb not null default '{}'::jsonb,

  evidence jsonb not null default '{}'::jsonb,
  redacted_evidence jsonb not null default '{}'::jsonb,

  source_event_ids uuid[] not null default '{}',
  created_alert_ids uuid[] not null default '{}',
  created_review_case_ids uuid[] not null default '{}',

  reason_codes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists stuck_saga_results_type_idx
  on stuck_saga_results(stuck_type);

create index if not exists stuck_saga_results_status_idx
  on stuck_saga_results(status);

create index if not exists stuck_saga_results_severity_idx
  on stuck_saga_results(severity);

create index if not exists stuck_saga_results_saga_id_idx
  on stuck_saga_results(saga_id);

create index if not exists stuck_saga_results_pipeline_id_idx
  on stuck_saga_results(pipeline_id);

create index if not exists stuck_saga_results_execution_request_id_idx
  on stuck_saga_results(execution_request_id);

create index if not exists stuck_saga_results_external_transfer_id_idx
  on stuck_saga_results(external_transfer_id);

create index if not exists stuck_saga_results_wallet_id_idx
  on stuck_saga_results(wallet_id);

create index if not exists stuck_saga_results_user_id_idx
  on stuck_saga_results(user_id);

create index if not exists stuck_saga_results_created_at_idx
  on stuck_saga_results(created_at desc);

alter table stuck_saga_results enable row level security;

create policy "service role full access stuck saga results"
on stuck_saga_results
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
