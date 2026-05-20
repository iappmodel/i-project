-- Wallet + ledger (append-only); all money-like mutations via service role / Edge only

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  currency text not null default 'USD',
  status text not null default 'active',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallet_accounts_owner_idx on public.wallet_accounts (owner_user_id);

create table if not exists public.wallet_balances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.wallet_accounts (id) on delete cascade,
  bucket text not null,
  amount_minor bigint not null default 0,
  currency text not null default 'USD',
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create unique index if not exists wallet_balances_account_bucket_uidx on public.wallet_balances (account_id, bucket);

comment on table public.wallet_balances is 'DERIVED from ledger in production; no client direct UPDATE — service role only.';

create table if not exists public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.wallet_accounts (id) on delete cascade,
  idempotency_key text not null,
  kind text not null,
  amount_minor bigint not null,
  currency text not null default 'USD',
  direction text not null,
  meta jsonb not null default '{}'::jsonb,
  reversal_of_id uuid references public.wallet_ledger_entries (id),
  created_at timestamptz not null default now()
);

create unique index if not exists wallet_ledger_idempotency_uidx on public.wallet_ledger_entries (idempotency_key);
create index if not exists wallet_ledger_account_idx on public.wallet_ledger_entries (account_id);
create index if not exists wallet_ledger_reversal_idx on public.wallet_ledger_entries (reversal_of_id);

comment on table public.wallet_ledger_entries is 'APPEND-ONLY: no UPDATE/DELETE from client; reversals via new rows only.';

create table if not exists public.magic_reveal_unlocks (
  id uuid primary key default gen_random_uuid(),
  reveal_id uuid not null references public.studio_magic_reveals (id) on delete cascade,
  viewer_user_id uuid not null,
  account_id uuid references public.wallet_accounts (id),
  status text not null default 'pending',
  idempotency_key text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists magic_reveal_unlocks_reveal_idx on public.magic_reveal_unlocks (reveal_id);
create index if not exists magic_reveal_unlocks_viewer_idx on public.magic_reveal_unlocks (viewer_user_id);
create unique index if not exists magic_reveal_unlocks_idem_uidx on public.magic_reveal_unlocks (idempotency_key) where idempotency_key is not null;
