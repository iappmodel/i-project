create extension if not exists pgcrypto;

create table if not exists pops_privacy_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  session_type text not null,
  proof_level text not null,
  decision_id uuid,
  signal_categories_used text[] not null default '{}',
  raw_data_types_stored text[] not null default '{}',
  stored_feature_types text[] not null default '{}',
  local_processing_used boolean not null default false,
  raw_data_discarded boolean not null default true,
  retention_policy text not null check (
    retention_policy in (
      'SESSION_ONLY',
      'THIRTY_DAYS',
      'NINETY_DAYS',
      'ONE_YEAR',
      'FRAUD_REVIEW_REQUIRED',
      'KYC_REQUIRED',
      'LEGAL_REQUIRED'
    )
  ),
  retention_expires_at timestamptz,
  user_visible_summary text not null,
  internal_summary text not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pops_privacy_receipts_user_created_at
  on pops_privacy_receipts (user_id, created_at desc);

create index if not exists idx_pops_privacy_receipts_session_created_at
  on pops_privacy_receipts (session_id, created_at desc);

create index if not exists idx_pops_privacy_receipts_decision
  on pops_privacy_receipts (decision_id)
  where decision_id is not null;

