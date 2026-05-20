-- 6/23 MVP — budget_reservations — soft-hold campaign spend to prevent overspending.

create table budget_reservations (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null references campaigns (id),
  user_id uuid not null references users (id),

  reward_candidate_id uuid,

  amount_minor bigint not null check (amount_minor > 0),
  currency currency_code not null,

  status text not null default 'active'
    check (status in ('active', 'captured', 'released', 'expired', 'cancelled')),

  expires_at timestamptz not null,

  captured_at timestamptz,
  released_at timestamptz,

  idempotency_key text not null unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_budget_reservations_campaign on budget_reservations (campaign_id);
create index idx_budget_reservations_user on budget_reservations (user_id);
create index idx_budget_reservations_status_expiry on budget_reservations (status, expires_at);
