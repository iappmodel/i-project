-- 37/37 privacy foundation — processed, not possessed.
-- Raw signal is never persisted; only metadata and economic/legal proof are durable.

do $$
begin
  create type data_class as enum (
    'EPHEMERAL_HUMAN_SIGNAL',
    'USER_CONTROLLED_PRIVATE_INTELLIGENCE',
    'ECONOMIC_LEGAL_PROOF'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type retention_policy_kind as enum (
    'IMMEDIATE_DELETE',
    'SESSION_BOUNDED',
    'USER_CONTROLLED',
    'REGULATORY_FINANCIAL',
    'FRAUD_REVIEW_WINDOW'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type processing_location as enum (
    'ON_DEVICE',
    'TRUSTED_EDGE',
    'SECURE_BACKEND'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type privacy_status as enum (
    'ACTIVE',
    'INTERPRETED',
    'DELETED',
    'FAILED'
  );
exception
  when duplicate_object then null;
end
$$;

create table privacy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  consent_scope text not null,
  granted boolean not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  consent_receipt_id uuid not null default gen_random_uuid(),
  purpose text not null,
  retention_policy retention_policy_kind not null default 'USER_CONTROLLED',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index ux_privacy_consents_user_scope
  on privacy_consents(user_id, consent_scope);

create table privacy_event_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique default gen_random_uuid(),
  user_id uuid references users(id),
  event_type text not null,
  data_class data_class not null,
  purpose text not null,
  retention_policy retention_policy_kind not null,
  raw_data_included boolean not null default false check (raw_data_included = false),
  actor text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_privacy_event_audit_user_created
  on privacy_event_audit(user_id, created_at desc);

create table data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  policy_name text not null unique,
  data_class data_class not null,
  purpose text not null,
  retention_policy retention_policy_kind not null,
  retention_seconds bigint not null check (retention_seconds >= 0),
  legal_hold_allowed boolean not null default false,
  delete_mode text not null check (delete_mode in ('delete', 'anonymize')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table user_private_vault_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id),
  private_storage_enabled boolean not null default false,
  encryption_key_ref text,
  export_enabled boolean not null default true,
  delete_on_revoke boolean not null default true,
  last_exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table economic_proofs (
  id uuid primary key default gen_random_uuid(),
  proof_type text not null,
  user_id uuid not null references users(id),
  campaign_id uuid references campaigns(id),
  reward_decision_id uuid references reward_decisions(id),
  trust_score_id uuid references trust_scores(id),
  fraud_flag_id uuid references fraud_flags(id),
  consent_receipt_id uuid references privacy_consents(consent_receipt_id),
  purpose text not null,
  retention_policy retention_policy_kind not null default 'REGULATORY_FINANCIAL',
  raw_data_included boolean not null default false check (raw_data_included = false),
  proof_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_economic_proofs_user_created
  on economic_proofs(user_id, created_at desc);

create table raw_signal_processing_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid references users(id),
  signal_type text not null,
  processing_location processing_location not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  raw_data_persisted boolean not null default false check (raw_data_persisted = false),
  deletion_confirmed_at timestamptz,
  derived_event_id uuid references privacy_event_audit(event_id),
  privacy_status privacy_status not null default 'ACTIVE',
  purpose text not null,
  retention_policy retention_policy_kind not null default 'IMMEDIATE_DELETE',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_raw_signal_processing_sessions_user_started
  on raw_signal_processing_sessions(user_id, started_at desc);
