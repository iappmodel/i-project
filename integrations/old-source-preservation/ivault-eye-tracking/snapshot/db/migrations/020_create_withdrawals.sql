-- 20/23 MVP — withdrawals — payout requests from a user wallet to an external destination.

create table withdrawals (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),
  wallet_id uuid not null references wallets (id),

  amount_minor bigint not null check (amount_minor > 0),
  currency currency_code not null default 'USD',

  destination_type text not null
    check (destination_type in ('bank', 'paypal', 'cashapp', 'crypto_wallet', 'gift_card')),

  destination_id text not null,

  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled')),

  rejection_reason text,
  failure_reason text,
  retryable boolean,

  provider_transaction_id text,

  idempotency_key text not null unique,

  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_withdrawals_user on withdrawals (user_id, created_at desc);
create index idx_withdrawals_status on withdrawals (status);
