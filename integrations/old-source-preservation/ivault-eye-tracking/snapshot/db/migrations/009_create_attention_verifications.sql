-- 9/23 MVP — attention_verifications — verified attention result consumed by reward issuance.

create table attention_verifications (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null unique references attention_sessions (id),
  user_id uuid not null references users (id),
  campaign_id uuid references campaigns (id),
  content_id uuid,

  verified boolean not null,

  attention_score numeric(5, 4) not null
    check (attention_score >= 0 and attention_score <= 1),
  quality_score numeric(5, 4) not null
    check (quality_score >= 0 and quality_score <= 1),
  fraud_risk numeric(5, 4) not null
    check (fraud_risk >= 0 and fraud_risk <= 1),

  watched_ms int not null default 0,
  verified_ms int not null default 0,
  required_ms int not null default 0,

  gaze_valid_ratio numeric(5, 4),
  face_present_ratio numeric(5, 4),
  blink_naturalness_score numeric(5, 4),
  interaction_score numeric(5, 4),

  failure_reason text,

  policy_version text not null,

  created_at timestamptz not null default now()
);

create index idx_attention_verifications_user
  on attention_verifications (user_id, created_at desc);

create index idx_attention_verifications_campaign
  on attention_verifications (campaign_id);

create index idx_attention_verifications_verified
  on attention_verifications (verified);
