-- Stage 14: P.O.P.S canonical core schema

create extension if not exists pgcrypto;

create table if not exists pops_reason_codes (
  code text primary key,
  category text not null,
  severity text not null check (severity in ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title text not null,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pops_model_rule_versions (
  id uuid primary key default gen_random_uuid(),
  model_version text not null,
  rule_version text not null,
  version_scope text not null check (version_scope in ('PRESENCE', 'ATTENTION', 'INTENT', 'CONTINUITY', 'FRAUD', 'REWARD', 'TRUST', 'COMBINED')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (model_version, rule_version, version_scope)
);

create table if not exists pops_proof_presets (
  id uuid primary key default gen_random_uuid(),
  proof_level text not null check (
    proof_level in (
      'LEVEL_0_NONE',
      'LEVEL_1_SESSION',
      'LEVEL_2_ATTENTION',
      'LEVEL_3_INTENT',
      'LEVEL_4_IDENTITY_CONTINUITY',
      'LEVEL_5_HIGH_VALUE'
    )
  ),
  preset_name text not null,
  minimum_presence_confidence numeric(5,4) not null check (minimum_presence_confidence >= 0 and minimum_presence_confidence <= 1),
  minimum_attention_confidence numeric(5,4) not null check (minimum_attention_confidence >= 0 and minimum_attention_confidence <= 1),
  minimum_intent_confidence numeric(5,4) not null check (minimum_intent_confidence >= 0 and minimum_intent_confidence <= 1),
  minimum_continuity_confidence numeric(5,4) not null check (minimum_continuity_confidence >= 0 and minimum_continuity_confidence <= 1),
  maximum_fraud_risk numeric(5,4) not null check (maximum_fraud_risk >= 0 and maximum_fraud_risk <= 1),
  created_at timestamptz not null default now(),
  unique (proof_level, preset_name)
);

create table if not exists pops_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid,
  content_id uuid,
  campaign_id uuid,
  session_type text not null check (
    session_type in (
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
    )
  ),
  proof_level text not null check (
    proof_level in (
      'LEVEL_0_NONE',
      'LEVEL_1_SESSION',
      'LEVEL_2_ATTENTION',
      'LEVEL_3_INTENT',
      'LEVEL_4_IDENTITY_CONTINUITY',
      'LEVEL_5_HIGH_VALUE'
    )
  ),
  state text not null check (
    state in (
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
    )
  ),
  started_at timestamptz not null,
  ended_at timestamptz,
  client_started_at timestamptz,
  client_ended_at timestamptz,
  required_duration_ms integer check (required_duration_ms is null or required_duration_ms >= 0),
  minimum_presence_confidence numeric(5,4) check (minimum_presence_confidence is null or (minimum_presence_confidence >= 0 and minimum_presence_confidence <= 1)),
  minimum_attention_confidence numeric(5,4) check (minimum_attention_confidence is null or (minimum_attention_confidence >= 0 and minimum_attention_confidence <= 1)),
  minimum_intent_confidence numeric(5,4) check (minimum_intent_confidence is null or (minimum_intent_confidence >= 0 and minimum_intent_confidence <= 1)),
  minimum_continuity_confidence numeric(5,4) check (minimum_continuity_confidence is null or (minimum_continuity_confidence >= 0 and minimum_continuity_confidence <= 1)),
  maximum_fraud_risk numeric(5,4) check (maximum_fraud_risk is null or (maximum_fraud_risk >= 0 and maximum_fraud_risk <= 1)),
  privacy_policy text not null,
  raw_storage_policy text not null,
  client_context jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pops_sessions_user_id on pops_sessions (user_id);
create index if not exists idx_pops_sessions_device_id on pops_sessions (device_id);
create index if not exists idx_pops_sessions_campaign_id on pops_sessions (campaign_id);
create index if not exists idx_pops_sessions_content_id on pops_sessions (content_id);
create index if not exists idx_pops_sessions_state on pops_sessions (state);
create index if not exists idx_pops_sessions_started_at on pops_sessions (started_at);
create index if not exists idx_pops_sessions_session_type on pops_sessions (session_type);
create index if not exists idx_pops_sessions_proof_level on pops_sessions (proof_level);

create or replace function pops_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists trg_pops_sessions_set_updated_at on pops_sessions;
create trigger trg_pops_sessions_set_updated_at
before update on pops_sessions
for each row
execute function pops_set_updated_at();

insert into pops_proof_presets (
  proof_level,
  preset_name,
  minimum_presence_confidence,
  minimum_attention_confidence,
  minimum_intent_confidence,
  minimum_continuity_confidence,
  maximum_fraud_risk
)
values
  ('LEVEL_1_SESSION', 'BASELINE', 0.4500, 0.3500, 0.2000, 0.2500, 0.9000),
  ('LEVEL_2_ATTENTION', 'STANDARD', 0.6500, 0.6000, 0.3500, 0.4500, 0.7000),
  ('LEVEL_3_INTENT', 'CAMPAIGN', 0.7500, 0.7000, 0.6500, 0.6000, 0.5000),
  ('LEVEL_4_IDENTITY_CONTINUITY', 'HIGH_VALUE', 0.8500, 0.7800, 0.7200, 0.8000, 0.3500),
  ('LEVEL_5_HIGH_VALUE', 'STRICT', 0.9000, 0.8500, 0.8000, 0.9000, 0.2000)
on conflict (proof_level, preset_name) do nothing;
