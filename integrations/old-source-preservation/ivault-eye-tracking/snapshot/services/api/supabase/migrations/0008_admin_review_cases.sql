create table if not exists admin_review_cases (
  review_case_id uuid primary key default gen_random_uuid(),

  review_case_type text not null,
  review_trigger text not null,
  status text not null,
  decision text,

  user_id uuid,
  actor_user_id uuid,
  wallet_id uuid,
  content_id uuid,
  campaign_id uuid,
  grant_eligibility_id uuid,
  external_transfer_id uuid,
  compensation_id uuid,
  policy_decision_id uuid,
  pipeline_id uuid,
  saga_id uuid,
  execution_request_id uuid,
  provider_reconciliation_id uuid,

  raw_evidence jsonb not null default '{}'::jsonb,
  redacted_evidence jsonb not null default '{}'::jsonb,
  public_summary text,
  internal_summary text,

  assigned_reviewer_id uuid,
  assigned_team text,
  assigned_at timestamptz,

  decided_by_user_id uuid,
  decided_at timestamptz,

  severity text not null default 'medium',
  priority text not null default 'normal',

  due_at timestamptz,
  breached_at timestamptz,

  idempotency_key text,
  dedupe_key text,

  source_event_ids uuid[] not null default '{}',

  decision_reason_codes text[] not null default '{}',
  decision_notes text,

  safety_scores jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  canceled_at timestamptz
);

create index if not exists admin_review_cases_status_idx
  on admin_review_cases(status);

create index if not exists admin_review_cases_type_idx
  on admin_review_cases(review_case_type);

create index if not exists admin_review_cases_trigger_idx
  on admin_review_cases(review_trigger);

create index if not exists admin_review_cases_user_id_idx
  on admin_review_cases(user_id);

create index if not exists admin_review_cases_wallet_id_idx
  on admin_review_cases(wallet_id);

create index if not exists admin_review_cases_external_transfer_idx
  on admin_review_cases(external_transfer_id);

create index if not exists admin_review_cases_compensation_idx
  on admin_review_cases(compensation_id);

create index if not exists admin_review_cases_policy_decision_idx
  on admin_review_cases(policy_decision_id);

create index if not exists admin_review_cases_pipeline_idx
  on admin_review_cases(pipeline_id);

create index if not exists admin_review_cases_saga_idx
  on admin_review_cases(saga_id);

create index if not exists admin_review_cases_execution_request_idx
  on admin_review_cases(execution_request_id);

create index if not exists admin_review_cases_provider_reconciliation_idx
  on admin_review_cases(provider_reconciliation_id);

create index if not exists admin_review_cases_assigned_reviewer_idx
  on admin_review_cases(assigned_reviewer_id);

create index if not exists admin_review_cases_due_at_idx
  on admin_review_cases(due_at);

create index if not exists admin_review_cases_created_at_idx
  on admin_review_cases(created_at desc);

create unique index if not exists admin_review_cases_unique_idempotency_key_idx
  on admin_review_cases(idempotency_key)
  where idempotency_key is not null;

alter table admin_review_cases enable row level security;

create policy "service role full access admin review cases"
on admin_review_cases
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
