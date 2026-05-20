-- External transfer / payout state (Alphabet). Requires pgcrypto for gen_random_uuid().
-- References ledger_entries(ledger_entry_id) as used by services/api alphabet worker ledger.

create table if not exists external_transfers (
  external_transfer_id uuid primary key default gen_random_uuid(),

  transfer_type text not null,
  provider text not null,
  status text not null,

  user_id uuid not null,
  wallet_id uuid,
  wallet_account_id uuid,

  original_execution_request_id uuid,
  original_ledger_entry_id uuid references ledger_entries(ledger_entry_id),
  pipeline_id uuid,
  saga_id uuid,

  amount numeric not null check (amount > 0),
  coin_code text not null,

  fiat_amount numeric,
  fiat_currency text,

  provider_transfer_id text,
  provider_status text,

  provider_payload jsonb not null default '{}'::jsonb,
  provider_response jsonb not null default '{}'::jsonb,

  destination_type text,
  destination_label text,

  idempotency_key text,
  dedupe_key text,

  source_event_ids uuid[] not null default '{}',

  risk_scores jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  validating_at timestamptz,
  provider_request_created_at timestamptz,
  provider_request_sent_at timestamptz,
  provider_pending_at timestamptz,
  provider_succeeded_at timestamptz,
  provider_failed_at timestamptz,
  provider_unknown_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  requires_review_at timestamptz
);

create index if not exists external_transfers_user_id_idx
  on external_transfers(user_id);

create index if not exists external_transfers_wallet_id_idx
  on external_transfers(wallet_id);

create index if not exists external_transfers_status_idx
  on external_transfers(status);

create index if not exists external_transfers_provider_idx
  on external_transfers(provider);

create index if not exists external_transfers_provider_transfer_id_idx
  on external_transfers(provider_transfer_id);

create index if not exists external_transfers_original_execution_idx
  on external_transfers(original_execution_request_id);

create index if not exists external_transfers_original_ledger_idx
  on external_transfers(original_ledger_entry_id);

create index if not exists external_transfers_pipeline_id_idx
  on external_transfers(pipeline_id);

create index if not exists external_transfers_saga_id_idx
  on external_transfers(saga_id);

create index if not exists external_transfers_idempotency_key_idx
  on external_transfers(idempotency_key);

create unique index if not exists external_transfers_unique_idempotency_key_idx
  on external_transfers(idempotency_key)
  where idempotency_key is not null;

alter table external_transfers enable row level security;

create policy "users can read own external transfers"
on external_transfers
for select
using (auth.uid() = user_id);

create policy "service role full access external transfers"
on external_transfers
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
