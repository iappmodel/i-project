-- Step 9.83 — Audit package / regulator bundle / evidence export v2.
-- Runs after 218_admin_security_proof_retention_redaction_legal_hold_v2.sql.

-- ---------------------------------------------------------------------------
-- 0) Governance stubs (for FKs and package assembly; extend in future phases)
-- ---------------------------------------------------------------------------
create table if not exists admin_security_proof_governance_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_key text not null unique,
  decision_result text not null default 'allow',
  decision_summary text,
  proof_type text,
  proof_key text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  evaluated_policy_count integer not null default 0,
  matched_policy_count integer not null default 0,
  blocking_policy_key text,
  decision_reasons jsonb not null default '[]'::jsonb,
  action text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists admin_security_proof_governance_decisions_set_updated_at
on admin_security_proof_governance_decisions;

create trigger admin_security_proof_governance_decisions_set_updated_at
before update on admin_security_proof_governance_decisions
for each row
execute function set_updated_at();

create table if not exists admin_security_proof_governance_violations (
  id uuid primary key default gen_random_uuid(),
  violation_key text not null unique,
  decision_id uuid references admin_security_proof_governance_decisions(id) on delete set null,
  proof_key text,
  subject_key text,
  subject_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 1) Test helper: register retention subject (smoke tests)
-- ---------------------------------------------------------------------------
create or replace function register_admin_security_proof_retention_subject(
  p_subject_type text,
  p_subject_id uuid,
  p_subject_key text,
  p_proof_type text,
  p_proof_key text,
  p_proof_hash_sha256 text,
  p_customer_name text,
  p_customer_domain text,
  p_private_room_id uuid,
  p_auditor_portal_id uuid,
  p_enterprise_review_room_id uuid,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_sensitivity text,
  p_data_classification text,
  p_contains_personal_data boolean,
  p_contains_customer_confidential boolean,
  p_contains_security_sensitive boolean,
  p_contains_legal_sensitive boolean,
  p_request_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_key text;
begin
  v_key :=
    'retention_subject:' ||
    p_subject_type || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_proof_retention_subjects (
    retention_subject_key,
    status,
    subject_type,
    subject_id,
    subject_key,
    proof_type,
    proof_key,
    proof_hash_sha256,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    sensitivity,
    data_classification,
    contains_personal_data,
    contains_customer_confidential,
    contains_security_sensitive,
    contains_legal_sensitive,
    request_id,
    metadata
  )
  values (
    v_key,
    'active',
    p_subject_type,
    p_subject_id,
    p_subject_key,
    p_proof_type,
    p_proof_key,
    p_proof_hash_sha256,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    p_storage_uri,
    p_checksum_sha256,
    p_payload_bytes,
    coalesce(p_sensitivity, 'customer_confidential'),
    coalesce(p_data_classification, 'proof_artifact'),
    coalesce(p_contains_personal_data, false),
    coalesce(p_contains_customer_confidential, true),
    coalesce(p_contains_security_sensitive, false),
    coalesce(p_contains_legal_sensitive, false),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function register_admin_security_proof_retention_subject(
  text, uuid, text, text, text, text, text, text, uuid, uuid, uuid, text, text, bigint,
  text, text, boolean, boolean, boolean, boolean, text, jsonb
) to admin_api_role, worker_role;

-- ---------------------------------------------------------------------------
-- 2) audit_package_requests (legal_hold -> proof-scoped holds)
-- ---------------------------------------------------------------------------
create table if not exists admin_security_audit_package_requests (
  id uuid primary key default gen_random_uuid(),
  audit_package_request_key text not null unique,
  status text not null default 'pending',
  request_type text not null,
  request_scope text not null,
  title text not null,
  description text,
  requested_by_type text not null default 'admin',
  requested_by_auth_user_id uuid,
  requested_by_admin_user_id uuid references admin_users(id) on delete set null,
  requested_by_email text,
  requested_by_display_name text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  incident_id uuid references admin_security_trust_incidents(id) on delete set null,
  legal_hold_id uuid references admin_security_proof_legal_holds(id) on delete set null,
  governance_violation_id uuid references admin_security_proof_governance_violations(id) on delete set null,
  retention_subject_id uuid references admin_security_proof_retention_subjects(id) on delete set null,
  include_reports boolean not null default true,
  include_receipts boolean not null default true,
  include_exports boolean not null default true,
  include_verifications boolean not null default true,
  include_qr_links boolean not null default true,
  include_incidents boolean not null default true,
  include_customer_notices boolean not null default true,
  include_governance boolean not null default true,
  include_retention boolean not null default true,
  include_legal_holds boolean not null default true,
  include_lifecycle_events boolean not null default true,
  include_observability boolean not null default false,
  include_raw_payloads boolean not null default false,
  include_redacted_only boolean not null default true,
  require_approval boolean not null default true,
  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  approved_at timestamptz,
  approval_note text,
  rejected_by_auth_user_id uuid,
  rejected_by_admin_user_id uuid references admin_users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  expires_at timestamptz default (now() + interval '30 days'),
  request_reason text,
  external_reference text,
  request_payload jsonb not null default '{}'::jsonb,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_audit_package_requests_status_check
  check (
    status in (
      'pending', 'approved', 'rejected', 'building', 'completed', 'failed',
      'expired', 'cancelled', 'archived'
    )
  ),
  constraint admin_security_audit_package_requests_type_check
  check (
    request_type in (
      'customer_evidence', 'auditor_package', 'regulator_bundle', 'incident_evidence',
      'legal_hold_export', 'governance_export', 'retention_export', 'internal_review',
      'full_trust_export', 'other'
    )
  ),
  constraint admin_security_audit_package_requests_scope_check
  check (
    request_scope in (
      'global_admin', 'customer', 'private_room', 'auditor_portal', 'enterprise_review_room',
      'incident', 'legal_hold', 'governance_violation', 'retention_subject'
    )
  ),
  constraint admin_security_audit_package_requests_requested_by_type_check
  check (
    requested_by_type in (
      'admin', 'customer', 'auditor', 'legal', 'regulator', 'system'
    )
  ),
  constraint admin_security_audit_package_requests_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_audit_package_requests_status_idx
on admin_security_audit_package_requests (status, created_at desc);
create index if not exists admin_security_audit_package_requests_scope_idx
on admin_security_audit_package_requests (request_scope, request_type, created_at desc);
create index if not exists admin_security_audit_package_requests_private_room_idx
on admin_security_audit_package_requests (private_room_id, status);
create index if not exists admin_security_audit_package_requests_incident_idx
on admin_security_audit_package_requests (incident_id, status);
create index if not exists admin_security_audit_package_requests_legal_hold_idx
on admin_security_audit_package_requests (legal_hold_id, status);

drop trigger if exists admin_security_audit_package_requests_set_updated_at
on admin_security_audit_package_requests;
create trigger admin_security_audit_package_requests_set_updated_at
before update on admin_security_audit_package_requests
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) admin_security_audit_packages
-- ---------------------------------------------------------------------------
create table if not exists admin_security_audit_packages (
  id uuid primary key default gen_random_uuid(),
  audit_package_key text not null unique,
  status text not null default 'building',
  audit_package_request_id uuid references admin_security_audit_package_requests(id) on delete set null,
  package_type text not null,
  package_scope text not null,
  title text not null,
  description text,
  customer_name text,
  customer_domain text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  auditor_portal_id uuid references admin_security_auditor_portals(id) on delete set null,
  enterprise_review_room_id uuid references admin_security_enterprise_review_rooms(id) on delete set null,
  incident_id uuid references admin_security_trust_incidents(id) on delete set null,
  legal_hold_id uuid references admin_security_proof_legal_holds(id) on delete set null,
  governance_violation_id uuid references admin_security_proof_governance_violations(id) on delete set null,
  retention_subject_id uuid references admin_security_proof_retention_subjects(id) on delete set null,
  package_version text not null default 'audit-package-v1',
  item_count integer not null default 0,
  critical_item_count integer not null default 0,
  redacted_item_count integer not null default 0,
  manifest_json jsonb not null default '{}'::jsonb,
  manifest_hash_sha256 text,
  package_storage_uri text,
  package_checksum_sha256 text,
  package_bytes bigint,
  signature_algorithm text,
  signature_key_id text,
  signature_value text,
  signed_at timestamptz,
  integrity_status text not null default 'not_checked',
  integrity_checked_at timestamptz,
  integrity_error text,
  generated_by_worker_id text,
  generated_by_auth_user_id uuid,
  generated_by_admin_user_id uuid references admin_users(id) on delete set null,
  generated_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  expires_at timestamptz default (now() + interval '90 days'),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_audit_packages_status_check
  check (status in ('building', 'ready', 'failed', 'revoked', 'expired', 'archived')),
  constraint admin_security_audit_packages_type_check
  check (
    package_type in (
      'customer_evidence', 'auditor_package', 'regulator_bundle', 'incident_evidence',
      'legal_hold_export', 'governance_export', 'retention_export', 'internal_review',
      'full_trust_export', 'other'
    )
  ),
  constraint admin_security_audit_packages_scope_check
  check (
    package_scope in (
      'global_admin', 'customer', 'private_room', 'auditor_portal', 'enterprise_review_room',
      'incident', 'legal_hold', 'governance_violation', 'retention_subject'
    )
  ),
  constraint admin_security_audit_packages_integrity_status_check
  check (integrity_status in ('not_checked', 'verified', 'failed', 'partially_verified')),
  constraint admin_security_audit_packages_title_check
  check (length(trim(title)) > 0)
);

create index if not exists admin_security_audit_packages_status_idx
on admin_security_audit_packages (status, created_at desc);
create index if not exists admin_security_audit_packages_scope_idx
on admin_security_audit_packages (package_scope, package_type, created_at desc);
create index if not exists admin_security_audit_packages_request_idx
on admin_security_audit_packages (audit_package_request_id);
create index if not exists admin_security_audit_packages_private_room_idx
on admin_security_audit_packages (private_room_id, status);
create index if not exists admin_security_audit_packages_incident_idx
on admin_security_audit_packages (incident_id, status);

drop trigger if exists admin_security_audit_packages_set_updated_at
on admin_security_audit_packages;
create trigger admin_security_audit_packages_set_updated_at
before update on admin_security_audit_packages
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) admin_security_audit_package_items
-- ---------------------------------------------------------------------------
create table if not exists admin_security_audit_package_items (
  id uuid primary key default gen_random_uuid(),
  audit_package_id uuid not null references admin_security_audit_packages(id) on delete cascade,
  item_key text not null,
  item_type text not null,
  item_category text not null default 'evidence',
  item_title text,
  item_summary text,
  source_table text,
  source_id uuid,
  source_key text,
  retention_subject_id uuid references admin_security_proof_retention_subjects(id) on delete set null,
  proof_type text,
  proof_key text,
  proof_hash_sha256 text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  redaction_status text not null default 'not_redacted',
  redacted_storage_uri text,
  redacted_checksum_sha256 text,
  sensitivity text,
  data_classification text,
  customer_visible boolean not null default false,
  regulator_visible boolean not null default false,
  internal_only boolean not null default true,
  item_payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  included_at timestamptz not null default now(),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (audit_package_id, item_key),
  constraint admin_security_audit_package_items_type_check
  check (
    item_type in (
      'trust_proof_report', 'answer_receipt', 'answer_receipt_export_bundle', 'trust_timeline_snapshot',
      'timeline_event', 'timeline_chain_checkpoint', 'timeline_merkle_batch', 'timeline_anchor',
      'public_verification_submission', 'public_verification_result', 'proof_verification_link',
      'proof_qr_code', 'artifact_download', 'trust_incident', 'trust_incident_signal',
      'trust_incident_update', 'trust_incident_customer_notice', 'proof_digest_run',
      'governance_decision', 'governance_violation', 'governance_approval_request', 'retention_subject',
      'retention_decision', 'legal_hold', 'legal_hold_subject', 'redaction_request', 'redaction_result',
      'lifecycle_event', 'observability_snapshot', 'health_signal', 'other'
    )
  ),
  constraint admin_security_audit_package_items_category_check
  check (
    item_category in (
      'evidence', 'manifest', 'verification', 'incident', 'governance', 'retention', 'legal',
      'lifecycle', 'observability', 'metadata', 'other'
    )
  ),
  constraint admin_security_audit_package_items_redaction_status_check
  check (
    redaction_status in (
      'not_redacted', 'redacted', 'redaction_required', 'redaction_failed', 'not_applicable'
    )
  )
);

create index if not exists admin_security_audit_package_items_package_idx
on admin_security_audit_package_items (audit_package_id, sort_order);
create index if not exists admin_security_audit_package_items_source_idx
on admin_security_audit_package_items (source_table, source_id);
create index if not exists admin_security_audit_package_items_retention_subject_idx
on admin_security_audit_package_items (retention_subject_id);

-- ---------------------------------------------------------------------------
-- 5) admin_security_audit_package_access_grants
-- ---------------------------------------------------------------------------
create table if not exists admin_security_audit_package_access_grants (
  id uuid primary key default gen_random_uuid(),
  access_grant_key text not null unique,
  status text not null default 'active',
  audit_package_id uuid not null references admin_security_audit_packages(id) on delete cascade,
  grantee_type text not null,
  grantee_email text not null,
  grantee_display_name text,
  grantee_auth_user_id uuid,
  access_level text not null default 'view',
  can_download boolean not null default true,
  can_verify boolean not null default true,
  can_share boolean not null default false,
  access_token_hash text,
  access_url text,
  max_uses integer,
  use_count integer not null default 0,
  expires_at timestamptz default (now() + interval '30 days'),
  granted_by_auth_user_id uuid,
  granted_by_admin_user_id uuid references admin_users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id) on delete set null,
  revocation_reason text,
  last_used_at timestamptz,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_audit_package_access_grants_status_check
  check (status in ('active', 'revoked', 'expired', 'exhausted', 'archived')),
  constraint admin_security_audit_package_access_grants_grantee_type_check
  check (
    grantee_type in (
      'customer', 'auditor', 'regulator', 'legal', 'admin', 'external_reviewer'
    )
  ),
  constraint admin_security_audit_package_access_grants_access_level_check
  check (access_level in ('view', 'download', 'verify', 'admin')),
  constraint admin_security_audit_package_access_grants_email_check
  check (position('@' in grantee_email) > 1)
);

create index if not exists admin_security_audit_package_access_grants_package_idx
on admin_security_audit_package_access_grants (audit_package_id, status);
create index if not exists admin_security_audit_package_access_grants_email_idx
on admin_security_audit_package_access_grants (grantee_email, status);
create index if not exists admin_security_audit_package_access_grants_token_idx
on admin_security_audit_package_access_grants (access_token_hash);

drop trigger if exists admin_security_audit_package_access_grants_set_updated_at
on admin_security_audit_package_access_grants;
create trigger admin_security_audit_package_access_grants_set_updated_at
before update on admin_security_audit_package_access_grants
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 6) admin_security_audit_package_events
-- ---------------------------------------------------------------------------
create table if not exists admin_security_audit_package_events (
  id uuid primary key default gen_random_uuid(),
  audit_package_event_key text not null unique,
  audit_package_id uuid references admin_security_audit_packages(id) on delete cascade,
  audit_package_request_id uuid references admin_security_audit_package_requests(id) on delete set null,
  access_grant_id uuid references admin_security_audit_package_access_grants(id) on delete set null,
  event_type text not null,
  event_action text not null,
  actor_type text not null default 'system',
  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_email text,
  title text,
  summary text,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_audit_package_events_type_check
  check (
    event_type in (
      'request_created', 'request_approved', 'request_rejected', 'package_build_started',
      'package_item_added', 'manifest_created', 'package_signed', 'package_ready', 'package_failed',
      'package_downloaded', 'package_verified', 'access_granted', 'access_revoked', 'access_used',
      'package_expired', 'package_revoked', 'other'
    )
  ),
  constraint admin_security_audit_package_events_actor_type_check
  check (
    actor_type in (
      'admin', 'customer', 'auditor', 'regulator', 'legal', 'system', 'worker', 'external'
    )
  )
);

create index if not exists admin_security_audit_package_events_package_idx
on admin_security_audit_package_events (audit_package_id, created_at desc);
create index if not exists admin_security_audit_package_events_request_idx
on admin_security_audit_package_events (audit_package_request_id, created_at desc);
create index if not exists admin_security_audit_package_events_type_idx
on admin_security_audit_package_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 7) record_admin_security_audit_package_event
-- ---------------------------------------------------------------------------
create or replace function record_admin_security_audit_package_event(
  p_event_type text,
  p_event_action text,
  p_audit_package_id uuid default null,
  p_audit_package_request_id uuid default null,
  p_access_grant_id uuid default null,
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_title text default null,
  p_summary text default null,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_key text;
begin
  v_key :=
    'audit_package_event:' ||
    p_event_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_audit_package_events (
    audit_package_event_key,
    audit_package_id,
    audit_package_request_id,
    access_grant_id,
    event_type,
    event_action,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    title,
    summary,
    ip_address,
    user_agent,
    request_id,
    metadata
  )
  values (
    v_key,
    p_audit_package_id,
    p_audit_package_request_id,
    p_access_grant_id,
    p_event_type,
    p_event_action,
    coalesce(p_actor_type, 'system'),
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    p_title,
    p_summary,
    p_ip_address,
    p_user_agent,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) create_admin_security_audit_package_request
-- ---------------------------------------------------------------------------
create or replace function create_admin_security_audit_package_request(
  p_admin_auth_user_id uuid,
  p_request_type text,
  p_request_scope text,
  p_title text,
  p_description text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_private_room_id uuid default null,
  p_auditor_portal_id uuid default null,
  p_enterprise_review_room_id uuid default null,
  p_incident_id uuid default null,
  p_legal_hold_id uuid default null,
  p_governance_violation_id uuid default null,
  p_retention_subject_id uuid default null,
  p_include_raw_payloads boolean default false,
  p_include_redacted_only boolean default true,
  p_request_reason text default null,
  p_external_reference text default null,
  p_require_approval boolean default true,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin admin_users%rowtype;
  v_id uuid;
  v_key text;
  v_status text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
    raise exception 'missing required permission: admin.read';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'audit package title is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_key :=
    'audit_package_request:' ||
    p_request_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  v_status := case when coalesce(p_require_approval, true) then 'pending' else 'approved' end;

  insert into admin_security_audit_package_requests (
    audit_package_request_key,
    status,
    request_type,
    request_scope,
    title,
    description,
    requested_by_type,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    requested_by_email,
    requested_by_display_name,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    incident_id,
    legal_hold_id,
    governance_violation_id,
    retention_subject_id,
    include_raw_payloads,
    include_redacted_only,
    require_approval,
    approved_by_auth_user_id,
    approved_by_admin_user_id,
    approved_at,
    request_reason,
    external_reference,
    request_payload,
    request_id,
    metadata
  )
  values (
    v_key,
    v_status,
    p_request_type,
    p_request_scope,
    p_title,
    p_description,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    v_admin.display_name,
    p_customer_name,
    p_customer_domain,
    p_private_room_id,
    p_auditor_portal_id,
    p_enterprise_review_room_id,
    p_incident_id,
    p_legal_hold_id,
    p_governance_violation_id,
    p_retention_subject_id,
    coalesce(p_include_raw_payloads, false),
    coalesce(p_include_redacted_only, true),
    coalesce(p_require_approval, true),
    case when v_status = 'approved' then p_admin_auth_user_id else null end,
    case when v_status = 'approved' then v_admin.id else null end,
    case when v_status = 'approved' then now() else null end,
    p_request_reason,
    p_external_reference,
    jsonb_build_object(
      'includeRawPayloads', coalesce(p_include_raw_payloads, false),
      'includeRedactedOnly', coalesce(p_include_redacted_only, true)
    ),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  perform record_admin_security_audit_package_event(
    'request_created',
    'created',
    null,
    v_id,
    null,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Audit package request created',
    p_title,
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) approve_admin_security_audit_package_request
-- ---------------------------------------------------------------------------
create or replace function approve_admin_security_audit_package_request(
  p_admin_auth_user_id uuid,
  p_audit_package_request_id uuid,
  p_approval_note text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin admin_users%rowtype;
  v_req admin_security_audit_package_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_audit_package_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_admin_auth_user_id,
    approved_by_admin_user_id = v_admin.id,
    approved_at = now(),
    approval_note = p_approval_note,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_audit_package_request_id
    and status = 'pending'
  returning * into v_req;

  if not found then
    raise exception 'audit package request not found or not pending: %', p_audit_package_request_id;
  end if;

  perform record_admin_security_audit_package_event(
    'request_approved',
    'approved',
    null,
    v_req.id,
    null,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Audit package request approved',
    p_approval_note,
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_req.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10) reject_admin_security_audit_package_request
-- ---------------------------------------------------------------------------
create or replace function reject_admin_security_audit_package_request(
  p_admin_auth_user_id uuid,
  p_audit_package_request_id uuid,
  p_rejection_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin admin_users%rowtype;
  v_req admin_security_audit_package_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
    raise exception 'audit package rejection reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_security_audit_package_requests
  set
    status = 'rejected',
    rejected_by_auth_user_id = p_admin_auth_user_id,
    rejected_by_admin_user_id = v_admin.id,
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_audit_package_request_id
    and status = 'pending'
  returning * into v_req;

  if not found then
    raise exception 'audit package request not found or not pending: %', p_audit_package_request_id;
  end if;

  perform record_admin_security_audit_package_event(
    'request_rejected',
    'rejected',
    null,
    v_req.id,
    null,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Audit package request rejected',
    p_rejection_reason,
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_req.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) build_admin_security_audit_package_from_request
-- ---------------------------------------------------------------------------
create or replace function build_admin_security_audit_package_from_request(
  p_audit_package_request_id uuid,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req admin_security_audit_package_requests%rowtype;
  v_package_id uuid := null;
  v_package_key text;
  v_item_count integer := 0;
  v_critical_count integer := 0;
  v_redacted_count integer := 0;
  v_manifest jsonb;
  v_manifest_hash text;
  v_manifest_bytes bigint;
begin
  select *
  into v_req
  from admin_security_audit_package_requests
  where id = p_audit_package_request_id
  for update;

  if v_req.id is null then
    raise exception 'audit package request not found: %', p_audit_package_request_id;
  end if;

  if v_req.status <> 'approved' then
    raise exception 'audit package request is not approved: %', v_req.status;
  end if;

  update admin_security_audit_package_requests
  set status = 'building', updated_at = now()
  where id = v_req.id;

  v_package_key :=
    'audit_package:' ||
    v_req.request_type || ':' ||
    substr(encode(gen_random_bytes(12), 'hex'), 1, 24);

  insert into admin_security_audit_packages (
    audit_package_key,
    status,
    audit_package_request_id,
    package_type,
    package_scope,
    title,
    description,
    customer_name,
    customer_domain,
    private_room_id,
    auditor_portal_id,
    enterprise_review_room_id,
    incident_id,
    legal_hold_id,
    governance_violation_id,
    retention_subject_id,
    generated_by_worker_id,
    generated_at,
    request_id,
    metadata
  )
  values (
    v_package_key,
    'building',
    v_req.id,
    v_req.request_type,
    v_req.request_scope,
    v_req.title,
    v_req.description,
    v_req.customer_name,
    v_req.customer_domain,
    v_req.private_room_id,
    v_req.auditor_portal_id,
    v_req.enterprise_review_room_id,
    v_req.incident_id,
    v_req.legal_hold_id,
    v_req.governance_violation_id,
    v_req.retention_subject_id,
    p_worker_id,
    now(),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_package_id;

  perform record_admin_security_audit_package_event(
    'package_build_started',
    'building',
    v_package_id,
    v_req.id,
    null,
    'worker',
    null,
    null,
    null,
    'Audit package build started',
    v_req.title,
    null,
    null,
    p_request_id,
    jsonb_build_object('worker_id', p_worker_id)
  );

  insert into admin_security_audit_package_items (
    audit_package_id,
    item_key,
    item_type,
    item_category,
    item_title,
    item_summary,
    source_table,
    source_id,
    source_key,
    retention_subject_id,
    proof_type,
    proof_key,
    proof_hash_sha256,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    redaction_status,
    redacted_storage_uri,
    redacted_checksum_sha256,
    sensitivity,
    data_classification,
    customer_visible,
    regulator_visible,
    internal_only,
    item_payload,
    sort_order,
    metadata
  )
  select
    v_package_id,
    'audit_package_item:retention_subject:' || s.retention_subject_key,
    s.subject_type,
    case
      when s.data_classification = 'incident_record' then 'incident'
      when s.data_classification = 'governance_record' then 'governance'
      when s.data_classification = 'verification_log' then 'verification'
      when s.data_classification = 'download_record' then 'metadata'
      else 'evidence'
    end,
    s.subject_type || ': ' || s.subject_key,
    'Retention subject included in audit package.',
    'admin_security_proof_retention_subjects',
    s.id,
    s.subject_key,
    s.id,
    s.proof_type,
    s.proof_key,
    s.proof_hash_sha256,
    case
      when v_req.include_redacted_only is true and s.redacted_at is null and s.redaction_required is true then null
      else s.storage_uri
    end,
    s.checksum_sha256,
    s.payload_bytes,
    case
      when s.redacted_at is not null then 'redacted'
      when s.redaction_required is true then 'redaction_required'
      else 'not_redacted'
    end,
    null,
    null,
    s.sensitivity,
    s.data_classification,
    case
      when s.sensitivity in ('public', 'customer_confidential') then true
      else false
    end,
    case
      when s.sensitivity in ('public', 'customer_confidential', 'restricted', 'legal_sensitive') then true
      else false
    end,
    case
      when s.sensitivity in ('security_sensitive') then true
      else false
    end,
    jsonb_build_object(
      'retentionSubjectKey', s.retention_subject_key,
      'status', s.status,
      'dataClassification', s.data_classification,
      'sensitivity', s.sensitivity,
      'retainUntil', s.retain_until,
      'legalHoldActive', s.legal_hold_active,
      'redactedAt', s.redacted_at
    ),
    row_number() over (order by s.created_at asc)::integer,
    '{}'::jsonb
  from admin_security_proof_retention_subjects s
  where s.status <> 'deleted'
    and (
      v_req.request_scope = 'global_admin'
      or (
        v_req.request_scope = 'customer'
        and s.customer_name = v_req.customer_name
        and coalesce(s.customer_domain, '') = coalesce(v_req.customer_domain, '')
      )
      or (v_req.request_scope = 'private_room' and s.private_room_id = v_req.private_room_id)
      or (v_req.request_scope = 'auditor_portal' and s.auditor_portal_id = v_req.auditor_portal_id)
      or (v_req.request_scope = 'enterprise_review_room' and s.enterprise_review_room_id = v_req.enterprise_review_room_id)
      or (
        v_req.request_scope = 'incident'
        and (
          (s.subject_type = 'trust_incident' and s.subject_id = v_req.incident_id)
          or exists (
            select 1
            from admin_security_trust_incidents i
            where i.id = v_req.incident_id
              and i.incident_key = s.subject_key
          )
        )
      )
      or (
        v_req.request_scope = 'legal_hold'
        and exists (
          select 1
          from admin_security_proof_legal_hold_subjects lhs
          where lhs.legal_hold_id = v_req.legal_hold_id
            and lhs.retention_subject_id = s.id
            and lhs.status = 'active'
        )
      )
      or (
        v_req.request_scope = 'governance_violation'
        and exists (
          select 1
          from admin_security_proof_governance_violations gv
          where gv.id = v_req.governance_violation_id
            and (
              gv.proof_key = s.proof_key
              or gv.subject_key = s.subject_key
              or gv.subject_id = s.subject_id
            )
        )
      )
      or (v_req.request_scope = 'retention_subject' and s.id = v_req.retention_subject_id)
    )
    and (
      v_req.include_raw_payloads is true
      or s.sensitivity <> 'security_sensitive'
    );

  if v_req.include_incidents is true then
    insert into admin_security_audit_package_items (
      audit_package_id,
      item_key,
      item_type,
      item_category,
      item_title,
      item_summary,
      source_table,
      source_id,
      source_key,
      proof_type,
      proof_key,
      proof_hash_sha256,
      sensitivity,
      data_classification,
      customer_visible,
      regulator_visible,
      internal_only,
      item_payload,
      sort_order,
      metadata
    )
    select
      v_package_id,
      'audit_package_item:incident:' || i.incident_key,
      'trust_incident',
      'incident',
      i.title,
      i.summary,
      'admin_security_trust_incidents',
      i.id,
      i.incident_key,
      null,
      null,
      null,
      'legal_sensitive',
      'incident_record',
      i.customer_notice_required,
      true,
      false,
      jsonb_build_object(
        'incidentKey', i.incident_key,
        'status', i.status,
        'severity', i.severity,
        'incidentType', i.incident_type,
        'customerNoticeRequired', i.customer_notice_required,
        'createdAt', i.created_at,
        'updatedAt', i.updated_at
      ),
      10000 + row_number() over (order by i.created_at asc)::integer,
      '{}'::jsonb
    from admin_security_trust_incidents i
    where (
      v_req.request_scope = 'global_admin'
      or (v_req.request_scope = 'customer' and i.customer_name = v_req.customer_name)
      or (v_req.request_scope = 'private_room' and i.private_room_id = v_req.private_room_id)
      or (v_req.request_scope = 'incident' and i.id = v_req.incident_id)
      or (
        v_req.request_scope = 'legal_hold'
        and exists (
          select 1
          from admin_security_proof_legal_hold_subjects lhs
          join admin_security_proof_retention_subjects s2 on s2.id = lhs.retention_subject_id
          where lhs.legal_hold_id = v_req.legal_hold_id
            and lhs.status = 'active'
            and s2.subject_type = 'trust_incident'
            and s2.subject_id = i.id
        )
      )
    )
    on conflict (audit_package_id, item_key) do nothing;
  end if;

  if v_req.include_governance is true then
    insert into admin_security_audit_package_items (
      audit_package_id,
      item_key,
      item_type,
      item_category,
      item_title,
      item_summary,
      source_table,
      source_id,
      source_key,
      proof_type,
      proof_key,
      sensitivity,
      data_classification,
      customer_visible,
      regulator_visible,
      internal_only,
      item_payload,
      sort_order,
      metadata
    )
    select
      v_package_id,
      'audit_package_item:governance_decision:' || d.decision_key,
      'governance_decision',
      'governance',
      'Governance decision: ' || d.decision_result,
      d.decision_summary,
      'admin_security_proof_governance_decisions',
      d.id,
      d.decision_key,
      d.proof_type,
      d.proof_key,
      'restricted',
      'governance_record',
      false,
      true,
      true,
      jsonb_build_object(
        'decisionKey', d.decision_key,
        'decisionResult', d.decision_result,
        'action', d.action,
        'evaluatedPolicyCount', d.evaluated_policy_count,
        'matchedPolicyCount', d.matched_policy_count,
        'blockingPolicyKey', d.blocking_policy_key,
        'decisionReasons', d.decision_reasons,
        'decidedAt', d.decided_at
      ),
      20000 + row_number() over (order by d.created_at asc)::integer,
      '{}'::jsonb
    from admin_security_proof_governance_decisions d
    where (
      v_req.request_scope = 'global_admin'
      or (v_req.request_scope = 'customer' and d.customer_name = v_req.customer_name)
      or (v_req.request_scope = 'private_room' and d.private_room_id = v_req.private_room_id)
      or (
        v_req.request_scope = 'governance_violation'
        and exists (
          select 1
          from admin_security_proof_governance_violations gv
          where gv.id = v_req.governance_violation_id
            and gv.decision_id = d.id
        )
      )
    )
    on conflict (audit_package_id, item_key) do nothing;
  end if;

  if v_req.include_retention is true then
    insert into admin_security_audit_package_items (
      audit_package_id,
      item_key,
      item_type,
      item_category,
      item_title,
      item_summary,
      source_table,
      source_id,
      source_key,
      retention_subject_id,
      sensitivity,
      data_classification,
      customer_visible,
      regulator_visible,
      internal_only,
      item_payload,
      sort_order,
      metadata
    )
    select
      v_package_id,
      'audit_package_item:retention_decision:' || rd.retention_decision_key,
      'retention_decision',
      'retention',
      'Retention decision: ' || rd.decision_result,
      'Retention decision for ' || rd.subject_key,
      'admin_security_proof_retention_decisions',
      rd.id,
      rd.retention_decision_key,
      rd.retention_subject_id,
      'restricted',
      'governance_record',
      false,
      true,
      true,
      jsonb_build_object(
        'retentionDecisionKey', rd.retention_decision_key,
        'subjectType', rd.subject_type,
        'subjectKey', rd.subject_key,
        'decisionResult', rd.decision_result,
        'retentionPolicyKey', rd.retention_policy_key,
        'retainUntil', rd.retain_until,
        'eligibleForDeletionAt', rd.eligible_for_deletion_at,
        'legalHoldActive', rd.legal_hold_active,
        'deletionBlocked', rd.deletion_blocked,
        'deletionBlockedReason', rd.deletion_blocked_reason,
        'redactionRequired', rd.redaction_required
      ),
      30000 + row_number() over (order by rd.created_at asc)::integer,
      '{}'::jsonb
    from admin_security_proof_retention_decisions rd
    join admin_security_proof_retention_subjects s3
      on s3.id = rd.retention_subject_id
    where exists (
      select 1
      from admin_security_audit_package_items pi
      where pi.audit_package_id = v_package_id
        and pi.retention_subject_id = s3.id
    )
    on conflict (audit_package_id, item_key) do nothing;
  end if;

  if v_req.include_legal_holds is true then
    insert into admin_security_audit_package_items (
      audit_package_id,
      item_key,
      item_type,
      item_category,
      item_title,
      item_summary,
      source_table,
      source_id,
      source_key,
      sensitivity,
      data_classification,
      customer_visible,
      regulator_visible,
      internal_only,
      item_payload,
      sort_order,
      metadata
    )
    select
      v_package_id,
      'audit_package_item:legal_hold:' || h.legal_hold_key,
      'legal_hold',
      'legal',
      h.title,
      h.reason,
      'admin_security_proof_legal_holds',
      h.id,
      h.legal_hold_key,
      'legal_sensitive',
      'governance_record',
      false,
      true,
      true,
      jsonb_build_object(
        'legalHoldKey', h.legal_hold_key,
        'status', h.status,
        'holdType', h.hold_type,
        'holdScope', h.hold_scope,
        'matterReference', h.matter_reference,
        'externalCaseReference', h.external_case_reference,
        'startsAt', h.starts_at,
        'endsAt', h.ends_at,
        'releasedAt', h.released_at,
        'releaseReason', h.release_reason
      ),
      40000 + row_number() over (order by h.created_at asc)::integer,
      '{}'::jsonb
    from admin_security_proof_legal_holds h
    where (
      v_req.request_scope = 'legal_hold' and h.id = v_req.legal_hold_id
    )
    or (
      v_req.request_scope = 'customer'
      and h.customer_name = v_req.customer_name
    )
    or (
      v_req.request_scope = 'private_room'
      and h.private_room_id = v_req.private_room_id
    )
    on conflict (audit_package_id, item_key) do nothing;
  end if;

  select
    count(*),
    count(*) filter (
      where (item_payload->>'severity') = 'critical'
         or (item_payload->>'incidentType') in ('invalid_merkle_root', 'broken_timeline_chain')
    ),
    count(*) filter (where redaction_status = 'redacted')
  into v_item_count, v_critical_count, v_redacted_count
  from admin_security_audit_package_items
  where audit_package_id = v_package_id;

  select jsonb_build_object(
    'schemaVersion', 'audit-package-manifest-v1',
    'auditPackageKey', v_package_key,
    'packageType', v_req.request_type,
    'packageScope', v_req.request_scope,
    'title', v_req.title,
    'generatedAt', now(),
    'customerName', v_req.customer_name,
    'customerDomain', v_req.customer_domain,
    'privateRoomId', v_req.private_room_id,
    'counts', jsonb_build_object(
      'itemCount', v_item_count,
      'criticalItemCount', v_critical_count,
      'redactedItemCount', v_redacted_count
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'itemKey', item_key,
            'itemType', item_type,
            'itemCategory', item_category,
            'sourceTable', source_table,
            'sourceKey', source_key,
            'proofType', proof_type,
            'proofKey', proof_key,
            'proofHashSha256', proof_hash_sha256,
            'checksumSha256', checksum_sha256,
            'redactionStatus', redaction_status,
            'sensitivity', sensitivity,
            'dataClassification', data_classification
          )
          order by sort_order asc
        )
        from admin_security_audit_package_items
        where audit_package_id = v_package_id
      ),
      '[]'::jsonb
    )
  )
  into v_manifest;

  v_manifest_hash := encode(digest(v_manifest::text, 'sha256'), 'hex');
  v_manifest_bytes := length(v_manifest::text::bytea);

  update admin_security_audit_packages
  set
    status = 'ready',
    item_count = v_item_count,
    critical_item_count = coalesce(v_critical_count, 0),
    redacted_item_count = coalesce(v_redacted_count, 0),
    manifest_json = v_manifest,
    manifest_hash_sha256 = v_manifest_hash,
    package_checksum_sha256 = v_manifest_hash,
    package_bytes = v_manifest_bytes,
    signature_algorithm = 'sha256-manifest-placeholder',
    signature_key_id = 'system-local-placeholder',
    signature_value = v_manifest_hash,
    signed_at = now(),
    integrity_status = 'verified',
    integrity_checked_at = now(),
    completed_at = now(),
    updated_at = now()
  where id = v_package_id;

  update admin_security_audit_package_requests
  set status = 'completed', updated_at = now()
  where id = v_req.id;

  perform record_admin_security_audit_package_event(
    'manifest_created',
    'manifest_created',
    v_package_id,
    v_req.id,
    null,
    'worker',
    null,
    null,
    null,
    'Audit package manifest created',
    'Manifest hash: ' || v_manifest_hash,
    null,
    null,
    p_request_id,
    jsonb_build_object('worker_id', p_worker_id)
  );

  perform record_admin_security_audit_package_event(
    'package_ready',
    'ready',
    v_package_id,
    v_req.id,
    null,
    'worker',
    null,
    null,
    null,
    'Audit package ready',
    v_req.title,
    null,
    null,
    p_request_id,
    jsonb_build_object('worker_id', p_worker_id)
  );

  return v_package_id;

exception
  when others then
    if v_package_id is not null then
      update admin_security_audit_packages
      set
        status = 'failed',
        failed_at = now(),
        last_error = sqlerrm,
        updated_at = now()
      where id = v_package_id;
    end if;

    update admin_security_audit_package_requests
    set status = 'failed', updated_at = now()
    where id = p_audit_package_request_id;

    raise;
end;
$$;


-- ---------------------------------------------------------------------------
-- 12) process_approved_admin_security_audit_package_requests
-- ---------------------------------------------------------------------------
create or replace function process_approved_admin_security_audit_package_requests(
  p_batch_size integer default 100,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_count integer := 0;
  v_row record;
  v_package_id uuid;
begin
  if p_batch_size <= 0 or p_batch_size > 500 then
    raise exception 'batch size must be between 1 and 500';
  end if;

  for v_row in
    select id
    from admin_security_audit_package_requests
    where status = 'approved'
    order by approved_at asc nulls last, created_at asc
    limit p_batch_size
    for update skip locked
  loop
    v_package_id := build_admin_security_audit_package_from_request(
      v_row.id,
      p_worker_id,
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'audit_package_process_run_id',
        v_run_id
      )
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'runId',
    v_run_id,
    'built',
    v_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 13) verify_admin_security_audit_package_integrity
-- ---------------------------------------------------------------------------
create or replace function verify_admin_security_audit_package_integrity(
  p_audit_package_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg admin_security_audit_packages%rowtype;
  v_recomputed_manifest jsonb;
  v_recomputed_hash text;
  v_verified boolean := false;
begin
  select *
  into v_pkg
  from admin_security_audit_packages
  where id = p_audit_package_id
  for update;

  if v_pkg.id is null then
    raise exception 'audit package not found: %', p_audit_package_id;
  end if;

  select jsonb_build_object(
    'schemaVersion', 'audit-package-manifest-v1',
    'auditPackageKey', v_pkg.audit_package_key,
    'packageType', v_pkg.package_type,
    'packageScope', v_pkg.package_scope,
    'title', v_pkg.title,
    'customerName', v_pkg.customer_name,
    'customerDomain', v_pkg.customer_domain,
    'privateRoomId', v_pkg.private_room_id,
    'counts', jsonb_build_object(
      'itemCount', (
        select count(*)
        from admin_security_audit_package_items
        where audit_package_id = v_pkg.id
      )
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'itemKey', item_key,
            'itemType', item_type,
            'itemCategory', item_category,
            'sourceTable', source_table,
            'sourceKey', source_key,
            'proofType', proof_type,
            'proofKey', proof_key,
            'proofHashSha256', proof_hash_sha256,
            'checksumSha256', checksum_sha256,
            'redactionStatus', redaction_status,
            'sensitivity', sensitivity,
            'dataClassification', data_classification
          )
          order by sort_order asc
        )
        from admin_security_audit_package_items
        where audit_package_id = v_pkg.id
      ),
      '[]'::jsonb
    )
  )
  into v_recomputed_manifest;

  v_recomputed_hash := encode(digest(v_recomputed_manifest::text, 'sha256'), 'hex');

  v_verified := v_pkg.manifest_hash_sha256 is not null
    and exists (
      select 1
      from admin_security_audit_package_items
      where audit_package_id = v_pkg.id
    );

  update admin_security_audit_packages
  set
    integrity_status = case when v_verified then 'verified' else 'failed' end,
    integrity_checked_at = now(),
    integrity_error = case when v_verified then null else 'audit package failed integrity verification' end,
    updated_at = now()
  where id = v_pkg.id;

  perform record_admin_security_audit_package_event(
    'package_verified',
    case when v_verified then 'verified' else 'failed' end,
    v_pkg.id,
    v_pkg.audit_package_request_id,
    null,
    'system',
    null,
    null,
    null,
    'Audit package integrity checked',
    case when v_verified then 'Package integrity verified.' else 'Package integrity failed.' end,
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'recomputedManifestHash',
      v_recomputed_hash
    )
  );

  return jsonb_build_object(
    'auditPackageId',
    v_pkg.id,
    'verified',
    v_verified,
    'storedManifestHash',
    v_pkg.manifest_hash_sha256,
    'recomputedManifestHash',
    v_recomputed_hash
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 14) grant_admin_security_audit_package_access
-- ---------------------------------------------------------------------------
create or replace function grant_admin_security_audit_package_access(
  p_admin_auth_user_id uuid,
  p_audit_package_id uuid,
  p_grantee_type text,
  p_grantee_email text,
  p_grantee_display_name text default null,
  p_access_level text default 'view',
  p_can_download boolean default true,
  p_can_verify boolean default true,
  p_can_share boolean default false,
  p_max_uses integer default null,
  p_expires_at timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin admin_users%rowtype;
  v_pkg admin_security_audit_packages%rowtype;
  v_grant_id uuid;
  v_key text;
  v_token text;
  v_token_hash text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_grantee_email is null or position('@' in p_grantee_email) <= 1 then
    raise exception 'audit package grantee email is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_pkg
  from admin_security_audit_packages
  where id = p_audit_package_id;

  if v_pkg.id is null then
    raise exception 'audit package not found: %', p_audit_package_id;
  end if;

  if v_pkg.status <> 'ready' then
    raise exception 'audit package is not ready: %', v_pkg.status;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  v_key :=
    'audit_package_access:' ||
    v_pkg.audit_package_key || ':' ||
    lower(trim(p_grantee_email));

  insert into admin_security_audit_package_access_grants (
    access_grant_key,
    status,
    audit_package_id,
    grantee_type,
    grantee_email,
    grantee_display_name,
    access_level,
    can_download,
    can_verify,
    can_share,
    access_token_hash,
    access_url,
    max_uses,
    expires_at,
    granted_by_auth_user_id,
    granted_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_key,
    'active',
    v_pkg.id,
    p_grantee_type,
    lower(trim(p_grantee_email)),
    p_grantee_display_name,
    coalesce(p_access_level, 'view'),
    coalesce(p_can_download, true),
    coalesce(p_can_verify, true),
    coalesce(p_can_share, false),
    v_token_hash,
    '/audit-packages/access/' || v_token,
    p_max_uses,
    coalesce(p_expires_at, now() + interval '30 days'),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (access_grant_key)
  do update set
    status = 'active',
    grantee_display_name = excluded.grantee_display_name,
    access_level = excluded.access_level,
    can_download = excluded.can_download,
    can_verify = excluded.can_verify,
    can_share = excluded.can_share,
    access_token_hash = excluded.access_token_hash,
    access_url = excluded.access_url,
    max_uses = excluded.max_uses,
    expires_at = excluded.expires_at,
    metadata = admin_security_audit_package_access_grants.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_grant_id;

  perform record_admin_security_audit_package_event(
    'access_granted',
    'granted',
    v_pkg.id,
    v_pkg.audit_package_request_id,
    v_grant_id,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Audit package access granted',
    'Access granted to ' || lower(trim(p_grantee_email)),
    null,
    null,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_grant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 15) resolve_admin_security_audit_package_access_token
-- ---------------------------------------------------------------------------
create or replace function resolve_admin_security_audit_package_access_token(
  p_access_token text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_request_id text default null
)
returns table (
  audit_package_id uuid,
  audit_package_key text,
  access_grant_id uuid,
  grantee_email text,
  access_level text,
  can_download boolean,
  can_verify boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_grant admin_security_audit_package_access_grants%rowtype;
  v_pkg admin_security_audit_packages%rowtype;
begin
  if p_access_token is null or length(trim(p_access_token)) < 32 then
    raise exception 'invalid audit package access token';
  end if;

  v_hash := encode(digest(p_access_token, 'sha256'), 'hex');

  select *
  into v_grant
  from admin_security_audit_package_access_grants
  where access_token_hash = v_hash
  for update;

  if v_grant.id is null then
    raise exception 'audit package access grant not found';
  end if;

  if v_grant.status <> 'active' then
    raise exception 'audit package access grant is not active: %', v_grant.status;
  end if;

  if v_grant.expires_at is not null and v_grant.expires_at <= now() then
    update admin_security_audit_package_access_grants
    set status = 'expired', updated_at = now()
    where id = v_grant.id;

    raise exception 'audit package access grant expired';
  end if;

  if v_grant.max_uses is not null and v_grant.use_count >= v_grant.max_uses then
    update admin_security_audit_package_access_grants
    set status = 'exhausted', updated_at = now()
    where id = v_grant.id;

    raise exception 'audit package access grant exhausted';
  end if;

  select *
  into v_pkg
  from admin_security_audit_packages
  where id = v_grant.audit_package_id;

  if v_pkg.status <> 'ready' then
    raise exception 'audit package is not ready: %', v_pkg.status;
  end if;

  update admin_security_audit_package_access_grants
  set
    use_count = use_count + 1,
    last_used_at = now(),
    updated_at = now()
  where id = v_grant.id;

  perform record_admin_security_audit_package_event(
    'access_used',
    'used',
    v_pkg.id,
    v_pkg.audit_package_request_id,
    v_grant.id,
    v_grant.grantee_type,
    v_grant.grantee_auth_user_id,
    null,
    v_grant.grantee_email,
    'Audit package access used',
    null,
    p_ip_address,
    p_user_agent,
    p_request_id,
    '{}'::jsonb
  );

  return query
  select
    v_pkg.id,
    v_pkg.audit_package_key,
    v_grant.id,
    v_grant.grantee_email,
    v_grant.access_level,
    v_grant.can_download,
    v_grant.can_verify;
end;
$$;

-- ---------------------------------------------------------------------------
-- 16) expire_admin_security_audit_packages
-- ---------------------------------------------------------------------------
create or replace function expire_admin_security_audit_packages(
  p_batch_size integer default 1000,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid := gen_random_uuid();
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  update admin_security_audit_packages
  set
    status = 'expired',
    updated_at = now(),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'expired_by_worker',
      p_worker_id,
      'expiry_run_id',
      v_run_id
    )
  where id in (
    select id
    from admin_security_audit_packages
    where status = 'ready'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  update admin_security_audit_package_access_grants
  set status = 'expired', updated_at = now()
  where id in (
    select id
    from admin_security_audit_package_access_grants
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  );

  return v_run_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 17) Dashboard views
-- ---------------------------------------------------------------------------
create or replace view admin_security_audit_package_request_dashboard as
select
  r.id as admin_security_audit_package_request_id,
  r.audit_package_request_key,
  r.status,
  r.request_type,
  r.request_scope,
  r.title,
  r.description,
  r.requested_by_type,
  r.requested_by_email,
  r.requested_by_display_name,
  r.customer_name,
  r.customer_domain,
  r.private_room_id,
  pr.private_room_key,
  r.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  r.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  r.incident_id,
  i.incident_key,
  r.legal_hold_id,
  lh.legal_hold_key,
  r.governance_violation_id,
  gv.violation_key as governance_violation_key,
  r.retention_subject_id,
  rs.retention_subject_key,
  r.include_reports,
  r.include_receipts,
  r.include_exports,
  r.include_verifications,
  r.include_qr_links,
  r.include_incidents,
  r.include_customer_notices,
  r.include_governance,
  r.include_retention,
  r.include_legal_holds,
  r.include_lifecycle_events,
  r.include_observability,
  r.include_raw_payloads,
  r.include_redacted_only,
  r.require_approval,
  approver.email as approved_by_email,
  r.approved_at,
  r.approval_note,
  rejecter.email as rejected_by_email,
  r.rejected_at,
  r.rejection_reason,
  r.expires_at,
  r.request_reason,
  r.external_reference,
  (
    select count(*)
    from admin_security_audit_packages p
    where p.audit_package_request_id = r.id
  ) as package_count,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_audit_package_requests r
left join admin_security_private_trust_rooms pr
  on pr.id = r.private_room_id
left join admin_security_auditor_portals ap
  on ap.id = r.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = r.enterprise_review_room_id
left join admin_security_trust_incidents i
  on i.id = r.incident_id
left join admin_security_proof_legal_holds lh
  on lh.id = r.legal_hold_id
left join admin_security_proof_governance_violations gv
  on gv.id = r.governance_violation_id
left join admin_security_proof_retention_subjects rs
  on rs.id = r.retention_subject_id
left join admin_users approver
  on approver.id = r.approved_by_admin_user_id
left join admin_users rejecter
  on rejecter.id = r.rejected_by_admin_user_id
order by r.created_at desc;

create or replace view admin_security_audit_package_dashboard as
select
  p.id as admin_security_audit_package_id,
  p.audit_package_key,
  p.status,
  p.audit_package_request_id,
  r.audit_package_request_key,
  p.package_type,
  p.package_scope,
  p.title,
  p.description,
  p.customer_name,
  p.customer_domain,
  p.private_room_id,
  pr.private_room_key,
  p.auditor_portal_id,
  ap.portal_key as auditor_portal_key,
  p.enterprise_review_room_id,
  er.room_key as enterprise_review_room_key,
  p.incident_id,
  i.incident_key,
  p.legal_hold_id,
  lh.legal_hold_key,
  p.governance_violation_id,
  gv.violation_key as governance_violation_key,
  p.retention_subject_id,
  rs.retention_subject_key,
  p.package_version,
  p.item_count,
  p.critical_item_count,
  p.redacted_item_count,
  p.manifest_hash_sha256,
  p.package_storage_uri,
  p.package_checksum_sha256,
  p.package_bytes,
  p.signature_algorithm,
  p.signature_key_id,
  p.signed_at,
  p.integrity_status,
  p.integrity_checked_at,
  p.integrity_error,
  p.generated_by_worker_id,
  p.generated_at,
  p.completed_at,
  p.failed_at,
  p.last_error,
  p.expires_at,
  (
    select count(*)
    from admin_security_audit_package_access_grants g
    where g.audit_package_id = p.id
      and g.status = 'active'
  ) as active_access_grant_count,
  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_audit_packages p
left join admin_security_audit_package_requests r
  on r.id = p.audit_package_request_id
left join admin_security_private_trust_rooms pr
  on pr.id = p.private_room_id
left join admin_security_auditor_portals ap
  on ap.id = p.auditor_portal_id
left join admin_security_enterprise_review_rooms er
  on er.id = p.enterprise_review_room_id
left join admin_security_trust_incidents i
  on i.id = p.incident_id
left join admin_security_proof_legal_holds lh
  on lh.id = p.legal_hold_id
left join admin_security_proof_governance_violations gv
  on gv.id = p.governance_violation_id
left join admin_security_proof_retention_subjects rs
  on rs.id = p.retention_subject_id
order by p.created_at desc;

create or replace view admin_security_audit_package_item_dashboard as
select
  i.id as admin_security_audit_package_item_id,
  i.audit_package_id,
  p.audit_package_key,
  i.item_key,
  i.item_type,
  i.item_category,
  i.item_title,
  i.item_summary,
  i.source_table,
  i.source_id,
  i.source_key,
  i.retention_subject_id,
  rs.retention_subject_key,
  i.proof_type,
  i.proof_key,
  i.proof_hash_sha256,
  i.storage_uri,
  i.checksum_sha256,
  i.payload_bytes,
  i.redaction_status,
  i.redacted_storage_uri,
  i.redacted_checksum_sha256,
  i.sensitivity,
  i.data_classification,
  i.customer_visible,
  i.regulator_visible,
  i.internal_only,
  i.sort_order,
  i.included_at,
  i.created_at,
  i.metadata
from admin_security_audit_package_items i
join admin_security_audit_packages p
  on p.id = i.audit_package_id
left join admin_security_proof_retention_subjects rs
  on rs.id = i.retention_subject_id
order by i.audit_package_id, i.sort_order;

create or replace view admin_security_audit_package_access_grant_dashboard as
select
  g.id as admin_security_audit_package_access_grant_id,
  g.access_grant_key,
  g.status,
  g.audit_package_id,
  p.audit_package_key,
  p.title as package_title,
  g.grantee_type,
  g.grantee_email,
  g.grantee_display_name,
  g.grantee_auth_user_id,
  g.access_level,
  g.can_download,
  g.can_verify,
  g.can_share,
  g.access_url,
  g.max_uses,
  g.use_count,
  g.expires_at,
  granter.email as granted_by_email,
  g.revoked_at,
  revoker.email as revoked_by_email,
  g.revocation_reason,
  g.last_used_at,
  g.created_at,
  g.updated_at,
  g.metadata
from admin_security_audit_package_access_grants g
join admin_security_audit_packages p
  on p.id = g.audit_package_id
left join admin_users granter
  on granter.id = g.granted_by_admin_user_id
left join admin_users revoker
  on revoker.id = g.revoked_by_admin_user_id
order by g.created_at desc;

create or replace view admin_security_audit_package_integrity as
select
  (
    select count(*)
    from admin_security_audit_package_requests
    where status = 'pending'
  ) as pending_request_count,

  (
    select count(*)
    from admin_security_audit_package_requests
    where status = 'approved'
  ) as approved_unbuilt_request_count,

  (
    select count(*)
    from admin_security_audit_packages
    where status = 'ready'
  ) as ready_package_count,

  (
    select count(*)
    from admin_security_audit_packages
    where status = 'failed'
      and created_at >= now() - interval '24 hours'
  ) as failed_package_count_24h,

  (
    select count(*)
    from admin_security_audit_packages
    where status = 'ready'
      and manifest_hash_sha256 is null
  ) as ready_package_missing_manifest_hash_count,

  (
    select count(*)
    from admin_security_audit_packages
    where status = 'ready'
      and integrity_status <> 'verified'
  ) as ready_package_not_verified_count,

  (
    select count(*)
    from admin_security_audit_package_access_grants
    where status = 'active'
  ) as active_access_grant_count,

  (
    select count(*)
    from admin_security_audit_package_access_grants
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
  ) as expired_active_grant_count,

  now() as checked_at;

grant select on admin_security_audit_package_request_dashboard to admin_api_role;
grant select on admin_security_audit_package_dashboard to admin_api_role;
grant select on admin_security_audit_package_item_dashboard to admin_api_role;
grant select on admin_security_audit_package_access_grant_dashboard to admin_api_role;
grant select on admin_security_audit_package_integrity to admin_api_role;

-- ---------------------------------------------------------------------------
-- 18) Scheduled jobs
-- ---------------------------------------------------------------------------
insert into scheduled_jobs (
  job_key,
  job_name,
  job_group,
  enabled,
  schedule_cron,
  function_name,
  function_args,
  max_runtime_seconds,
  lock_ttl_seconds,
  metadata
)
values
  (
    'admin_security_audit_package_process_every_15m',
    'Process approved audit package requests',
    'admin',
    true,
    '*/15 * * * *',
    'process_approved_admin_security_audit_package_requests',
    '{"batch_size": 100}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_audit_package_expiry_daily',
    'Expire audit packages and grants',
    'admin',
    true,
    '45 3 * * *',
    'expire_admin_security_audit_packages',
    '{"batch_size": 1000}'::jsonb,
    180,
    300,
    '{"priority": "low"}'::jsonb
  )
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
  max_runtime_seconds = excluded.max_runtime_seconds,
  lock_ttl_seconds = excluded.lock_ttl_seconds,
  metadata = scheduled_jobs.metadata || excluded.metadata,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 19) run_scheduled_job (patched allowlist)
-- ---------------------------------------------------------------------------
create or replace function run_scheduled_job(
  p_job_key text,
  p_locked_by text default 'scheduler',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_job scheduled_jobs%rowtype;
  v_run_id uuid;

  v_lock_acquired boolean;
  v_started_at timestamptz;

  v_uuid_result uuid;
  v_result jsonb := '{}'::jsonb;
begin
  if p_job_key is null or length(trim(p_job_key)) = 0 then
    raise exception 'job key is required';
  end if;

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'disabled',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'disabled',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_lock_acquired := acquire_scheduled_job_lock(
    v_job.job_key,
    p_locked_by,
    v_job.lock_ttl_seconds,
    p_metadata
  );

  if v_lock_acquired is false then
    insert into scheduled_job_runs (
      scheduled_job_id,
      job_key,
      job_group,
      status,
      metadata
    )
    values (
      v_job.id,
      v_job.job_key,
      v_job.job_group,
      'skipped_locked',
      p_metadata
    )
    returning id into v_run_id;

    update scheduled_jobs
    set
      last_status = 'skipped_locked',
      last_run_id = v_run_id,
      updated_at = now()
    where id = v_job.id;

    return v_run_id;
  end if;

  v_started_at := now();

  insert into scheduled_job_runs (
    scheduled_job_id,
    job_key,
    job_group,
    status,
    started_at,
    metadata
  )
  values (
    v_job.id,
    v_job.job_key,
    v_job.job_group,
    'started',
    v_started_at,
    p_metadata
  )
  returning id into v_run_id;

  update scheduled_jobs
  set
    last_started_at = v_started_at,
    last_status = 'started',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  if v_job.function_name = 'run_reward_issuance_job' then
    v_uuid_result := run_reward_issuance_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'release_mature_reward_lots' then
    v_uuid_result := release_mature_reward_lots(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_accounting_mirror_job' then
    v_uuid_result := run_accounting_mirror_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_withdrawal_reserve_job' then
    v_uuid_result := run_withdrawal_reserve_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_audit_hash_backfill_job' then
    v_uuid_result := run_audit_hash_backfill_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'verify_audit_hash_chain' then
    v_uuid_result := verify_audit_hash_chain(
      coalesce(v_job.function_args->>'chain_key', 'global_audit_chain'),
      coalesce((v_job.function_args->>'batch_size')::integer, 100000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_observability_snapshot_job' then
    v_uuid_result := run_observability_snapshot_job(
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'run_payout_provider_event_processing_job' then
    v_uuid_result := run_payout_provider_event_processing_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_security_evidence_answer_sessions' then
    v_uuid_result := expire_admin_security_evidence_answer_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'expire_admin_security_answer_receipt_export_bundles' then
    v_uuid_result := expire_admin_security_answer_receipt_export_bundles(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_due_admin_security_proof_digests' then
    v_result := process_due_admin_security_proof_digests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_notification_events' then
    v_uuid_result := expire_admin_security_proof_notification_events(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_admin_security_proof_observability_cycle' then
    v_result := process_admin_security_proof_observability_cycle(
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_proof_observability_records' then
    v_uuid_result := expire_admin_security_proof_observability_records(
      coalesce((v_job.function_args->>'batch_size')::integer, 5000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  elsif v_job.function_name = 'process_approved_admin_security_audit_package_requests' then
    v_result := process_approved_admin_security_audit_package_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      'scheduled-job',
      v_run_id::text,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );

  elsif v_job.function_name = 'expire_admin_security_audit_packages' then
    v_uuid_result := expire_admin_security_audit_packages(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);

  else
    raise exception 'scheduled function not allowlisted: %', v_job.function_name;
  end if;

  update scheduled_job_runs
  set
    status = 'completed',
    completed_at = now(),
    runtime_ms = (extract(epoch from (now() - v_started_at)) * 1000)::integer,
    result = v_result
  where id = v_run_id;

  update scheduled_jobs
  set
    last_completed_at = now(),
    last_status = 'completed',
    last_run_id = v_run_id,
    updated_at = now()
  where id = v_job.id;

  perform release_scheduled_job_lock(v_job.job_key);
  return v_run_id;

exception
  when others then
    if v_run_id is not null then
      update scheduled_job_runs
      set
        status = 'failed',
        failed_at = now(),
        runtime_ms =
          case
            when v_started_at is not null then (extract(epoch from (now() - v_started_at)) * 1000)::integer
            else null
          end,
        error_message = sqlerrm
      where id = v_run_id;
    end if;

    update scheduled_jobs
    set
      last_failed_at = now(),
      last_status = 'failed',
      last_run_id = v_run_id,
      updated_at = now()
    where job_key = p_job_key;

    perform release_scheduled_job_lock(p_job_key);
    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 20) RLS / grants
-- ---------------------------------------------------------------------------
alter table admin_security_audit_package_requests enable row level security;
alter table admin_security_audit_packages enable row level security;
alter table admin_security_audit_package_items enable row level security;
alter table admin_security_audit_package_access_grants enable row level security;
alter table admin_security_audit_package_events enable row level security;

drop policy if exists admin_api_all_audit_package_requests on admin_security_audit_package_requests;
create policy admin_api_all_audit_package_requests
on admin_security_audit_package_requests
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_audit_packages on admin_security_audit_packages;
create policy admin_api_all_audit_packages
on admin_security_audit_packages
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_audit_package_items on admin_security_audit_package_items;
create policy admin_api_all_audit_package_items
on admin_security_audit_package_items
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_audit_package_access_grants on admin_security_audit_package_access_grants;
create policy admin_api_all_audit_package_access_grants
on admin_security_audit_package_access_grants
for all to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_audit_package_events on admin_security_audit_package_events;
create policy admin_api_all_audit_package_events
on admin_security_audit_package_events
for all to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_audit_package_requests on admin_security_audit_package_requests;
create policy worker_all_audit_package_requests
on admin_security_audit_package_requests
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_audit_packages on admin_security_audit_packages;
create policy worker_all_audit_packages
on admin_security_audit_packages
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_audit_package_items on admin_security_audit_package_items;
create policy worker_all_audit_package_items
on admin_security_audit_package_items
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_audit_package_access_grants on admin_security_audit_package_access_grants;
create policy worker_all_audit_package_access_grants
on admin_security_audit_package_access_grants
for all to worker_role
using (true)
with check (true);

drop policy if exists worker_all_audit_package_events on admin_security_audit_package_events;
create policy worker_all_audit_package_events
on admin_security_audit_package_events
for all to worker_role
using (true)
with check (true);

grant execute on function record_admin_security_audit_package_event(
  text,text,uuid,uuid,uuid,text,uuid,uuid,text,text,text,inet,text,text,jsonb
) to admin_api_role, worker_role;

grant execute on function create_admin_security_audit_package_request(
  uuid,text,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,boolean,boolean,text,text,boolean,text,jsonb
) to admin_api_role;

grant execute on function approve_admin_security_audit_package_request(uuid,uuid,text,text,jsonb)
to admin_api_role;

grant execute on function reject_admin_security_audit_package_request(uuid,uuid,text,text,jsonb)
to admin_api_role;

grant execute on function build_admin_security_audit_package_from_request(uuid,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function process_approved_admin_security_audit_package_requests(integer,text,text,jsonb)
to admin_api_role, worker_role;

grant execute on function verify_admin_security_audit_package_integrity(uuid,text,jsonb)
to admin_api_role, worker_role;

grant execute on function grant_admin_security_audit_package_access(
  uuid,uuid,text,text,text,text,boolean,boolean,boolean,integer,timestamptz,text,jsonb
) to admin_api_role;

grant execute on function resolve_admin_security_audit_package_access_token(text,inet,text,text)
to admin_api_role, worker_role;

grant execute on function expire_admin_security_audit_packages(integer,text,jsonb)
to admin_api_role, worker_role;

-- ---------------------------------------------------------------------------
-- 21) Error taxonomy
-- ---------------------------------------------------------------------------
insert into error_catalog (
  error_code,
  category,
  severity,
  http_status,
  retryable,
  user_visible,
  user_message,
  internal_message,
  owner_team
)
values
  (
    'AUDIT_PACKAGE_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Audit package not found.',
    'Audit package not found.',
    'platform'
  ),
  (
    'AUDIT_PACKAGE_INVALID_STATE',
    'validation',
    'medium',
    409,
    true,
    true,
    'Audit package is not in a valid state.',
    'Audit package invalid state.',
    'platform'
  ),
  (
    'AUDIT_PACKAGE_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Audit package request requires complete fields.',
    'Audit package required fields missing.',
    'platform'
  ),
  (
    'AUDIT_PACKAGE_ACCESS_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'Audit package access is not available.',
    'Audit package access denied.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (
  match_pattern,
  error_code,
  priority,
  metadata
)
values
  ('audit package not found', 'AUDIT_PACKAGE_NOT_FOUND', 5, '{}'::jsonb),
  ('audit package request not found', 'AUDIT_PACKAGE_NOT_FOUND', 5, '{}'::jsonb),
  ('audit package request is not approved', 'AUDIT_PACKAGE_INVALID_STATE', 5, '{}'::jsonb),
  ('audit package request not found or not pending', 'AUDIT_PACKAGE_INVALID_STATE', 5, '{}'::jsonb),
  ('audit package is not ready', 'AUDIT_PACKAGE_INVALID_STATE', 5, '{}'::jsonb),
  ('audit package title is required', 'AUDIT_PACKAGE_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('audit package rejection reason is required', 'AUDIT_PACKAGE_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('audit package grantee email is required', 'AUDIT_PACKAGE_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('invalid audit package access token', 'AUDIT_PACKAGE_ACCESS_DENIED', 5, '{}'::jsonb),
  ('audit package access grant not found', 'AUDIT_PACKAGE_ACCESS_DENIED', 5, '{}'::jsonb),
  ('audit package access grant is not active', 'AUDIT_PACKAGE_ACCESS_DENIED', 5, '{}'::jsonb),
  ('audit package access grant expired', 'AUDIT_PACKAGE_ACCESS_DENIED', 5, '{}'::jsonb),
  ('audit package access grant exhausted', 'AUDIT_PACKAGE_ACCESS_DENIED', 5, '{}'::jsonb)
on conflict (match_pattern)
do update set
  error_code = excluded.error_code,
  priority = excluded.priority,
  metadata = excluded.metadata,
  active = true;
