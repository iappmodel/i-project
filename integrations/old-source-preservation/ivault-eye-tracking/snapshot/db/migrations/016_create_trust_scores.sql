-- 16/23 MVP — trust_scores — per-user trust state for payouts, limits, and campaign access.

create table trust_scores (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique references users (id),

  score numeric(5,2) not null check (score >= 0 and score <= 100),

  level text not null
    check (level in ('new', 'low', 'normal', 'trusted', 'high_trust', 'restricted')),

  payout_delay_hours int not null default 72,
  daily_earn_limit_minor bigint not null default 0,
  daily_withdrawal_limit_minor bigint not null default 0,
  campaign_access_tier int not null default 0,

  last_recomputed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);
