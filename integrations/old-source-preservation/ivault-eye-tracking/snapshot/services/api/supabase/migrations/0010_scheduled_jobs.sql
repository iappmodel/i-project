-- Mirror of repo-root supabase/migrations/0010_scheduled_jobs.sql

create table if not exists scheduled_job_definitions (
  job_key text primary key,

  job_category text not null,
  status text not null default 'job_created',

  interval_minutes integer check (interval_minutes > 0),
  cron_expression text,

  max_runtime_seconds integer not null default 300 check (max_runtime_seconds > 0),
  lock_ttl_seconds integer not null default 600 check (lock_ttl_seconds > 0),

  retry_limit integer not null default 2 check (retry_limit >= 0),
  retry_backoff_seconds integer not null default 60 check (retry_backoff_seconds >= 0),

  active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scheduled_job_locks (
  lock_key text primary key,

  job_key text not null references scheduled_job_definitions(job_key),

  locked_by text not null,
  locked_at timestamptz not null default now(),
  lock_expires_at timestamptz not null,

  metadata jsonb not null default '{}'::jsonb
);

create table if not exists scheduled_job_runs (
  job_run_id uuid primary key default gen_random_uuid(),

  job_key text not null references scheduled_job_definitions(job_key),
  job_category text not null,

  status text not null,

  triggered_by text not null default 'cron',
  triggered_by_user_id uuid,

  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  timed_out_at timestamptz,
  dead_lettered_at timestamptz,

  duration_ms integer,

  attempts integer not null default 0 check (attempts >= 0),

  lock_key text,
  locked_by text,

  result_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb not null default '{}'::jsonb,

  source_event_ids uuid[] not null default '{}',
  created_alert_ids uuid[] not null default '{}',
  created_review_case_ids uuid[] not null default '{}',

  scanned_object_counts jsonb not null default '{}'::jsonb,
  mutation_counts jsonb not null default '{}'::jsonb,

  safety_scores jsonb not null default '{}'::jsonb,
  reason_codes text[] not null default '{}',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_job_definitions_category_idx
  on scheduled_job_definitions(job_category);

create index if not exists scheduled_job_definitions_active_idx
  on scheduled_job_definitions(active);

create index if not exists scheduled_job_locks_job_key_idx
  on scheduled_job_locks(job_key);

create index if not exists scheduled_job_locks_expires_idx
  on scheduled_job_locks(lock_expires_at);

create index if not exists scheduled_job_runs_job_key_idx
  on scheduled_job_runs(job_key);

create index if not exists scheduled_job_runs_status_idx
  on scheduled_job_runs(status);

create index if not exists scheduled_job_runs_category_idx
  on scheduled_job_runs(job_category);

create index if not exists scheduled_job_runs_created_at_idx
  on scheduled_job_runs(created_at desc);

alter table scheduled_job_definitions enable row level security;
alter table scheduled_job_locks enable row level security;
alter table scheduled_job_runs enable row level security;

create policy "service role full access scheduled job definitions"
on scheduled_job_definitions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role full access scheduled job locks"
on scheduled_job_locks
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role full access scheduled job runs"
on scheduled_job_runs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into scheduled_job_definitions (
  job_key,
  job_category,
  interval_minutes,
  max_runtime_seconds,
  lock_ttl_seconds,
  retry_limit,
  retry_backoff_seconds
)
values
  ('provider_polling_5m', 'payments', 5, 240, 300, 2, 60),
  ('pending_payout_scan_5m', 'payments', 5, 240, 300, 2, 60),
  ('review_sla_scan_5m', 'risk', 5, 240, 300, 2, 60),
  ('operational_alert_scan_5m', 'risk', 5, 300, 360, 2, 60),
  ('stuck_saga_scan_1h', 'infra', 60, 300, 420, 2, 120),
  ('wallet_invariant_scan_1h', 'wallet', 60, 300, 420, 2, 120),
  ('idempotency_expiry_1h', 'infra', 60, 300, 420, 1, 120),
  ('dedupe_expiry_1h', 'infra', 60, 300, 420, 1, 120),
  ('audit_integrity_daily', 'audit', 1440, 900, 1200, 1, 300),
  ('financial_reconciliation_daily', 'payments', 1440, 1200, 1500, 1, 300),
  ('trust_fraud_review_daily', 'fraud', 1440, 900, 1200, 1, 300)
on conflict (job_key) do nothing;
