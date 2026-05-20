-- Stage 14: P.O.P.S privacy receipts

create extension if not exists pgcrypto;

create table if not exists pops_privacy_receipts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references pops_sessions(id) on delete cascade,
  judgment_id uuid references pops_judgments(id) on delete set null,
  reward_decision_id uuid references pops_reward_decisions(id) on delete set null,
  user_id uuid not null,
  session_type text not null,
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
  signal_categories_used text[],
  raw_data_types_stored text[],
  stored_feature_types text[],
  local_processing_used boolean default true,
  raw_data_discarded boolean default true,
  retention_policy text not null,
  retention_expires_at timestamptz,
  user_visible_summary text not null,
  internal_summary text,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_privacy_receipts_user_id on pops_privacy_receipts (user_id);
create index if not exists idx_pops_privacy_receipts_session_id on pops_privacy_receipts (session_id);
