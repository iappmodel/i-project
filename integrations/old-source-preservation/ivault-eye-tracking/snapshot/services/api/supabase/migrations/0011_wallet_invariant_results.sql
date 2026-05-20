-- Wallet invariant scan results (Alphabet). Read-mostly scanner persistence. Requires pgcrypto.

create table if not exists wallet_invariant_results (
  invariant_result_id uuid primary key default gen_random_uuid(),

  invariant_type text not null,
  scan_scope text not null,
  status text not null,
  severity text not null,

  user_id uuid,
  wallet_id uuid,
  wallet_account_id uuid,

  ledger_entry_id uuid,
  original_ledger_entry_id uuid,
  reversal_ledger_entry_id uuid,
  value_lot_id uuid,

  external_transfer_id uuid,
  compensation_id uuid,
  campaign_id uuid,

  execution_request_id uuid,
  pipeline_id uuid,
  saga_id uuid,

  computed_available_balance numeric,
  computed_pending_balance numeric,
  computed_reserved_balance numeric,
  computed_total_balance numeric,

  stored_available_balance numeric,
  stored_pending_balance numeric,
  stored_reserved_balance numeric,
  stored_total_balance numeric,

  available_delta numeric,
  pending_delta numeric,
  reserved_delta numeric,
  total_delta numeric,

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

create index if not exists wallet_invariant_results_type_idx
  on wallet_invariant_results(invariant_type);

create index if not exists wallet_invariant_results_status_idx
  on wallet_invariant_results(status);

create index if not exists wallet_invariant_results_severity_idx
  on wallet_invariant_results(severity);

create index if not exists wallet_invariant_results_user_id_idx
  on wallet_invariant_results(user_id);

create index if not exists wallet_invariant_results_wallet_id_idx
  on wallet_invariant_results(wallet_id);

create index if not exists wallet_invariant_results_wallet_account_id_idx
  on wallet_invariant_results(wallet_account_id);

create index if not exists wallet_invariant_results_ledger_entry_id_idx
  on wallet_invariant_results(ledger_entry_id);

create index if not exists wallet_invariant_results_external_transfer_id_idx
  on wallet_invariant_results(external_transfer_id);

create index if not exists wallet_invariant_results_compensation_id_idx
  on wallet_invariant_results(compensation_id);

create index if not exists wallet_invariant_results_created_at_idx
  on wallet_invariant_results(created_at desc);

alter table wallet_invariant_results enable row level security;

create policy "service role full access wallet invariant results"
on wallet_invariant_results
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
