-- Stage 14: P.O.P.S campaign requirements

create extension if not exists pgcrypto;

create table if not exists pops_campaign_requirements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid unique not null,
  required_proof_level text not null check (
    required_proof_level in (
      'LEVEL_0_NONE',
      'LEVEL_1_SESSION',
      'LEVEL_2_ATTENTION',
      'LEVEL_3_INTENT',
      'LEVEL_4_IDENTITY_CONTINUITY',
      'LEVEL_5_HIGH_VALUE'
    )
  ),
  minimum_duration_ms integer check (minimum_duration_ms is null or minimum_duration_ms >= 0),
  minimum_completion_pct numeric(5,2) check (minimum_completion_pct is null or (minimum_completion_pct >= 0 and minimum_completion_pct <= 100)),
  minimum_presence_confidence numeric(5,4) check (minimum_presence_confidence is null or (minimum_presence_confidence >= 0 and minimum_presence_confidence <= 1)),
  minimum_attention_confidence numeric(5,4) check (minimum_attention_confidence is null or (minimum_attention_confidence >= 0 and minimum_attention_confidence <= 1)),
  minimum_intent_confidence numeric(5,4) check (minimum_intent_confidence is null or (minimum_intent_confidence >= 0 and minimum_intent_confidence <= 1)),
  minimum_continuity_confidence numeric(5,4) check (minimum_continuity_confidence is null or (minimum_continuity_confidence >= 0 and minimum_continuity_confidence <= 1)),
  maximum_fraud_risk numeric(5,4) check (maximum_fraud_risk is null or (maximum_fraud_risk >= 0 and maximum_fraud_risk <= 1)),
  visual_presence_required boolean default false,
  interaction_required boolean default false,
  cta_required boolean default false,
  location_proof_required boolean default false,
  merchant_proof_required boolean default false,
  identity_continuity_required boolean default false,
  kyc_required boolean default false,
  age_restriction text,
  reward_hold_policy text,
  manual_review_policy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_pops_campaign_requirements_set_updated_at on pops_campaign_requirements;
create trigger trg_pops_campaign_requirements_set_updated_at
before update on pops_campaign_requirements
for each row
execute function pops_set_updated_at();
