-- 12/23 MVP — wallets — per-user ownership and status container.
-- Balances do not live here; source-of-truth movement is in wallet_ledger_entries
-- and derived balances are in wallet_balance_projections.

create type wallet_status as enum (
  'active',
  'restricted',
  'locked',
  'closed'
);

create table wallets (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique references users(id),

  status wallet_status not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index idx_wallets_user_id
on wallets(user_id);

create index idx_wallets_status
on wallets(status);

create or replace function create_wallet_for_user(
  p_user_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_wallet_id uuid;
begin
  insert into wallets (
    user_id,
    status
  )
  values (
    p_user_id,
    'active'
  )
  on conflict (user_id)
  do update set
    updated_at = now()
  returning id into v_wallet_id;

  return v_wallet_id;
end;
$$;
