-- Stage 31: P.O.P.S rule versioning — reproducible judgments, replays, audits.

create extension if not exists pgcrypto;

create table if not exists pops_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null,
  version text not null,
  description text,
  config_json jsonb,
  active_from timestamptz not null,
  active_until timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (rule_type, version)
);

create index if not exists idx_pops_rule_versions_rule_type_active
  on pops_rule_versions (rule_type, active_from desc);

create index if not exists idx_pops_rule_versions_active_window
  on pops_rule_versions (active_from, active_until);

create table if not exists pops_judgment_replays (
  id uuid primary key default gen_random_uuid(),
  original_judgment_id uuid references pops_judgments(id) on delete set null,
  session_id uuid not null references pops_sessions(id) on delete cascade,
  requested_by text not null,
  version_bundle jsonb not null,
  replay_output jsonb not null,
  difference_summary jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_judgment_replays_session_created
  on pops_judgment_replays (session_id, created_at desc);

create index if not exists idx_pops_judgment_replays_original
  on pops_judgment_replays (original_judgment_id);

-- Version fields for reproducibility (nullable for backfill; new rows should populate).
alter table pops_judgments
  add column if not exists scoring_model_version text,
  add column if not exists fraud_model_version text,
  add column if not exists reward_formula_version text,
  add column if not exists privacy_policy_version text,
  add column if not exists campaign_requirement_version text;

alter table pops_reward_decisions
  add column if not exists reward_formula_version text,
  add column if not exists wallet_rule_version text,
  add column if not exists campaign_requirement_version text;

alter table pops_privacy_receipts
  add column if not exists privacy_policy_version text,
  add column if not exists retention_policy_version text,
  add column if not exists consent_policy_version text;
