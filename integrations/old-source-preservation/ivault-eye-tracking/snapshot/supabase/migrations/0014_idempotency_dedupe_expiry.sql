-- Mirror: keep in sync with services/api/supabase/migrations/0014_idempotency_dedupe_expiry.sql

-- Base tables (if not already created by upstream provisioning)
create table if not exists idempotency_keys (
  idempotency_key text primary key,
  scope text not null default 'api_action',
  user_id uuid,
  object_id text,
  request_hash text,
  status text not null default 'pending',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists dedupe_keys (
  dedupe_key text primary key,
  scope text not null default 'api_action',
  user_id uuid,
  object_id text,
  duplicate_count integer not null default 0,
  status text not null default 'pending',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table idempotency_keys
  add column if not exists object_type text,
  add column if not exists result_hash text,
  add column if not exists expected_result_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists hit_count integer not null default 0,
  add column if not exists locked_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists suppressed_at timestamptz,
  add column if not exists lock_expires_at timestamptz,
  add column if not exists conflict_count integer not null default 0,
  add column if not exists replay_count integer not null default 0,
  add column if not exists archive_reason_codes text[] not null default '{}',
  add column if not exists suppression_reason_codes text[] not null default '{}',
  add column if not exists expiry_metadata jsonb not null default '{}'::jsonb;

alter table dedupe_keys
  add column if not exists object_type text,
  add column if not exists expires_at timestamptz,
  add column if not exists hit_count integer not null default 0,
  add column if not exists locked_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists suppressed_at timestamptz,
  add column if not exists lock_expires_at timestamptz,
  add column if not exists conflict_count integer not null default 0,
  add column if not exists replay_count integer not null default 0,
  add column if not exists archive_reason_codes text[] not null default '{}',
  add column if not exists suppression_reason_codes text[] not null default '{}',
  add column if not exists expiry_metadata jsonb not null default '{}'::jsonb;

create table if not exists idempotency_dedupe_expiry_results (
  expiry_result_id uuid primary key default gen_random_uuid(),

  expiry_type text not null,
  expiry_scope text not null,
  status text not null,
  severity text not null,

  key_id text,
  key_type text not null,
  scope text,
  key_value text,
  object_type text,
  object_id text,

  key_status text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  expires_at timestamptz,
  locked_at timestamptz,
  lock_expires_at timestamptz,

  hit_count integer not null default 0,
  conflict_count integer not null default 0,
  replay_count integer not null default 0,

  user_id uuid,
  wallet_id uuid,
  wallet_account_id uuid,
  ledger_entry_id uuid,
  external_transfer_id uuid,
  compensation_id uuid,
  review_case_id uuid,
  policy_decision_id uuid,
  pipeline_id uuid,
  saga_id uuid,
  execution_request_id uuid,
  notification_id uuid,
  alphabet_event_id uuid,

  should_archive boolean not null default false,
  should_suppress boolean not null default false,
  should_alert boolean not null default false,
  should_review boolean not null default false,
  should_expire_lock boolean not null default false,

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

create index if not exists idem_dedupe_expiry_results_type_idx
  on idempotency_dedupe_expiry_results(expiry_type);

create index if not exists idem_dedupe_expiry_results_scope_idx
  on idempotency_dedupe_expiry_results(expiry_scope);

create index if not exists idem_dedupe_expiry_results_status_idx
  on idempotency_dedupe_expiry_results(status);

create index if not exists idem_dedupe_expiry_results_severity_idx
  on idempotency_dedupe_expiry_results(severity);

create index if not exists idem_dedupe_expiry_results_key_value_idx
  on idempotency_dedupe_expiry_results(key_value);

create index if not exists idem_dedupe_expiry_results_object_idx
  on idempotency_dedupe_expiry_results(object_type, object_id);

create index if not exists idem_dedupe_expiry_results_user_idx
  on idempotency_dedupe_expiry_results(user_id);

create index if not exists idem_dedupe_expiry_results_created_idx
  on idempotency_dedupe_expiry_results(created_at desc);

create index if not exists idempotency_keys_expires_idx
  on idempotency_keys(expires_at);

create index if not exists idempotency_keys_archived_idx
  on idempotency_keys(archived_at);

create index if not exists idempotency_keys_suppressed_idx
  on idempotency_keys(suppressed_at);

create index if not exists dedupe_keys_expires_idx
  on dedupe_keys(expires_at);

create index if not exists dedupe_keys_archived_idx
  on dedupe_keys(archived_at);

create index if not exists dedupe_keys_suppressed_idx
  on dedupe_keys(suppressed_at);

alter table idempotency_dedupe_expiry_results enable row level security;

create policy "service role full access idempotency dedupe expiry results"
on idempotency_dedupe_expiry_results
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
