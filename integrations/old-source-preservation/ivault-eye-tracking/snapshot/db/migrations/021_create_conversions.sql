-- 21/23 MVP — conversions — currency exchange against a user wallet (quoted amounts, idempotent requests).

create table conversions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),
  wallet_id uuid not null references wallets (id),

  from_currency currency_code not null,
  to_currency currency_code not null,

  from_amount_minor bigint not null check (from_amount_minor > 0),
  to_amount_minor bigint check (to_amount_minor >= 0),

  rate numeric(18, 8),

  quote_id uuid,

  status text not null default 'requested'
    check (status in ('requested', 'completed', 'failed', 'cancelled')),

  failure_reason text,

  idempotency_key text not null unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_conversions_user on conversions (user_id, created_at desc);
create index idx_conversions_wallet on conversions (wallet_id, created_at desc);
create index idx_conversions_status on conversions (status);
