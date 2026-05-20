-- P.O.P.S Stage 0 foundation schema
-- Proof Of Presence System

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pops_proof_level') then
    create type pops_proof_level as enum (
      'LEVEL_0_NONE',
      'LEVEL_1_SESSION',
      'LEVEL_2_ATTENTION',
      'LEVEL_3_INTENT',
      'LEVEL_4_IDENTITY_CONTINUITY',
      'LEVEL_5_HIGH_VALUE'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pops_session_type') then
    create type pops_session_type as enum (
      'FEED_VIEW',
      'SPONSORED_WATCH',
      'CREATOR_CONTENT',
      'BRAND_CAMPAIGN',
      'SURVEY',
      'LEARNING',
      'GPS_CHECK_IN',
      'QR_SCAN',
      'NFC_MERCHANT',
      'WALLET_CONVERSION',
      'WITHDRAWAL_REVIEW',
      'TIP_SEND',
      'PURCHASE_INTENT',
      'ACCOUNT_VERIFICATION'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pops_session_state') then
    create type pops_session_state as enum (
      'NOT_STARTED',
      'INITIALIZING',
      'DETECTING',
      'PRESENT_IDLE',
      'ENGAGED_PASSIVE',
      'ENGAGED_ACTIVE',
      'FOCUSED',
      'DISTRACTED',
      'INTERRUPTED',
      'DEGRADED',
      'UNCERTAIN',
      'SUSPICIOUS',
      'FRAUD_LIKELY',
      'COMPLETED',
      'REWARD_PENDING',
      'REWARD_APPROVED',
      'REWARD_PARTIAL',
      'REWARD_DENIED',
      'CLOSED'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pops_reward_eligibility') then
    create type pops_reward_eligibility as enum (
      'NOT_ELIGIBLE',
      'ELIGIBLE_PENDING',
      'ELIGIBLE_PARTIAL',
      'ELIGIBLE_FULL',
      'HELD_FOR_REVIEW',
      'DENIED'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pops_trust_impact') then
    create type pops_trust_impact as enum (
      'NONE',
      'POSITIVE_LOW',
      'POSITIVE_MEDIUM',
      'POSITIVE_HIGH',
      'NEGATIVE_LOW',
      'NEGATIVE_MEDIUM',
      'NEGATIVE_HIGH'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pops_privacy_policy') then
    create type pops_privacy_policy as enum (
      'DISCARD_RAW',
      'LOCAL_ONLY',
      'STORE_FEATURES_ONLY',
      'STORE_WITH_CONSENT',
      'STORE_FOR_KYC_REVIEW',
      'STORE_FOR_FRAUD_REVIEW'
    );
  end if;
end
$$;

create table if not exists pops_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id text not null,
  content_id text,
  campaign_id uuid,
  session_type pops_session_type not null,
  proof_level pops_proof_level not null,
  state pops_session_state not null default 'NOT_STARTED',
  started_at timestamptz not null,
  ended_at timestamptz,
  required_duration_ms bigint not null default 0 check (required_duration_ms >= 0),
  minimum_presence_confidence numeric(5,4) not null check (minimum_presence_confidence >= 0 and minimum_presence_confidence <= 1),
  minimum_attention_confidence numeric(5,4) not null check (minimum_attention_confidence >= 0 and minimum_attention_confidence <= 1),
  minimum_intent_confidence numeric(5,4) not null check (minimum_intent_confidence >= 0 and minimum_intent_confidence <= 1),
  maximum_fraud_risk numeric(5,4) not null check (maximum_fraud_risk >= 0 and maximum_fraud_risk <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_pops_sessions_user_started_at
  on pops_sessions (user_id, started_at desc);

create index if not exists idx_pops_sessions_campaign_id
  on pops_sessions (campaign_id)
  where campaign_id is not null;

create table if not exists pops_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  event_type text not null,
  signal_source text not null,
  timestamp_ms bigint not null check (timestamp_ms >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_events_session_timestamp
  on pops_events (session_id, timestamp_ms);

create index if not exists idx_pops_events_user_created_at
  on pops_events (user_id, created_at desc);

create table if not exists pops_signal_batches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  timestamp_ms bigint not null check (timestamp_ms >= 0),
  signals jsonb not null,
  privacy jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_signal_batches_session_timestamp
  on pops_signal_batches (session_id, timestamp_ms);

create table if not exists pops_judgments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  session_state pops_session_state not null,
  presence_confidence numeric(5,4) not null check (presence_confidence >= 0 and presence_confidence <= 1),
  attention_confidence numeric(5,4) not null check (attention_confidence >= 0 and attention_confidence <= 1),
  intent_confidence numeric(5,4) not null check (intent_confidence >= 0 and intent_confidence <= 1),
  continuity_confidence numeric(5,4) not null check (continuity_confidence >= 0 and continuity_confidence <= 1),
  fraud_risk numeric(5,4) not null check (fraud_risk >= 0 and fraud_risk <= 1),
  reward_eligibility pops_reward_eligibility not null,
  trust_impact pops_trust_impact not null,
  recommended_action text not null,
  reason_codes text[] not null default '{}',
  model_version text not null,
  rule_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_judgments_session_created_at
  on pops_judgments (session_id, created_at desc);

create table if not exists pops_reward_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  proof_level pops_proof_level not null,
  session_state pops_session_state not null,
  reward_eligibility pops_reward_eligibility not null,
  trust_impact pops_trust_impact not null,
  recommended_action text not null,
  reason_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_reward_decisions_user_created_at
  on pops_reward_decisions (user_id, created_at desc);

create table if not exists pops_privacy_receipts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  user_id uuid not null,
  session_type pops_session_type not null,
  proof_level pops_proof_level not null,
  raw_camera_stored boolean not null default false,
  raw_audio_stored boolean not null default false,
  raw_location_stored boolean not null default false,
  local_processing_used boolean not null default true,
  stored_feature_types text[] not null default '{}',
  retention_policy pops_privacy_policy not null,
  user_visible_summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_privacy_receipts_user_created_at
  on pops_privacy_receipts (user_id, created_at desc);
