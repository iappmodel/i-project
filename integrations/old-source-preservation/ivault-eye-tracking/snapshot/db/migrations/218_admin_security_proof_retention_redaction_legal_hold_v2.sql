-- Step 9.82 — Proof retention, redaction, and proof-scoped legal holds (v2).
-- Depends on: rooms/portals/enterprise tables, trust incidents, trust proof reports, answer receipts,
-- export bundles, public verification results, admin_users, scheduled_jobs, set_updated_at().
--
-- NOTE: `admin_security_legal_holds` (migration 154) is the compliance/MFA legal-hold system.
-- This migration uses NEW tables `admin_security_proof_legal_holds` + `admin_security_proof_legal_hold_subjects`
-- and RPCs `create_admin_security_proof_legal_hold`, `attach_admin_security_proof_legal_hold_to_matching_subjects`,
-- `release_admin_security_proof_legal_hold` to avoid name collisions.

-- ---------------------------------------------------------------------------
-- 1) Retention policies (before subjects for optional FK at end)
-- ---------------------------------------------------------------------------
create table if not exists admin_security_proof_retention_policies (
  id uuid primary key default gen_random_uuid(),

  retention_policy_key text not null unique,

  status text not null default 'active',

  policy_scope text not null default 'global_admin',

  name text not null,
  description text,

  subject_type text,
  data_classification text,
  sensitivity text,

  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete cascade,

  retention_days integer not null,
  delete_after_retention boolean not null default false,
  redact_after_retention boolean not null default false,

  minimum_retention_days integer not null default 30,
  maximum_retention_days integer,

  legal_hold_overrides_deletion boolean not null default true,
  incident_overrides_deletion boolean not null default true,
  governance_violation_overrides_deletion boolean not null default true,

  priority integer not null default 100,

  effective_at timestamptz not null default now(),
  expires_at timestamptz,

  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_proof_retention_policies_status_check
  check (
    status in (
      'draft',
      'active',
      'paused',
      'expired',
      'archived'
    )
  ),

  constraint admin_security_proof_retention_policies_scope_check
  check (
    policy_scope in (
      'global_admin',
      'customer',
      'private_room'
    )
  ),

  constraint admin_security_proof_retention_policies_retention_check
  check (
    retention_days >= minimum_retention_days
    and (
      maximum_retention_days is null
      or retention_days <= maximum_retention_days
    )
  ),

  constraint admin_security_proof_retention_policies_name_check
  check (length(trim(name)) > 0)
);

create index if not exists admin_security_proof_retention_policies_match_idx
on admin_security_proof_retention_policies (
  status,
  subject_type,
  data_classification,
  sensitivity,
  priority
);

create index if not exists admin_security_proof_retention_policies_scope_idx
on admin_security_proof_retention_policies (
  policy_scope,
  customer_name,
  customer_domain,
  private_room_id
);

drop trigger if exists admin_security_proof_retention_policies_set_updated_at
on admin_security_proof_retention_policies;

create trigger admin_security_proof_retention_policies_set_updated_at
before update on admin_security_proof_retention_policies
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Retention subjects
-- ---------------------------------------------------------------------------
create table if not exists admin_security_proof_retention_subjects (
  id uuid primary key default gen_random_uuid(),

  retention_subject_key text not null unique,

  status text not null default 'active',

  subject_type text not null,
  subject_id uuid,
  subject_key text not null,

  proof_type text,
  proof_key text,
  proof_hash_sha256 text,

  customer_name text,
  customer_domain text,

  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,

  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,

  sensitivity text not null default 'customer_confidential',
  data_classification text not null default 'proof_artifact',

  contains_personal_data boolean not null default false,
  contains_customer_confidential boolean not null default true,
  contains_security_sensitive boolean not null default false,
  contains_legal_sensitive boolean not null default false,

  retention_policy_id uuid references admin_security_proof_retention_policies(id) on delete set null,
  retention_policy_key text,

  retain_until timestamptz,
  eligible_for_deletion_at timestamptz,

  legal_hold_active boolean not null default false,
  redaction_required boolean not null default false,
  redacted_at timestamptz,

  deleted_at timestamptz,
  deletion_blocked_reason text,

  registered_at timestamptz not null default now(),
  last_evaluated_at timestamptz,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_proof_retention_subjects_status_check
  check (
    status in (
      'active',
      'retained',
      'eligible_for_deletion',
      'deletion_pending',
      'deleted',
      'redacted',
      'legal_hold',
      'blocked',
      'archived'
    )
  ),

  constraint admin_security_proof_retention_subjects_subject_type_check
  check (
    subject_type in (
      'answer_receipt',
      'answer_receipt_export_bundle',
      'trust_proof_report',
      'trust_timeline_snapshot',
      'timeline_event',
      'timeline_chain_checkpoint',
      'timeline_merkle_batch',
      'timeline_anchor',
      'public_verification_submission',
      'public_verification_result',
      'proof_verification_link',
      'proof_qr_code',
      'artifact_download',
      'trust_incident',
      'trust_incident_customer_notice',
      'proof_digest_run',
      'governance_decision',
      'governance_violation',
      'other'
    )
  ),

  constraint admin_security_proof_retention_subjects_sensitivity_check
  check (
    sensitivity in (
      'public',
      'customer_confidential',
      'restricted',
      'legal_sensitive',
      'security_sensitive'
    )
  ),

  constraint admin_security_proof_retention_subjects_classification_check
  check (
    data_classification in (
      'proof_artifact',
      'verification_log',
      'security_log',
      'customer_notice',
      'incident_record',
      'governance_record',
      'download_record',
      'digest_record',
      'system_record',
      'other'
    )
  ),

  constraint admin_security_proof_retention_subjects_subject_key_check
  check (length(trim(subject_key)) > 0)
);

create index if not exists admin_security_proof_retention_subjects_subject_idx
on admin_security_proof_retention_subjects (subject_type, subject_id);

create index if not exists admin_security_proof_retention_subjects_key_idx
on admin_security_proof_retention_subjects (subject_key);

create index if not exists admin_security_proof_retention_subjects_status_idx
on admin_security_proof_retention_subjects (status, eligible_for_deletion_at);

create index if not exists admin_security_proof_retention_subjects_customer_idx
on admin_security_proof_retention_subjects (customer_name, customer_domain, status);

create index if not exists admin_security_proof_retention_subjects_private_room_idx
on admin_security_proof_retention_subjects (private_room_id, status);

create index if not exists admin_security_proof_retention_subjects_legal_hold_idx
on admin_security_proof_retention_subjects (legal_hold_active, status);

drop trigger if exists admin_security_proof_retention_subjects_set_updated_at
on admin_security_proof_retention_subjects;

create trigger admin_security_proof_retention_subjects_set_updated_at
before update on admin_security_proof_retention_subjects
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Retention decisions
-- ---------------------------------------------------------------------------
create table if not exists admin_security_proof_retention_decisions (
  id uuid primary key default gen_random_uuid(),

  retention_decision_key text not null unique,

  status text not null default 'recorded',

  retention_subject_id uuid not null
    references admin_security_proof_retention_subjects(id)
    on delete cascade,

  subject_type text not null,
  subject_key text not null,

  decision_result text not null,

  retention_policy_id uuid references admin_security_proof_retention_policies(id) on delete set null,
  retention_policy_key text,

  retain_until timestamptz,
  eligible_for_deletion_at timestamptz,

  legal_hold_active boolean not null default false,
  deletion_blocked boolean not null default false,
  deletion_blocked_reason text,

  redaction_required boolean not null default false,

  decision_reasons jsonb not null default '[]'::jsonb,

  evaluated_at timestamptz not null default now(),

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_proof_retention_decisions_status_check
  check (
    status in (
      'recorded',
      'superseded',
      'archived'
    )
  ),

  constraint admin_security_proof_retention_decisions_result_check
  check (
    decision_result in (
      'retain',
      'eligible_for_deletion',
      'delete_blocked',
      'redact',
      'legal_hold',
      'no_policy'
    )
  )
);

create index if not exists admin_security_proof_retention_decisions_subject_idx
on admin_security_proof_retention_decisions (retention_subject_id, created_at desc);

create index if not exists admin_security_proof_retention_decisions_result_idx
on admin_security_proof_retention_decisions (decision_result, created_at desc);

-- ---------------------------------------------------------------------------
-- 4) Proof-scoped legal holds (distinct from admin_security_legal_holds / 154)
-- ---------------------------------------------------------------------------
create table if not exists admin_security_proof_legal_holds (
  id uuid primary key default gen_random_uuid(),

  legal_hold_key text not null unique,

  status text not null default 'active',

  hold_type text not null default 'legal',
  hold_scope text not null default 'global_admin',

  title text not null,
  description text,

  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,

  matter_reference text,
  external_case_reference text,

  reason text not null,

  starts_at timestamptz not null default now(),
  ends_at timestamptz,

  released_at timestamptz,
  released_by_auth_user_id uuid,
  released_by_admin_user_id uuid references admin_users(id) on delete set null,
  release_reason text,

  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_proof_legal_holds_status_check
  check (
    status in (
      'active',
      'released',
      'expired',
      'archived'
    )
  ),

  constraint admin_security_proof_legal_holds_type_check
  check (
    hold_type in (
      'legal',
      'regulatory',
      'security_investigation',
      'customer_dispute',
      'audit',
      'internal_review',
      'other'
    )
  ),

  constraint admin_security_proof_legal_holds_scope_check
  check (
    hold_scope in (
      'global_admin',
      'customer',
      'private_room',
      'subject'
    )
  ),

  constraint admin_security_proof_legal_holds_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_proof_legal_holds_reason_check
  check (length(trim(reason)) > 0)
);

create index if not exists admin_security_proof_legal_holds_status_idx
on admin_security_proof_legal_holds (status, starts_at desc);

create index if not exists admin_security_proof_legal_holds_scope_idx
on admin_security_proof_legal_holds (hold_scope, customer_name, customer_domain, private_room_id);

drop trigger if exists admin_security_proof_legal_holds_set_updated_at
on admin_security_proof_legal_holds;

create trigger admin_security_proof_legal_holds_set_updated_at
before update on admin_security_proof_legal_holds
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_legal_hold_subjects (
  id uuid primary key default gen_random_uuid(),

  legal_hold_subject_key text not null unique,

  status text not null default 'active',

  legal_hold_id uuid not null
    references admin_security_proof_legal_holds(id)
    on delete cascade,

  retention_subject_id uuid not null
    references admin_security_proof_retention_subjects(id)
    on delete cascade,

  subject_type text not null,
  subject_key text not null,

  hold_reason text,

  attached_at timestamptz not null default now(),

  released_at timestamptz,
  release_reason text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (legal_hold_id, retention_subject_id),

  constraint admin_security_proof_legal_hold_subjects_status_check
  check (
    status in (
      'active',
      'released',
      'archived'
    )
  )
);

create index if not exists admin_security_proof_legal_hold_subjects_hold_idx
on admin_security_proof_legal_hold_subjects (legal_hold_id, status);

create index if not exists admin_security_proof_legal_hold_subjects_subject_idx
on admin_security_proof_legal_hold_subjects (retention_subject_id, status);

drop trigger if exists admin_security_proof_legal_hold_subjects_set_updated_at
on admin_security_proof_legal_hold_subjects;

create trigger admin_security_proof_legal_hold_subjects_set_updated_at
before update on admin_security_proof_legal_hold_subjects
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Redaction requests / results
-- ---------------------------------------------------------------------------
create table if not exists admin_security_proof_redaction_requests (
  id uuid primary key default gen_random_uuid(),

  redaction_request_key text not null unique,

  status text not null default 'pending',

  redaction_type text not null,
  redaction_reason text not null,

  retention_subject_id uuid references admin_security_proof_retention_subjects(id) on delete cascade,

  subject_type text not null,
  subject_id uuid,
  subject_key text not null,

  proof_type text,
  proof_key text,

  requested_fields jsonb not null default '[]'::jsonb,
  redaction_strategy text not null default 'mask',

  requested_by_auth_user_id uuid,
  requested_by_admin_user_id uuid references admin_users(id) on delete set null,
  requested_by_email text,

  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  approved_at timestamptz,

  rejected_at timestamptz,
  rejection_reason text,

  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_proof_redaction_requests_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'archived'
    )
  ),

  constraint admin_security_proof_redaction_requests_type_check
  check (
    redaction_type in (
      'personal_data',
      'customer_confidential',
      'security_sensitive',
      'legal_sensitive',
      'field_level',
      'full_payload',
      'other'
    )
  ),

  constraint admin_security_proof_redaction_requests_strategy_check
  check (
    redaction_strategy in (
      'mask',
      'remove',
      'hash',
      'tokenize',
      'replace_with_placeholder',
      'full_redaction'
    )
  ),

  constraint admin_security_proof_redaction_requests_reason_check
  check (length(trim(redaction_reason)) > 0)
);

create index if not exists admin_security_proof_redaction_requests_status_idx
on admin_security_proof_redaction_requests (status, created_at desc);

create index if not exists admin_security_proof_redaction_requests_subject_idx
on admin_security_proof_redaction_requests (subject_type, subject_id);

create index if not exists admin_security_proof_redaction_requests_retention_subject_idx
on admin_security_proof_redaction_requests (retention_subject_id, status);

drop trigger if exists admin_security_proof_redaction_requests_set_updated_at
on admin_security_proof_redaction_requests;

create trigger admin_security_proof_redaction_requests_set_updated_at
before update on admin_security_proof_redaction_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_redaction_results (
  id uuid primary key default gen_random_uuid(),

  redaction_result_key text not null unique,

  redaction_request_id uuid not null
    references admin_security_proof_redaction_requests(id)
    on delete cascade,

  retention_subject_id uuid references admin_security_proof_retention_subjects(id) on delete set null,

  status text not null default 'completed',

  subject_type text not null,
  subject_key text not null,

  redaction_strategy text not null,

  original_checksum_sha256 text,
  redacted_checksum_sha256 text,

  original_storage_uri text,
  redacted_storage_uri text,

  redacted_fields jsonb not null default '[]'::jsonb,
  redaction_manifest jsonb not null default '{}'::jsonb,

  payload_bytes_before bigint,
  payload_bytes_after bigint,

  completed_at timestamptz not null default now(),

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_proof_redaction_results_status_check
  check (
    status in (
      'completed',
      'partial',
      'failed',
      'archived'
    )
  )
);

create index if not exists admin_security_proof_redaction_results_request_idx
on admin_security_proof_redaction_results (redaction_request_id);

create index if not exists admin_security_proof_redaction_results_subject_idx
on admin_security_proof_redaction_results (retention_subject_id);

-- ---------------------------------------------------------------------------
-- 6) Lifecycle events
-- ---------------------------------------------------------------------------
create table if not exists admin_security_proof_lifecycle_events (
  id uuid primary key default gen_random_uuid(),

  lifecycle_event_key text not null unique,

  event_type text not null,
  event_action text not null,

  status text not null default 'recorded',

  retention_subject_id uuid references admin_security_proof_retention_subjects(id) on delete set null,

  subject_type text,
  subject_id uuid,
  subject_key text,

  legal_hold_id uuid references admin_security_proof_legal_holds(id) on delete set null,
  redaction_request_id uuid references admin_security_proof_redaction_requests(id) on delete set null,
  retention_decision_id uuid references admin_security_proof_retention_decisions(id) on delete set null,

  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_email text,

  title text,
  summary text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_proof_lifecycle_events_type_check
  check (
    event_type in (
      'subject_registered',
      'retention_evaluated',
      'eligible_for_deletion',
      'deletion_blocked',
      'deleted',
      'legal_hold_created',
      'legal_hold_attached',
      'legal_hold_released',
      'redaction_requested',
      'redaction_approved',
      'redaction_rejected',
      'redaction_completed',
      'redaction_failed',
      'policy_applied',
      'other'
    )
  ),

  constraint admin_security_proof_lifecycle_events_status_check
  check (
    status in (
      'recorded',
      'failed',
      'archived'
    )
  )
);

create index if not exists admin_security_proof_lifecycle_events_subject_idx
on admin_security_proof_lifecycle_events (retention_subject_id, created_at desc);

create index if not exists admin_security_proof_lifecycle_events_type_idx
on admin_security_proof_lifecycle_events (event_type, created_at desc);
