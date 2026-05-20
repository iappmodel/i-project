create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'currency_code') then
    create type currency_code as enum ('USD', 'ICOIN', 'VCOIN', 'RCOIN');
  end if;
end
$$;

create table if not exists pops_wallet_reward_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  campaign_id uuid not null,
  reward_decision_id uuid not null,
  coin_type currency_code not null,
  amount_minor bigint not null check (amount_minor >= 0),
  status text not null check (
    status in (
      'NO_REWARD',
      'PENDING',
      'PENDING_REVIEW',
      'HELD',
      'RELEASED',
      'PARTIALLY_RELEASED',
      'DENIED',
      'EXPIRED'
    )
  ),
  hold_reason text,
  release_eligible_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_pops_wallet_reward_intents_user_created_at
  on pops_wallet_reward_intents (user_id, created_at desc);

create index if not exists idx_pops_wallet_reward_intents_session_created_at
  on pops_wallet_reward_intents (session_id, created_at desc);

create index if not exists idx_pops_wallet_reward_intents_status_release
  on pops_wallet_reward_intents (status, release_eligible_at);

create table if not exists pops_wallet_release_events (
  id uuid primary key default gen_random_uuid(),
  reward_intent_id uuid not null references pops_wallet_reward_intents(id),
  from_status text not null,
  to_status text not null,
  amount_released_minor bigint not null check (amount_released_minor >= 0),
  release_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_wallet_release_events_intent_created_at
  on pops_wallet_release_events (reward_intent_id, created_at desc);

create table if not exists pops_wallet_hold_events (
  id uuid primary key default gen_random_uuid(),
  reward_intent_id uuid not null references pops_wallet_reward_intents(id),
  hold_reason text not null,
  hold_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_wallet_hold_events_intent_created_at
  on pops_wallet_hold_events (reward_intent_id, created_at desc);
