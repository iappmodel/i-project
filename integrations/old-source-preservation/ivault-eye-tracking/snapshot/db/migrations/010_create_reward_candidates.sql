-- 10/23 MVP — reward_candidates — pre-issuance reward rows keyed by verification.

create table reward_candidates (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users (id),
  campaign_id uuid not null references campaigns (id),
  verification_id uuid not null unique references attention_verifications (id),

  expected_amount_minor bigint not null check (expected_amount_minor > 0),
  currency currency_code not null,

  eligibility_status text not null
    check (eligibility_status in ('eligible', 'needs_review', 'ineligible')),

  reason text,

  policy_version text not null,
  idempotency_key text not null unique,

  created_at timestamptz not null default now()
);

create index idx_reward_candidates_user
  on reward_candidates (user_id, created_at desc);

create index idx_reward_candidates_campaign
  on reward_candidates (campaign_id);

create index idx_reward_candidates_status
  on reward_candidates (eligibility_status);
