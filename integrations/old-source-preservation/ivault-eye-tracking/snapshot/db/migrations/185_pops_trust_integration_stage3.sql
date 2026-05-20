create extension if not exists pgcrypto;

create table if not exists pops_trust_impacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  source text not null,
  event_type text not null check (
    event_type in (
      'VERIFIED_HUMAN_MOMENT',
      'VERIFIED_ATTENTION_SESSION',
      'VERIFIED_INTENT_ACTION',
      'CLEAN_REWARD_COMPLETION',
      'CLEAN_CAMPAIGN_COMPLETION',
      'CONSISTENT_DEVICE_PRESENCE',
      'CONSISTENT_ACCOUNT_CONTINUITY',
      'CLEAN_PAYOUT_BEHAVIOR',
      'LOW_CONFIDENCE_SESSION',
      'REPEATED_DEGRADED_SESSION',
      'SUSPICIOUS_AUTOMATION_PATTERN',
      'IMPOSSIBLE_PROGRESS_PATTERN',
      'DEVICE_INTEGRITY_WARNING',
      'DUPLICATE_REWARD_ATTEMPT',
      'HIGH_FRAUD_RISK_SESSION',
      'IDENTITY_CONTINUITY_BREAK',
      'REWARD_ABUSE_PATTERN'
    )
  ),
  weight numeric(8, 6) not null,
  confidence numeric(8, 6) not null check (confidence >= 0 and confidence <= 1),
  severity text not null check (severity in ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  reason_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_trust_impacts_user_created_at
  on pops_trust_impacts (user_id, created_at desc);

create index if not exists idx_pops_trust_impacts_session
  on pops_trust_impacts (session_id);

create table if not exists pops_trust_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  pattern_key text not null,
  reason_code text not null,
  trigger_count integer not null check (trigger_count >= 1),
  window_days integer not null check (window_days >= 1),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  last_impact_id uuid references pops_trust_impacts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pattern_key, reason_code)
);

create index if not exists idx_pops_trust_patterns_user_updated_at
  on pops_trust_patterns (user_id, updated_at desc);

create table if not exists pops_trust_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  trust_impact_id uuid not null references pops_trust_impacts(id),
  recommended_action text not null check (
    recommended_action in (
      'NONE',
      'INCREASE_TRUST_LOW',
      'INCREASE_TRUST_MEDIUM',
      'MONITOR',
      'REDUCE_TRUST_LOW',
      'REDUCE_TRUST_MEDIUM',
      'REDUCE_TRUST_HIGH',
      'REQUIRE_REVERIFICATION',
      'REQUIRE_KYC',
      'BLOCK_REWARDS_TEMPORARILY',
      'SEND_TO_MANUAL_REVIEW'
    )
  ),
  reason_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_trust_recommendations_user_created_at
  on pops_trust_recommendations (user_id, created_at desc);
