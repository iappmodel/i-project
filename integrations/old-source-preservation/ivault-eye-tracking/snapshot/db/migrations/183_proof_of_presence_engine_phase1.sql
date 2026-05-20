create table if not exists presence_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid,
  content_id uuid,
  campaign_id uuid,
  session_type text not null,
  state text not null default 'detecting',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  presence_confidence numeric(5,4),
  attention_confidence numeric(5,4),
  intent_confidence numeric(5,4),
  fraud_risk numeric(5,4),
  trust_tier_at_start int,
  age_band text,
  kyc_required boolean not null default false,
  raw_storage_policy text not null default 'discard_raw',
  privacy_mode text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_presence_sessions_user_started
  on presence_sessions (user_id, started_at desc);

create index if not exists idx_presence_sessions_campaign_started
  on presence_sessions (campaign_id, started_at desc);

create table if not exists presence_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references presence_sessions(id),
  user_id uuid not null,
  event_type text not null,
  event_source text not null,
  timestamp_ms bigint not null,
  client_created_at timestamptz not null,
  server_received_at timestamptz not null default now(),
  payload jsonb not null,
  confidence numeric(5,4),
  risk_score numeric(5,4),
  created_at timestamptz not null default now()
);

create index if not exists idx_presence_events_session_time
  on presence_events (session_id, server_received_at desc);

create index if not exists idx_presence_events_user_time
  on presence_events (user_id, server_received_at desc);

create table if not exists presence_judgments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references presence_sessions(id),
  user_id uuid not null,
  judgment_layer text not null,
  session_state text not null,
  presence_confidence numeric(5,4) not null,
  attention_confidence numeric(5,4) not null,
  intent_confidence numeric(5,4) not null,
  fraud_risk numeric(5,4) not null,
  emotion_vector jsonb,
  recommended_action text not null,
  model_version text not null,
  rule_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_presence_judgments_session_created
  on presence_judgments (session_id, created_at desc);

create table if not exists presence_reward_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references presence_sessions(id),
  user_id uuid not null,
  campaign_id uuid,
  decision text not null,
  coin_type text,
  base_amount_minor bigint,
  final_amount_minor bigint,
  presence_confidence numeric(5,4),
  attention_confidence numeric(5,4),
  intent_confidence numeric(5,4),
  fraud_risk numeric(5,4),
  hold_required boolean not null default false,
  hold_reason text,
  wallet_transaction_id uuid,
  campaign_budget_debit_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_presence_reward_decisions_session
  on presence_reward_decisions (session_id, created_at desc);

create table if not exists presence_privacy_receipts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references presence_sessions(id),
  user_id uuid not null,
  raw_camera_stored boolean not null default false,
  raw_audio_stored boolean not null default false,
  raw_location_stored boolean not null default false,
  local_processing_used boolean not null default true,
  raw_data_deleted_at timestamptz,
  retained_features jsonb,
  user_visible_summary text,
  created_at timestamptz not null default now()
);

create index if not exists idx_presence_privacy_receipts_session
  on presence_privacy_receipts (session_id, created_at desc);
