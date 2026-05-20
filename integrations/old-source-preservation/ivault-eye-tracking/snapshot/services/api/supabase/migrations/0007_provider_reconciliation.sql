-- Mirror of repo-root supabase/migrations/0007_provider_reconciliation.sql

create table if not exists provider_reconciliation_records (
  reconciliation_id uuid primary key default gen_random_uuid(),

  reconciliation_source text not null,
  provider text not null,

  normalized_provider_status text not null,
  reconciliation_status text not null,

  external_transfer_id uuid,
  provider_transfer_id text,

  provider_event_id text,
  provider_raw_event_type text,

  provider_raw_payload jsonb not null default '{}'::jsonb,
  sanitized_provider_payload jsonb not null default '{}'::jsonb,

  signature_verified boolean not null default false,
  signature_confidence_score numeric not null default 0,

  idempotency_key text,
  dedupe_key text,

  source_event_ids uuid[] not null default '{}',

  replay_detected boolean not null default false,
  polling_attempt_count integer not null default 0 check (polling_attempt_count >= 0),

  risk_scores jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  matched_at timestamptz,
  applied_at timestamptz,
  ignored_at timestamptz,
  requires_review_at timestamptz,
  failed_at timestamptz
);

create index if not exists provider_reconciliation_records_external_transfer_idx
  on provider_reconciliation_records(external_transfer_id);

create index if not exists provider_reconciliation_records_provider_transfer_idx
  on provider_reconciliation_records(provider_transfer_id);

create index if not exists provider_reconciliation_records_provider_event_idx
  on provider_reconciliation_records(provider, provider_event_id);

create index if not exists provider_reconciliation_records_status_idx
  on provider_reconciliation_records(reconciliation_status);

create index if not exists provider_reconciliation_records_provider_idx
  on provider_reconciliation_records(provider);

create index if not exists provider_reconciliation_records_created_at_idx
  on provider_reconciliation_records(created_at desc);

create unique index if not exists provider_reconciliation_unique_provider_event_idx
  on provider_reconciliation_records(provider, provider_event_id)
  where provider_event_id is not null;

alter table provider_reconciliation_records enable row level security;

create policy "service role full access provider reconciliation"
on provider_reconciliation_records
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
