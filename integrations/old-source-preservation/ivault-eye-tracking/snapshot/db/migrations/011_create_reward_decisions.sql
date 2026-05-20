-- 11/23 MVP — reward_decisions — issuance outcome per reward candidate (approved / rejected / held).

create table reward_decisions (
  id uuid primary key default gen_random_uuid(),

  reward_candidate_id uuid not null unique references reward_candidates (id),
  user_id uuid not null references users (id),
  campaign_id uuid not null references campaigns (id),
  verification_id uuid not null references attention_verifications (id),

  decision text not null
    check (decision in ('approved', 'rejected', 'held')),

  amount_minor bigint check (amount_minor >= 0),
  currency currency_code,

  budget_reservation_id uuid references budget_reservations (id),

  initial_status text
    check (initial_status in ('pending', 'available', 'held')),

  rejection_reason text,
  hold_reason text,

  trust_score_at_issuance numeric(5, 2),
  fraud_risk_at_issuance numeric(5, 4),

  policy_version text not null,
  idempotency_key text not null unique,

  created_at timestamptz not null default now()
);

create index idx_reward_decisions_user
  on reward_decisions (user_id, created_at desc);

create index idx_reward_decisions_campaign
  on reward_decisions (campaign_id);

create index idx_reward_decisions_decision
  on reward_decisions (decision);
