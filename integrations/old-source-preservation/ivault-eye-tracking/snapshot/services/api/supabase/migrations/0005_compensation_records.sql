create table if not exists compensation_records (
  compensation_id uuid primary key default gen_random_uuid(),

  compensation_type text not null,
  trigger_type text not null,
  status text not null,

  original_execution_request_id uuid,
  original_ledger_entry_id uuid references ledger_entries(ledger_entry_id),
  original_saga_id uuid,
  original_pipeline_id uuid,
  original_policy_decision_id uuid,
  original_wallet_id uuid,
  original_wallet_account_id uuid,
  original_user_id uuid not null,

  reversal_ledger_entry_id uuid references ledger_entries(ledger_entry_id),
  reversal_execution_request_id uuid,
  reversal_audit_record_id uuid,
  reversal_notification_id uuid,

  amount numeric not null check (amount > 0),
  coin_code text not null,
  original_direction text not null check (original_direction in ('credit', 'debit')),
  reversal_direction text not null check (reversal_direction in ('credit', 'debit')),

  idempotency_key text,
  dedupe_key text,

  source_event_ids uuid[] not null default '{}',
  reason_codes text[] not null default '{}',

  requires_review boolean not null default false,
  actor_user_id uuid,

  safety_scores jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  validated_at timestamptz,
  executed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz
);

create index if not exists compensation_records_user_id_idx
  on compensation_records(original_user_id);

create index if not exists compensation_records_status_idx
  on compensation_records(status);

create index if not exists compensation_records_type_idx
  on compensation_records(compensation_type);

create index if not exists compensation_records_trigger_idx
  on compensation_records(trigger_type);

create index if not exists compensation_records_original_ledger_idx
  on compensation_records(original_ledger_entry_id);

create index if not exists compensation_records_original_execution_idx
  on compensation_records(original_execution_request_id);

create index if not exists compensation_records_original_pipeline_idx
  on compensation_records(original_pipeline_id);

create index if not exists compensation_records_idempotency_key_idx
  on compensation_records(idempotency_key);

create unique index if not exists compensation_records_unique_idempotency_key_idx
  on compensation_records(idempotency_key)
  where idempotency_key is not null;

alter table compensation_records enable row level security;

create policy "users can read own compensation records"
on compensation_records
for select
using (auth.uid() = original_user_id);

create policy "service role full access compensation records"
on compensation_records
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
