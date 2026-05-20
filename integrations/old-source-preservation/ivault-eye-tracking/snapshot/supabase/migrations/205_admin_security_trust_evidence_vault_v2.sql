-- Trust Evidence Vault v2
-- Legal-grade evidence custody layer with immutable registry, manifesting,
-- retention, legal hold lifecycle, export custody, and integrity checks.

-- ---------------------------------------------------------------------------
-- 1) Core tables
-- ---------------------------------------------------------------------------

create table if not exists admin_security_evidence_storage_locations (
  id uuid primary key default gen_random_uuid(),
  storage_location_key text not null unique,
  status text not null default 'active',
  location_name text not null,
  location_description text,
  storage_provider text not null,
  storage_region text,
  storage_tier text not null default 'hot',
  bucket_name text,
  base_path text,
  encryption_mode text not null default 'platform_kms',
  kms_key_reference text,
  customer_managed_key boolean not null default false,
  immutability_enabled boolean not null default false,
  object_lock_enabled boolean not null default false,
  versioning_enabled boolean not null default true,
  default_retention_days integer not null default 365,
  provider_config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,
  request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_storage_locations_status_check
    check (status in ('active', 'paused', 'disabled', 'failed', 'archived')),
  constraint admin_security_evidence_storage_locations_provider_check
    check (storage_provider in ('s3', 'gcs', 'azure_blob', 'supabase_storage', 'internal_vault', 'cold_archive', 'external', 'custom')),
  constraint admin_security_evidence_storage_locations_tier_check
    check (storage_tier in ('hot', 'warm', 'cold', 'archive', 'legal_hold')),
  constraint admin_security_evidence_storage_locations_encryption_check
    check (encryption_mode in ('none', 'platform_kms', 'customer_kms', 'envelope', 'external'))
);

create table if not exists admin_security_evidence_retention_policies (
  id uuid primary key default gen_random_uuid(),
  retention_policy_key text not null unique,
  status text not null default 'active',
  policy_name text not null,
  policy_description text,
  evidence_category text not null,
  customer_name text,
  customer_domain text,
  retention_days integer not null,
  delete_after_retention boolean not null default false,
  require_manual_approval_for_deletion boolean not null default true,
  legal_hold_overrides_retention boolean not null default true,
  minimum_severity_floor text,
  applies_to_payload boolean not null default true,
  applies_to_metadata boolean not null default true,
  applies_to_exports boolean not null default true,
  policy_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,
  request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_retention_policies_status_check
    check (status in ('active', 'paused', 'disabled', 'archived')),
  constraint admin_security_evidence_retention_policies_category_check
    check (evidence_category in ('proof', 'verification', 'incident', 'audit_package', 'transparency', 'billing', 'integration', 'ai_finding', 'command_center', 'alert', 'governance', 'system', 'legal', 'custom')),
  constraint admin_security_evidence_retention_policies_days_check
    check (retention_days > 0)
);

create table if not exists admin_security_evidence_vault_objects (
  id uuid primary key default gen_random_uuid(),
  evidence_object_key text not null unique,
  status text not null default 'active',
  evidence_category text not null,
  evidence_type text not null,
  customer_name text,
  customer_domain text,
  title text not null,
  description text,
  source_module text not null,
  source_table text,
  source_id uuid,
  source_key text,
  private_room_id uuid references admin_security_private_trust_rooms(id) on delete set null,
  related_incident_id uuid references admin_security_trust_incidents(id) on delete set null,
  related_audit_package_id uuid references admin_security_audit_packages(id) on delete set null,
  related_ai_finding_id uuid references admin_security_trust_ai_findings(id) on delete set null,
  related_alert_event_id uuid references admin_security_trust_alert_events(id) on delete set null,
  related_command_queue_item_id uuid references admin_security_trust_command_center_queue(id) on delete set null,
  related_webhook_delivery_id uuid references admin_security_trust_webhook_deliveries(id) on delete set null,
  storage_location_id uuid references admin_security_evidence_storage_locations(id) on delete set null,
  storage_uri text,
  object_path text,
  object_version text,
  media_type text,
  file_name text,
  file_extension text,
  byte_size bigint,
  content_hash_sha256 text,
  content_hash_sha512 text,
  manifest_hash_sha256 text,
  encryption_mode text not null default 'platform_kms',
  kms_key_reference text,
  encryption_context jsonb not null default '{}'::jsonb,
  retention_policy_id uuid references admin_security_evidence_retention_policies(id) on delete set null,
  retain_until timestamptz,
  deletion_eligible_at timestamptz,
  legal_hold_active boolean not null default false,
  immutable boolean not null default true,
  sealed boolean not null default false,
  custody_state text not null default 'registered',
  access_classification text not null default 'restricted',
  confidentiality_level text not null default 'internal',
  evidence_payload jsonb not null default '{}'::jsonb,
  evidence_metadata jsonb not null default '{}'::jsonb,
  registered_by_auth_user_id uuid,
  registered_by_admin_user_id uuid references admin_users(id) on delete set null,
  sealed_at timestamptz,
  deleted_at timestamptz,
  deletion_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_vault_objects_status_check
    check (status in ('active', 'sealed', 'under_review', 'legal_hold', 'exported', 'deletion_requested', 'deleted', 'archived')),
  constraint admin_security_evidence_vault_objects_custody_state_check
    check (custody_state in ('registered', 'stored', 'sealed', 'accessed', 'exported', 'transferred', 'held', 'released', 'deletion_requested', 'deleted')),
  constraint admin_security_evidence_vault_objects_source_module_check
    check (source_module in ('proofs', 'verification', 'incidents', 'audit_packages', 'transparency', 'billing', 'integrations', 'ai_analyst', 'command_center', 'alerts', 'governance', 'system', 'manual')),
  constraint admin_security_evidence_vault_objects_access_classification_check
    check (access_classification in ('public', 'internal', 'restricted', 'confidential', 'legal_privileged')),
  constraint admin_security_evidence_vault_objects_confidentiality_check
    check (confidentiality_level in ('public', 'internal', 'confidential', 'highly_confidential', 'regulated')),
  constraint admin_security_evidence_vault_objects_encryption_check
    check (encryption_mode in ('none', 'platform_kms', 'customer_kms', 'envelope', 'external')),
  constraint admin_security_evidence_vault_objects_title_check
    check (length(trim(title)) > 0)
);

create table if not exists admin_security_evidence_manifest_items (
  id uuid primary key default gen_random_uuid(),
  manifest_item_key text not null unique,
  evidence_object_id uuid not null references admin_security_evidence_vault_objects(id) on delete cascade,
  item_status text not null default 'active',
  item_type text not null,
  item_name text not null,
  item_description text,
  source_table text,
  source_id uuid,
  source_key text,
  storage_uri text,
  object_path text,
  media_type text,
  byte_size bigint,
  content_hash_sha256 text,
  content_hash_sha512 text,
  item_payload jsonb not null default '{}'::jsonb,
  item_metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint admin_security_evidence_manifest_items_type_check
    check (item_type in ('database_row', 'json_payload', 'file_object', 'hash', 'signature', 'screenshot', 'pdf', 'csv', 'log', 'api_response', 'notice', 'export', 'custom')),
  constraint admin_security_evidence_manifest_items_status_check
    check (item_status in ('active', 'redacted', 'excluded', 'deleted', 'archived')),
  constraint admin_security_evidence_manifest_items_name_check
    check (length(trim(item_name)) > 0)
);

create table if not exists admin_security_evidence_legal_holds (
  id uuid primary key default gen_random_uuid(),
  legal_hold_key text not null unique,
  status text not null default 'active',
  hold_name text not null,
  hold_description text,
  hold_reason text not null,
  hold_scope text not null default 'object',
  evidence_object_id uuid references admin_security_evidence_vault_objects(id) on delete cascade,
  customer_name text,
  customer_domain text,
  source_module text,
  source_table text,
  source_id uuid,
  source_key text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_by_auth_user_id uuid,
  created_by_admin_user_id uuid references admin_users(id) on delete set null,
  released_by_auth_user_id uuid,
  released_by_admin_user_id uuid references admin_users(id) on delete set null,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_legal_holds_status_check
    check (status in ('active', 'released', 'expired', 'archived')),
  constraint admin_security_evidence_legal_holds_scope_check
    check (hold_scope in ('object', 'customer', 'source', 'category', 'global'))
);

create table if not exists admin_security_evidence_custody_events (
  id uuid primary key default gen_random_uuid(),
  custody_event_key text not null unique,
  evidence_object_id uuid not null references admin_security_evidence_vault_objects(id) on delete cascade,
  event_type text not null,
  event_action text not null,
  custody_state_before text,
  custody_state_after text,
  actor_type text not null default 'system',
  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id) on delete set null,
  actor_email text,
  customer_name text,
  customer_domain text,
  title text not null,
  summary text,
  source_ip inet,
  user_agent text,
  access_reason text,
  legal_basis text,
  previous_event_hash_sha256 text,
  event_hash_sha256 text,
  event_payload jsonb not null default '{}'::jsonb,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint admin_security_evidence_custody_events_type_check
    check (event_type in ('registered', 'stored', 'manifest_added', 'sealed', 'accessed', 'verified', 'exported', 'transferred', 'legal_hold_applied', 'legal_hold_released', 'deletion_requested', 'deleted', 'retention_extended', 'integrity_check', 'other')),
  constraint admin_security_evidence_custody_events_actor_check
    check (actor_type in ('system', 'worker', 'admin', 'auditor', 'customer_admin', 'external', 'legal'))
);

create table if not exists admin_security_evidence_access_grants (
  id uuid primary key default gen_random_uuid(),
  access_grant_key text not null unique,
  status text not null default 'active',
  evidence_object_id uuid not null references admin_security_evidence_vault_objects(id) on delete cascade,
  grant_type text not null default 'read',
  grantee_type text not null,
  grantee_auth_user_id uuid,
  grantee_admin_user_id uuid references admin_users(id) on delete set null,
  grantee_email text,
  grantee_name text,
  access_reason text not null,
  legal_basis text,
  can_view_metadata boolean not null default true,
  can_view_payload boolean not null default false,
  can_export boolean not null default false,
  can_share boolean not null default false,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  granted_by_auth_user_id uuid,
  granted_by_admin_user_id uuid references admin_users(id) on delete set null,
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id) on delete set null,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_access_grants_status_check
    check (status in ('active', 'revoked', 'expired', 'archived')),
  constraint admin_security_evidence_access_grants_grant_type_check
    check (grant_type in ('read', 'export', 'audit', 'legal_review', 'custody_transfer', 'admin')),
  constraint admin_security_evidence_access_grants_access_reason_check
    check (length(trim(access_reason)) > 0)
);

create table if not exists admin_security_evidence_export_packages (
  id uuid primary key default gen_random_uuid(),
  evidence_export_package_key text not null unique,
  status text not null default 'pending',
  export_name text not null,
  export_description text,
  export_type text not null,
  export_format text not null default 'jsonl',
  customer_name text,
  customer_domain text,
  requested_by_auth_user_id uuid,
  requested_by_admin_user_id uuid references admin_users(id) on delete set null,
  requested_reason text not null,
  legal_basis text,
  storage_location_id uuid references admin_security_evidence_storage_locations(id) on delete set null,
  storage_uri text,
  object_count integer not null default 0,
  manifest_item_count integer not null default 0,
  byte_size bigint,
  package_hash_sha256 text,
  manifest_hash_sha256 text,
  redaction_applied boolean not null default true,
  include_payloads boolean not null default false,
  include_custody_chain boolean not null default true,
  include_access_grants boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  expires_at timestamptz,
  last_error text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_export_packages_status_check
    check (status in ('pending', 'processing', 'completed', 'failed', 'expired', 'cancelled', 'archived')),
  constraint admin_security_evidence_export_packages_type_check
    check (export_type in ('single_object', 'customer_bundle', 'incident_bundle', 'audit_bundle', 'legal_hold_bundle', 'time_window', 'custom')),
  constraint admin_security_evidence_export_packages_format_check
    check (export_format in ('json', 'jsonl', 'zip', 'tar', 'pdf', 'csv', 'parquet'))
);

create table if not exists admin_security_evidence_export_package_objects (
  id uuid primary key default gen_random_uuid(),
  export_package_object_key text not null unique,
  export_package_id uuid not null references admin_security_evidence_export_packages(id) on delete cascade,
  evidence_object_id uuid not null references admin_security_evidence_vault_objects(id) on delete cascade,
  included boolean not null default true,
  redacted boolean not null default true,
  inclusion_reason text,
  exclusion_reason text,
  export_manifest_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (export_package_id, evidence_object_id)
);

create table if not exists admin_security_evidence_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  deletion_request_key text not null unique,
  status text not null default 'pending_approval',
  evidence_object_id uuid not null references admin_security_evidence_vault_objects(id) on delete cascade,
  request_type text not null default 'retention_expired',
  requested_reason text not null,
  legal_hold_blocked boolean not null default false,
  retention_blocked boolean not null default false,
  requested_by_auth_user_id uuid,
  requested_by_admin_user_id uuid references admin_users(id) on delete set null,
  approved_at timestamptz,
  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id) on delete set null,
  denied_at timestamptz,
  denied_by_auth_user_id uuid,
  denied_by_admin_user_id uuid references admin_users(id) on delete set null,
  denial_reason text,
  executed_at timestamptz,
  executed_by_auth_user_id uuid,
  executed_by_admin_user_id uuid references admin_users(id) on delete set null,
  execution_result jsonb not null default '{}'::jsonb,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_evidence_deletion_requests_status_check
    check (status in ('pending_approval', 'approved', 'denied', 'blocked', 'executed', 'failed', 'cancelled', 'archived')),
  constraint admin_security_evidence_deletion_requests_type_check
    check (request_type in ('retention_expired', 'manual', 'privacy_request', 'legal_request', 'custom')),
  constraint admin_security_evidence_deletion_requests_reason_check
    check (length(trim(requested_reason)) > 0)
);

create index if not exists admin_security_evidence_vault_objects_status_category_created_idx
  on admin_security_evidence_vault_objects (status, evidence_category, created_at desc);
create index if not exists admin_security_evidence_vault_objects_customer_idx
  on admin_security_evidence_vault_objects (customer_name, customer_domain, status, created_at desc);
create index if not exists admin_security_evidence_vault_objects_source_idx
  on admin_security_evidence_vault_objects (source_module, source_table, source_id);
create index if not exists admin_security_evidence_vault_objects_deletion_idx
  on admin_security_evidence_vault_objects (status, legal_hold_active, deletion_eligible_at);
create index if not exists admin_security_evidence_vault_objects_content_hash_idx
  on admin_security_evidence_vault_objects (content_hash_sha256);
create index if not exists admin_security_evidence_manifest_items_object_idx
  on admin_security_evidence_manifest_items (evidence_object_id, sort_order, created_at);
create index if not exists admin_security_evidence_custody_events_object_idx
  on admin_security_evidence_custody_events (evidence_object_id, occurred_at desc);
create index if not exists admin_security_evidence_export_packages_status_idx
  on admin_security_evidence_export_packages (status, created_at desc);

drop trigger if exists admin_security_evidence_storage_locations_set_updated_at on admin_security_evidence_storage_locations;
create trigger admin_security_evidence_storage_locations_set_updated_at
before update on admin_security_evidence_storage_locations
for each row execute function set_updated_at();
drop trigger if exists admin_security_evidence_retention_policies_set_updated_at on admin_security_evidence_retention_policies;
create trigger admin_security_evidence_retention_policies_set_updated_at
before update on admin_security_evidence_retention_policies
for each row execute function set_updated_at();
drop trigger if exists admin_security_evidence_vault_objects_set_updated_at on admin_security_evidence_vault_objects;
create trigger admin_security_evidence_vault_objects_set_updated_at
before update on admin_security_evidence_vault_objects
for each row execute function set_updated_at();
drop trigger if exists admin_security_evidence_legal_holds_set_updated_at on admin_security_evidence_legal_holds;
create trigger admin_security_evidence_legal_holds_set_updated_at
before update on admin_security_evidence_legal_holds
for each row execute function set_updated_at();
drop trigger if exists admin_security_evidence_access_grants_set_updated_at on admin_security_evidence_access_grants;
create trigger admin_security_evidence_access_grants_set_updated_at
before update on admin_security_evidence_access_grants
for each row execute function set_updated_at();
drop trigger if exists admin_security_evidence_export_packages_set_updated_at on admin_security_evidence_export_packages;
create trigger admin_security_evidence_export_packages_set_updated_at
before update on admin_security_evidence_export_packages
for each row execute function set_updated_at();
drop trigger if exists admin_security_evidence_deletion_requests_set_updated_at on admin_security_evidence_deletion_requests;
create trigger admin_security_evidence_deletion_requests_set_updated_at
before update on admin_security_evidence_deletion_requests
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Seeds
-- ---------------------------------------------------------------------------

insert into admin_security_evidence_storage_locations (
  storage_location_key,
  status,
  location_name,
  location_description,
  storage_provider,
  storage_region,
  storage_tier,
  base_path,
  encryption_mode,
  immutability_enabled,
  object_lock_enabled,
  versioning_enabled,
  default_retention_days
)
values (
  'evidence_storage:default_internal_vault',
  'active',
  'Default Internal Evidence Vault',
  'Default legal-grade evidence storage location',
  'internal_vault',
  'primary',
  'hot',
  '/evidence-vault',
  'platform_kms',
  true,
  true,
  true,
  365
)
on conflict (storage_location_key) do update
set
  status = excluded.status,
  storage_provider = excluded.storage_provider,
  storage_region = excluded.storage_region,
  storage_tier = excluded.storage_tier,
  base_path = excluded.base_path,
  encryption_mode = excluded.encryption_mode,
  immutability_enabled = excluded.immutability_enabled,
  object_lock_enabled = excluded.object_lock_enabled,
  versioning_enabled = excluded.versioning_enabled,
  default_retention_days = excluded.default_retention_days,
  updated_at = now();

insert into admin_security_evidence_retention_policies (
  retention_policy_key,
  status,
  policy_name,
  policy_description,
  evidence_category,
  retention_days,
  delete_after_retention
)
values
  ('proof_default_7y', 'active', 'Proof default 7 years', 'Default policy for proof evidence.', 'proof', 2555, false),
  ('incident_default_7y', 'active', 'Incident default 7 years', 'Default policy for incident evidence.', 'incident', 2555, false),
  ('audit_package_default_7y', 'active', 'Audit package default 7 years', 'Default policy for audit packages.', 'audit_package', 2555, false),
  ('alert_default_2y', 'active', 'Alert default 2 years', 'Default policy for alert evidence.', 'alert', 730, false),
  ('integration_default_2y', 'active', 'Integration default 2 years', 'Default policy for integration evidence.', 'integration', 730, false)
on conflict (retention_policy_key) do update
set
  status = excluded.status,
  policy_name = excluded.policy_name,
  policy_description = excluded.policy_description,
  evidence_category = excluded.evidence_category,
  retention_days = excluded.retention_days,
  delete_after_retention = excluded.delete_after_retention,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3) Helper hash functions
-- ---------------------------------------------------------------------------

create or replace function admin_security_evidence_build_manifest_hash(
  p_evidence_object_id uuid
)
returns text
language plpgsql
stable
as $$
declare
  v_payload text;
begin
  select coalesce(
    string_agg(
      coalesce(m.manifest_item_key, '') || '|' ||
      coalesce(m.item_type, '') || '|' ||
      coalesce(m.item_name, '') || '|' ||
      coalesce(m.content_hash_sha256, '') || '|' ||
      coalesce(m.content_hash_sha512, '') || '|' ||
      coalesce(m.byte_size::text, ''),
      ';' order by m.sort_order asc, m.created_at asc
    ),
    ''
  )
  into v_payload
  from admin_security_evidence_manifest_items m
  where m.evidence_object_id = p_evidence_object_id
    and m.item_status in ('active', 'redacted', 'excluded', 'archived');

  return encode(digest(v_payload, 'sha256'), 'hex');
end;
$$;

create or replace function admin_security_evidence_make_custody_hash(
  p_previous_event_hash_sha256 text,
  p_object_key text,
  p_event_type text,
  p_event_action text,
  p_actor text,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      coalesce($1, '') || '|' ||
      coalesce($2, '') || '|' ||
      coalesce($3, '') || '|' ||
      coalesce($4, '') || '|' ||
      coalesce($5, '') || '|' ||
      coalesce($6::text, '{}') || '|' ||
      coalesce($7::text, ''),
      'sha256'
    ),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) Core RPC functions
-- ---------------------------------------------------------------------------

create or replace function record_admin_security_evidence_custody_event(
  p_evidence_object_id uuid,
  p_event_type text,
  p_event_action text,
  p_custody_state_before text default null,
  p_custody_state_after text default null,
  p_actor_type text default 'system',
  p_actor_auth_user_id uuid default null,
  p_actor_admin_user_id uuid default null,
  p_actor_email text default null,
  p_title text default null,
  p_summary text default null,
  p_access_reason text default null,
  p_legal_basis text default null,
  p_event_payload jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_object admin_security_evidence_vault_objects%rowtype;
  v_prev_hash text;
  v_event_hash text;
  v_event_key text;
  v_occurred_at timestamptz := now();
  v_id uuid;
begin
  select *
  into v_object
  from admin_security_evidence_vault_objects
  where id = p_evidence_object_id;

  if v_object.id is null then
    raise exception 'evidence object not found';
  end if;

  select e.event_hash_sha256
  into v_prev_hash
  from admin_security_evidence_custody_events e
  where e.evidence_object_id = p_evidence_object_id
  order by e.occurred_at desc, e.created_at desc
  limit 1;

  v_event_hash := admin_security_evidence_make_custody_hash(
    v_prev_hash,
    v_object.evidence_object_key,
    p_event_type,
    p_event_action,
    coalesce(p_actor_email, p_actor_type),
    coalesce(p_event_payload, '{}'::jsonb),
    v_occurred_at
  );

  v_event_key := 'custody_event:' || v_object.evidence_object_key || ':' || substr(v_event_hash, 1, 16);

  insert into admin_security_evidence_custody_events (
    custody_event_key,
    evidence_object_id,
    event_type,
    event_action,
    custody_state_before,
    custody_state_after,
    actor_type,
    actor_auth_user_id,
    actor_admin_user_id,
    actor_email,
    customer_name,
    customer_domain,
    title,
    summary,
    access_reason,
    legal_basis,
    previous_event_hash_sha256,
    event_hash_sha256,
    event_payload,
    request_id,
    metadata,
    occurred_at
  )
  values (
    v_event_key,
    p_evidence_object_id,
    p_event_type,
    p_event_action,
    p_custody_state_before,
    p_custody_state_after,
    p_actor_type,
    p_actor_auth_user_id,
    p_actor_admin_user_id,
    p_actor_email,
    v_object.customer_name,
    v_object.customer_domain,
    coalesce(p_title, initcap(replace(p_event_type, '_', ' '))),
    p_summary,
    p_access_reason,
    p_legal_basis,
    v_prev_hash,
    v_event_hash,
    coalesce(p_event_payload, '{}'::jsonb),
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb),
    v_occurred_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function register_admin_security_evidence_object(
  p_admin_auth_user_id uuid,
  p_evidence_category text,
  p_evidence_type text,
  p_title text,
  p_description text default null,
  p_source_module text default 'manual',
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_content_hash_sha256 text default null,
  p_content_hash_sha512 text default null,
  p_storage_location_id uuid default null,
  p_storage_uri text default null,
  p_object_path text default null,
  p_object_version text default null,
  p_media_type text default null,
  p_file_name text default null,
  p_file_extension text default null,
  p_byte_size bigint default null,
  p_access_classification text default 'restricted',
  p_confidentiality_level text default 'internal',
  p_evidence_payload jsonb default '{}'::jsonb,
  p_evidence_metadata jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storage admin_security_evidence_storage_locations%rowtype;
  v_policy admin_security_evidence_retention_policies%rowtype;
  v_admin admin_users%rowtype;
  v_manifest_hash text;
  v_object_id uuid;
  v_object_key text;
  v_seed text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'evidence title is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_storage_location_id is null then
    select *
    into v_storage
    from admin_security_evidence_storage_locations
    where status = 'active'
    order by
      case when storage_location_key = 'evidence_storage:default_internal_vault' then 0 else 1 end,
      created_at asc
    limit 1;
  else
    select *
    into v_storage
    from admin_security_evidence_storage_locations
    where id = p_storage_location_id;
  end if;

  if v_storage.id is null then
    raise exception 'evidence storage location not found';
  end if;

  select *
  into v_policy
  from admin_security_evidence_retention_policies
  where status = 'active'
    and evidence_category = p_evidence_category
    and (
      (customer_name is null and customer_domain is null)
      or (customer_name = p_customer_name and customer_domain is not distinct from p_customer_domain)
    )
  order by
    case when customer_name = p_customer_name then 0 else 1 end,
    created_at desc
  limit 1;

  if v_policy.id is null then
    select *
    into v_policy
    from admin_security_evidence_retention_policies
    where status = 'active'
      and evidence_category = p_evidence_category
    order by created_at desc
    limit 1;
  end if;

  v_seed :=
    coalesce(p_source_table, '') || '|' ||
    coalesce(p_source_id::text, '') || '|' ||
    coalesce(p_source_key, '') || '|' ||
    coalesce(p_content_hash_sha256, '') || '|' ||
    coalesce(p_title, '');

  v_object_key :=
    'evidence_object:' || p_evidence_category || ':' || p_source_module || ':' ||
    encode(digest(v_seed, 'sha256'), 'hex');

  v_manifest_hash := encode(digest('', 'sha256'), 'hex');

  insert into admin_security_evidence_vault_objects (
    evidence_object_key,
    status,
    evidence_category,
    evidence_type,
    customer_name,
    customer_domain,
    title,
    description,
    source_module,
    source_table,
    source_id,
    source_key,
    storage_location_id,
    storage_uri,
    object_path,
    object_version,
    media_type,
    file_name,
    file_extension,
    byte_size,
    content_hash_sha256,
    content_hash_sha512,
    manifest_hash_sha256,
    encryption_mode,
    kms_key_reference,
    retention_policy_id,
    retain_until,
    deletion_eligible_at,
    access_classification,
    confidentiality_level,
    evidence_payload,
    evidence_metadata,
    registered_by_auth_user_id,
    registered_by_admin_user_id,
    custody_state,
    request_id,
    metadata
  )
  values (
    v_object_key,
    'active',
    p_evidence_category,
    p_evidence_type,
    p_customer_name,
    p_customer_domain,
    p_title,
    p_description,
    p_source_module,
    p_source_table,
    p_source_id,
    p_source_key,
    v_storage.id,
    p_storage_uri,
    p_object_path,
    p_object_version,
    p_media_type,
    p_file_name,
    p_file_extension,
    p_byte_size,
    p_content_hash_sha256,
    p_content_hash_sha512,
    v_manifest_hash,
    v_storage.encryption_mode,
    v_storage.kms_key_reference,
    v_policy.id,
    case when v_policy.id is not null then now() + make_interval(days => v_policy.retention_days) else now() + interval '365 days' end,
    case
      when v_policy.id is not null and v_policy.delete_after_retention is true then now() + make_interval(days => v_policy.retention_days)
      else null
    end,
    p_access_classification,
    p_confidentiality_level,
    coalesce(p_evidence_payload, '{}'::jsonb),
    coalesce(p_evidence_metadata, '{}'::jsonb),
    p_admin_auth_user_id,
    v_admin.id,
    'registered',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (evidence_object_key) do update
  set
    updated_at = now(),
    evidence_metadata = admin_security_evidence_vault_objects.evidence_metadata || excluded.evidence_metadata,
    metadata = admin_security_evidence_vault_objects.metadata || excluded.metadata
  returning id into v_object_id;

  perform record_admin_security_evidence_custody_event(
    v_object_id,
    'registered',
    'register_evidence_object',
    null,
    'registered',
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence object registered',
    'Evidence object registered in vault.',
    null,
    null,
    jsonb_build_object(
      'evidenceObjectKey', v_object_key,
      'evidenceCategory', p_evidence_category,
      'sourceModule', p_source_module
    ),
    p_request_id,
    p_metadata
  );

  return v_object_id;
end;
$$;

create or replace function add_admin_security_evidence_manifest_item(
  p_admin_auth_user_id uuid,
  p_evidence_object_id uuid,
  p_item_type text,
  p_item_name text,
  p_item_description text default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_storage_uri text default null,
  p_object_path text default null,
  p_media_type text default null,
  p_byte_size bigint default null,
  p_content_hash_sha256 text default null,
  p_content_hash_sha512 text default null,
  p_item_payload jsonb default '{}'::jsonb,
  p_item_metadata jsonb default '{}'::jsonb,
  p_sort_order integer default 0,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_object admin_security_evidence_vault_objects%rowtype;
  v_admin admin_users%rowtype;
  v_item_id uuid;
  v_item_key text;
  v_manifest_hash text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_item_name is null or length(trim(p_item_name)) = 0 then
    raise exception 'evidence manifest item name is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_object
  from admin_security_evidence_vault_objects
  where id = p_evidence_object_id
  for update;

  if v_object.id is null then
    raise exception 'evidence object not found';
  end if;

  if v_object.sealed is true or v_object.status = 'sealed' then
    raise exception 'sealed evidence object cannot be modified';
  end if;

  v_item_key :=
    'manifest_item:' || v_object.evidence_object_key || ':' ||
    substr(encode(digest(coalesce(p_item_name, '') || '|' || coalesce(p_content_hash_sha256, '') || '|' || now()::text, 'sha256'), 'hex'), 1, 20);

  insert into admin_security_evidence_manifest_items (
    manifest_item_key,
    evidence_object_id,
    item_status,
    item_type,
    item_name,
    item_description,
    source_table,
    source_id,
    source_key,
    storage_uri,
    object_path,
    media_type,
    byte_size,
    content_hash_sha256,
    content_hash_sha512,
    item_payload,
    item_metadata,
    sort_order
  )
  values (
    v_item_key,
    p_evidence_object_id,
    'active',
    p_item_type,
    p_item_name,
    p_item_description,
    p_source_table,
    p_source_id,
    p_source_key,
    p_storage_uri,
    p_object_path,
    p_media_type,
    p_byte_size,
    p_content_hash_sha256,
    p_content_hash_sha512,
    coalesce(p_item_payload, '{}'::jsonb),
    coalesce(p_item_metadata, '{}'::jsonb),
    coalesce(p_sort_order, 0)
  )
  returning id into v_item_id;

  v_manifest_hash := admin_security_evidence_build_manifest_hash(p_evidence_object_id);
  update admin_security_evidence_vault_objects
  set manifest_hash_sha256 = v_manifest_hash
  where id = p_evidence_object_id;

  perform record_admin_security_evidence_custody_event(
    p_evidence_object_id,
    'manifest_added',
    'add_manifest_item',
    v_object.custody_state,
    v_object.custody_state,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence manifest item added',
    'Manifest item added and manifest hash recalculated.',
    null,
    null,
    jsonb_build_object('manifestItemId', v_item_id, 'manifestHashSha256', v_manifest_hash),
    p_request_id,
    p_metadata
  );

  return v_item_id;
end;
$$;

create or replace function seal_admin_security_evidence_object(
  p_admin_auth_user_id uuid,
  p_evidence_object_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_object admin_security_evidence_vault_objects%rowtype;
  v_admin admin_users%rowtype;
  v_manifest_hash text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_object
  from admin_security_evidence_vault_objects
  where id = p_evidence_object_id
  for update;

  if v_object.id is null then
    raise exception 'evidence object not found';
  end if;

  v_manifest_hash := admin_security_evidence_build_manifest_hash(p_evidence_object_id);

  update admin_security_evidence_vault_objects
  set
    sealed = true,
    immutable = true,
    status = case when legal_hold_active then 'legal_hold' else 'sealed' end,
    custody_state = 'sealed',
    sealed_at = now(),
    manifest_hash_sha256 = v_manifest_hash,
    updated_at = now()
  where id = p_evidence_object_id;

  perform record_admin_security_evidence_custody_event(
    p_evidence_object_id,
    'sealed',
    'seal_evidence_object',
    v_object.custody_state,
    'sealed',
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence object sealed',
    'Evidence object was sealed and frozen for modifications.',
    null,
    null,
    jsonb_build_object('manifestHashSha256', v_manifest_hash),
    p_request_id,
    p_metadata
  );

  return p_evidence_object_id;
end;
$$;

create or replace function apply_admin_security_evidence_legal_hold(
  p_admin_auth_user_id uuid,
  p_hold_name text,
  p_hold_reason text,
  p_hold_scope text default 'object',
  p_evidence_object_id uuid default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_source_module text default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_source_key text default null,
  p_effective_at timestamptz default now(),
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
  v_hold_id uuid;
  v_hold_key text;
  v_object admin_security_evidence_vault_objects%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  if p_hold_name is null or length(trim(p_hold_name)) = 0 then
    raise exception 'evidence legal hold name is required';
  end if;
  if p_hold_reason is null or length(trim(p_hold_reason)) = 0 then
    raise exception 'evidence legal hold reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);
  v_hold_key := 'evidence_legal_hold:' || substr(encode(digest(coalesce(p_hold_name, '') || '|' || now()::text, 'sha256'), 'hex'), 1, 24);

  insert into admin_security_evidence_legal_holds (
    legal_hold_key,
    status,
    hold_name,
    hold_reason,
    hold_scope,
    evidence_object_id,
    customer_name,
    customer_domain,
    source_module,
    source_table,
    source_id,
    source_key,
    effective_at,
    expires_at,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_hold_key,
    'active',
    p_hold_name,
    p_hold_reason,
    p_hold_scope,
    p_evidence_object_id,
    p_customer_name,
    p_customer_domain,
    p_source_module,
    p_source_table,
    p_source_id,
    p_source_key,
    coalesce(p_effective_at, now()),
    p_expires_at,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_hold_id;

  if p_hold_scope = 'object' and p_evidence_object_id is not null then
    select * into v_object from admin_security_evidence_vault_objects where id = p_evidence_object_id for update;
    if v_object.id is null then
      raise exception 'evidence object not found';
    end if;

    update admin_security_evidence_vault_objects
    set
      legal_hold_active = true,
      status = 'legal_hold',
      custody_state = 'held',
      updated_at = now()
    where id = p_evidence_object_id;

    perform record_admin_security_evidence_custody_event(
      p_evidence_object_id,
      'legal_hold_applied',
      'apply_legal_hold',
      v_object.custody_state,
      'held',
      'legal',
      p_admin_auth_user_id,
      v_admin.id,
      v_admin.email,
      'Legal hold applied',
      p_hold_reason,
      null,
      null,
      jsonb_build_object('legalHoldId', v_hold_id, 'legalHoldKey', v_hold_key),
      p_request_id,
      p_metadata
    );
  end if;

  return v_hold_id;
end;
$$;

create or replace function release_admin_security_evidence_legal_hold(
  p_admin_auth_user_id uuid,
  p_legal_hold_id uuid,
  p_release_reason text,
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
  v_hold admin_security_evidence_legal_holds%rowtype;
  v_remaining integer;
  v_object admin_security_evidence_vault_objects%rowtype;
  v_new_status text;
  v_new_custody text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  if p_release_reason is null or length(trim(p_release_reason)) = 0 then
    raise exception 'evidence legal hold release reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_hold
  from admin_security_evidence_legal_holds
  where id = p_legal_hold_id
    and status = 'active'
  for update;

  if v_hold.id is null then
    raise exception 'evidence legal hold not found or not active';
  end if;

  update admin_security_evidence_legal_holds
  set
    status = 'released',
    released_at = now(),
    release_reason = p_release_reason,
    released_by_auth_user_id = p_admin_auth_user_id,
    released_by_admin_user_id = v_admin.id,
    updated_at = now()
  where id = p_legal_hold_id;

  if v_hold.evidence_object_id is not null then
    select count(*)
    into v_remaining
    from admin_security_evidence_legal_holds
    where evidence_object_id = v_hold.evidence_object_id
      and status = 'active';

    if v_remaining = 0 then
      select *
      into v_object
      from admin_security_evidence_vault_objects
      where id = v_hold.evidence_object_id
      for update;

      v_new_status := case when v_object.sealed then 'sealed' else 'active' end;
      v_new_custody := case when v_object.sealed then 'sealed' else 'registered' end;

      update admin_security_evidence_vault_objects
      set
        legal_hold_active = false,
        status = v_new_status,
        custody_state = v_new_custody,
        updated_at = now()
      where id = v_hold.evidence_object_id;
    end if;

    perform record_admin_security_evidence_custody_event(
      v_hold.evidence_object_id,
      'legal_hold_released',
      'release_legal_hold',
      'held',
      case when v_remaining = 0 then (case when v_object.sealed then 'sealed' else 'registered' end) else 'held' end,
      'legal',
      p_admin_auth_user_id,
      v_admin.id,
      v_admin.email,
      'Legal hold released',
      p_release_reason,
      null,
      null,
      jsonb_build_object('legalHoldId', p_legal_hold_id, 'remainingActiveHolds', v_remaining),
      p_request_id,
      p_metadata
    );
  end if;

  return p_legal_hold_id;
end;
$$;

create or replace function create_admin_security_evidence_export_package(
  p_admin_auth_user_id uuid,
  p_export_name text,
  p_export_type text,
  p_requested_reason text,
  p_export_description text default null,
  p_export_format text default 'jsonl',
  p_customer_name text default null,
  p_customer_domain text default null,
  p_legal_basis text default null,
  p_storage_location_id uuid default null,
  p_include_payloads boolean default false,
  p_include_access_grants boolean default false,
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
  v_storage_id uuid;
  v_id uuid;
  v_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  if p_export_name is null or length(trim(p_export_name)) = 0 then
    raise exception 'evidence export name is required';
  end if;
  if p_requested_reason is null or length(trim(p_requested_reason)) = 0 then
    raise exception 'evidence export reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);
  v_key := 'evidence_export_package:' || substr(encode(digest(coalesce(p_export_name, '') || '|' || now()::text, 'sha256'), 'hex'), 1, 24);

  if p_storage_location_id is null then
    select id
    into v_storage_id
    from admin_security_evidence_storage_locations
    where status = 'active'
    order by case when storage_location_key = 'evidence_storage:default_internal_vault' then 0 else 1 end
    limit 1;
  else
    v_storage_id := p_storage_location_id;
  end if;

  insert into admin_security_evidence_export_packages (
    evidence_export_package_key,
    status,
    export_name,
    export_description,
    export_type,
    export_format,
    customer_name,
    customer_domain,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    requested_reason,
    legal_basis,
    storage_location_id,
    redaction_applied,
    include_payloads,
    include_custody_chain,
    include_access_grants,
    expires_at,
    request_id,
    metadata
  )
  values (
    v_key,
    'pending',
    p_export_name,
    p_export_description,
    p_export_type,
    coalesce(p_export_format, 'jsonl'),
    p_customer_name,
    p_customer_domain,
    p_admin_auth_user_id,
    v_admin.id,
    p_requested_reason,
    p_legal_basis,
    v_storage_id,
    true,
    coalesce(p_include_payloads, false),
    true,
    coalesce(p_include_access_grants, false),
    now() + interval '30 days',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function add_admin_security_evidence_object_to_export_package(
  p_admin_auth_user_id uuid,
  p_export_package_id uuid,
  p_evidence_object_id uuid,
  p_included boolean default true,
  p_redacted boolean default true,
  p_inclusion_reason text default null,
  p_exclusion_reason text default null,
  p_export_manifest_payload jsonb default '{}'::jsonb,
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
  v_pkg admin_security_evidence_export_packages%rowtype;
  v_obj admin_security_evidence_vault_objects%rowtype;
  v_id uuid;
  v_key text;
  v_manifest_item_count integer;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select * into v_pkg from admin_security_evidence_export_packages where id = p_export_package_id for update;
  if v_pkg.id is null then
    raise exception 'evidence export package not found';
  end if;
  if v_pkg.status not in ('pending', 'processing') then
    raise exception 'evidence export package is not editable';
  end if;

  select * into v_obj from admin_security_evidence_vault_objects where id = p_evidence_object_id;
  if v_obj.id is null then
    raise exception 'evidence object not found';
  end if;

  v_key := 'export_package_object:' || substr(encode(digest(p_export_package_id::text || '|' || p_evidence_object_id::text, 'sha256'), 'hex'), 1, 24);

  insert into admin_security_evidence_export_package_objects (
    export_package_object_key,
    export_package_id,
    evidence_object_id,
    included,
    redacted,
    inclusion_reason,
    exclusion_reason,
    export_manifest_payload
  )
  values (
    v_key,
    p_export_package_id,
    p_evidence_object_id,
    coalesce(p_included, true),
    coalesce(p_redacted, true),
    p_inclusion_reason,
    p_exclusion_reason,
    coalesce(p_export_manifest_payload, '{}'::jsonb)
  )
  on conflict (export_package_id, evidence_object_id) do update
  set
    included = excluded.included,
    redacted = excluded.redacted,
    inclusion_reason = excluded.inclusion_reason,
    exclusion_reason = excluded.exclusion_reason,
    export_manifest_payload = excluded.export_manifest_payload
  returning id into v_id;

  select count(*)
  into v_manifest_item_count
  from admin_security_evidence_manifest_items
  where evidence_object_id = p_evidence_object_id;

  update admin_security_evidence_export_packages
  set
    object_count = (
      select count(*)
      from admin_security_evidence_export_package_objects
      where export_package_id = p_export_package_id
        and included is true
    ),
    manifest_item_count = coalesce(manifest_item_count, 0) + coalesce(v_manifest_item_count, 0),
    updated_at = now()
  where id = p_export_package_id;

  perform record_admin_security_evidence_custody_event(
    p_evidence_object_id,
    'exported',
    'include_in_export_package',
    v_obj.custody_state,
    v_obj.custody_state,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence object added to export package',
    coalesce(p_inclusion_reason, 'Included in evidence export package.'),
    null,
    null,
    jsonb_build_object('exportPackageId', p_export_package_id, 'included', coalesce(p_included, true)),
    p_request_id,
    p_metadata
  );

  return v_id;
end;
$$;

create or replace function complete_admin_security_evidence_export_package(
  p_worker_id text,
  p_export_package_id uuid,
  p_storage_uri text,
  p_package_hash_sha256 text,
  p_manifest_hash_sha256 text,
  p_byte_size bigint,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg admin_security_evidence_export_packages%rowtype;
  v_obj record;
begin
  select *
  into v_pkg
  from admin_security_evidence_export_packages
  where id = p_export_package_id
  for update;

  if v_pkg.id is null then
    raise exception 'evidence export package not found';
  end if;

  update admin_security_evidence_export_packages
  set
    status = 'completed',
    started_at = coalesce(started_at, now()),
    completed_at = now(),
    storage_uri = p_storage_uri,
    package_hash_sha256 = p_package_hash_sha256,
    manifest_hash_sha256 = p_manifest_hash_sha256,
    byte_size = p_byte_size,
    updated_at = now()
  where id = p_export_package_id;

  for v_obj in
    select o.id, o.legal_hold_active, o.custody_state
    from admin_security_evidence_export_package_objects x
    join admin_security_evidence_vault_objects o on o.id = x.evidence_object_id
    where x.export_package_id = p_export_package_id
      and x.included is true
  loop
    if v_obj.legal_hold_active is false then
      update admin_security_evidence_vault_objects
      set
        status = case when sealed then 'sealed' else 'exported' end,
        custody_state = 'exported',
        updated_at = now()
      where id = v_obj.id;
    end if;

    perform record_admin_security_evidence_custody_event(
      v_obj.id,
      'exported',
      'complete_export_package',
      v_obj.custody_state,
      'exported',
      'worker',
      null,
      null,
      p_worker_id,
      'Evidence export completed',
      'Evidence object included in completed export package.',
      null,
      null,
      jsonb_build_object('exportPackageId', p_export_package_id, 'workerId', p_worker_id),
      p_request_id,
      p_metadata
    );
  end loop;

  return p_export_package_id;
end;
$$;

create or replace function request_admin_security_evidence_deletion(
  p_admin_auth_user_id uuid,
  p_evidence_object_id uuid,
  p_request_type text default 'retention_expired',
  p_requested_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obj admin_security_evidence_vault_objects%rowtype;
  v_admin admin_users%rowtype;
  v_id uuid;
  v_key text;
  v_hold_blocked boolean := false;
  v_retention_blocked boolean := false;
  v_status text := 'pending_approval';
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  if p_requested_reason is null or length(trim(p_requested_reason)) = 0 then
    raise exception 'evidence deletion reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);
  select * into v_obj from admin_security_evidence_vault_objects where id = p_evidence_object_id for update;
  if v_obj.id is null then
    raise exception 'evidence object not found';
  end if;

  if v_obj.legal_hold_active then
    v_hold_blocked := true;
    v_status := 'blocked';
  end if;
  if v_obj.retain_until is not null and v_obj.retain_until > now() then
    v_retention_blocked := true;
    v_status := 'blocked';
  end if;

  v_key := 'evidence_deletion_request:' || substr(encode(digest(p_evidence_object_id::text || '|' || now()::text, 'sha256'), 'hex'), 1, 24);
  insert into admin_security_evidence_deletion_requests (
    deletion_request_key,
    status,
    evidence_object_id,
    request_type,
    requested_reason,
    legal_hold_blocked,
    retention_blocked,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_key,
    v_status,
    p_evidence_object_id,
    p_request_type,
    p_requested_reason,
    v_hold_blocked,
    v_retention_blocked,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  if v_hold_blocked then
    raise exception 'evidence deletion blocked by legal hold';
  end if;

  if v_status = 'pending_approval' then
    update admin_security_evidence_vault_objects
    set
      status = 'deletion_requested',
      custody_state = 'deletion_requested',
      updated_at = now()
    where id = p_evidence_object_id;
  end if;

  perform record_admin_security_evidence_custody_event(
    p_evidence_object_id,
    'deletion_requested',
    'request_deletion',
    v_obj.custody_state,
    case when v_status = 'blocked' then v_obj.custody_state else 'deletion_requested' end,
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence deletion requested',
    p_requested_reason,
    null,
    null,
    jsonb_build_object('deletionRequestId', v_id, 'status', v_status),
    p_request_id,
    p_metadata
  );

  return v_id;
end;
$$;

create or replace function execute_admin_security_evidence_deletion(
  p_admin_auth_user_id uuid,
  p_deletion_request_id uuid,
  p_deletion_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req admin_security_evidence_deletion_requests%rowtype;
  v_obj admin_security_evidence_vault_objects%rowtype;
  v_admin admin_users%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;
  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_req
  from admin_security_evidence_deletion_requests
  where id = p_deletion_request_id
  for update;

  if v_req.id is null then
    raise exception 'evidence deletion request not found';
  end if;
  if v_req.status not in ('pending_approval', 'approved') then
    raise exception 'evidence deletion request is not executable';
  end if;

  select *
  into v_obj
  from admin_security_evidence_vault_objects
  where id = v_req.evidence_object_id
  for update;

  if v_obj.id is null then
    raise exception 'evidence object not found';
  end if;
  if v_obj.legal_hold_active then
    raise exception 'evidence deletion blocked by legal hold';
  end if;

  update admin_security_evidence_vault_objects
  set
    status = 'deleted',
    custody_state = 'deleted',
    deleted_at = now(),
    deletion_reason = coalesce(p_deletion_reason, v_req.requested_reason),
    evidence_payload = '{}'::jsonb,
    updated_at = now()
  where id = v_obj.id;

  update admin_security_evidence_deletion_requests
  set
    status = 'executed',
    approved_at = coalesce(approved_at, now()),
    approved_by_auth_user_id = coalesce(approved_by_auth_user_id, p_admin_auth_user_id),
    approved_by_admin_user_id = coalesce(approved_by_admin_user_id, v_admin.id),
    executed_at = now(),
    executed_by_auth_user_id = p_admin_auth_user_id,
    executed_by_admin_user_id = v_admin.id,
    execution_result = jsonb_build_object(
      'deleted', true,
      'deletedAt', now(),
      'payloadWiped', true
    ),
    updated_at = now()
  where id = v_req.id;

  perform record_admin_security_evidence_custody_event(
    v_obj.id,
    'deleted',
    'execute_deletion',
    v_obj.custody_state,
    'deleted',
    'admin',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence object deleted',
    coalesce(p_deletion_reason, v_req.requested_reason),
    null,
    null,
    jsonb_build_object('deletionRequestId', v_req.id),
    p_request_id,
    p_metadata
  );

  return v_req.id;
end;
$$;

create or replace function verify_admin_security_evidence_object_integrity(
  p_admin_auth_user_id uuid,
  p_evidence_object_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obj admin_security_evidence_vault_objects%rowtype;
  v_manifest_hash text;
  v_valid boolean;
  v_admin admin_users%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
    raise exception 'missing required permission: admin.read';
  end if;
  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select * into v_obj from admin_security_evidence_vault_objects where id = p_evidence_object_id;
  if v_obj.id is null then
    raise exception 'evidence object not found';
  end if;

  v_manifest_hash := admin_security_evidence_build_manifest_hash(p_evidence_object_id);
  v_valid := (v_obj.manifest_hash_sha256 is not distinct from v_manifest_hash);

  perform record_admin_security_evidence_custody_event(
    p_evidence_object_id,
    'integrity_check',
    'verify_integrity',
    v_obj.custody_state,
    v_obj.custody_state,
    'auditor',
    p_admin_auth_user_id,
    v_admin.id,
    v_admin.email,
    'Evidence integrity verified',
    case when v_valid then 'Manifest hash verification passed.' else 'Manifest hash mismatch detected.' end,
    null,
    null,
    jsonb_build_object(
      'valid', v_valid,
      'expectedManifestHashSha256', v_obj.manifest_hash_sha256,
      'computedManifestHashSha256', v_manifest_hash
    ),
    p_request_id,
    p_metadata
  );

  return jsonb_build_object(
    'evidenceObjectId', v_obj.id,
    'evidenceObjectKey', v_obj.evidence_object_key,
    'valid', v_valid,
    'expectedManifestHashSha256', v_obj.manifest_hash_sha256,
    'computedManifestHashSha256', v_manifest_hash
  );
end;
$$;

create or replace function sync_admin_security_evidence_from_trust_systems(
  p_batch_size integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_synced integer := 0;
  v_row record;
  v_obj_id uuid;
  v_sync_admin_auth_user_id uuid;
begin
  if p_batch_size < 1 then
    raise exception 'batch size must be >= 1';
  end if;

  select auth_user_id
  into v_sync_admin_auth_user_id
  from admin_users
  where status = 'active'
  order by created_at asc
  limit 1;

  for v_row in
    (
      select
        'incidents'::text as source_module,
        'admin_security_trust_incidents'::text as source_table,
        i.id as source_id,
        i.customer_name,
        i.customer_domain,
        i.title,
        i.summary,
        'incident'::text as evidence_category
      from admin_security_trust_incidents i
      where i.created_at >= now() - interval '30 days'
        and i.severity in ('high', 'critical')
      union all
      select
        'ai_analyst'::text,
        'admin_security_trust_ai_findings'::text,
        f.id,
        f.customer_name,
        f.customer_domain,
        f.title,
        f.summary,
        'ai_finding'::text
      from admin_security_trust_ai_findings f
      where f.created_at >= now() - interval '30 days'
        and f.severity in ('high', 'critical')
      union all
      select
        'alerts'::text,
        'admin_security_trust_alert_events'::text,
        a.id,
        a.customer_name,
        a.customer_domain,
        a.title,
        a.summary,
        'alert'::text
      from admin_security_trust_alert_events a
      where a.created_at >= now() - interval '30 days'
        and a.alert_priority in ('high', 'critical')
      order by source_id desc
      limit p_batch_size
    )
  loop
    begin
      v_obj_id := register_admin_security_evidence_object(
        v_sync_admin_auth_user_id,
        v_row.evidence_category,
        'trust_system_record',
        coalesce(v_row.title, 'Trust system evidence'),
        v_row.summary,
        v_row.source_module,
        v_row.source_table,
        v_row.source_id,
        null,
        v_row.customer_name,
        v_row.customer_domain,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'restricted',
        'internal',
        '{}'::jsonb,
        jsonb_build_object('syncSource', 'trust_systems'),
        'scheduled_sync',
        jsonb_build_object('source', 'sync_admin_security_evidence_from_trust_systems')
      );
      if v_obj_id is not null then
        v_synced := v_synced + 1;
      end if;
    exception
      when others then
        null;
    end;
  end loop;

  return jsonb_build_object('evidenceObjectsSynced', v_synced);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Dashboard views
-- ---------------------------------------------------------------------------

create or replace view admin_security_evidence_vault_object_dashboard as
select
  o.id as admin_security_evidence_object_id,
  o.evidence_object_key,
  o.status,
  o.evidence_category,
  o.evidence_type,
  o.customer_name,
  o.customer_domain,
  o.title,
  o.source_module,
  o.custody_state,
  (
    select count(*)
    from admin_security_evidence_manifest_items m
    where m.evidence_object_id = o.id
      and m.item_status <> 'deleted'
  ) as manifest_item_count,
  o.retain_until,
  o.deletion_eligible_at,
  o.legal_hold_active,
  o.manifest_hash_sha256,
  o.content_hash_sha256,
  o.access_classification,
  o.confidentiality_level,
  o.created_at,
  o.updated_at
from admin_security_evidence_vault_objects o
order by o.created_at desc;

create or replace view admin_security_evidence_custody_chain_dashboard as
select
  e.id as admin_security_evidence_custody_event_id,
  e.custody_event_key,
  e.evidence_object_id as admin_security_evidence_object_id,
  o.evidence_object_key,
  o.title as evidence_title,
  e.event_type,
  e.event_action,
  e.custody_state_before,
  e.custody_state_after,
  e.actor_type,
  e.actor_email,
  e.title,
  e.summary,
  e.previous_event_hash_sha256,
  e.event_hash_sha256,
  e.occurred_at,
  e.created_at
from admin_security_evidence_custody_events e
join admin_security_evidence_vault_objects o on o.id = e.evidence_object_id
order by e.occurred_at desc, e.created_at desc;

create or replace view admin_security_evidence_legal_hold_dashboard as
select
  h.id as admin_security_evidence_legal_hold_id,
  h.legal_hold_key,
  h.status,
  h.hold_name,
  h.hold_reason,
  h.hold_scope,
  h.evidence_object_id as admin_security_evidence_object_id,
  o.evidence_object_key,
  o.title as evidence_title,
  h.customer_name,
  h.customer_domain,
  h.effective_at,
  h.expires_at,
  h.released_at,
  h.release_reason,
  h.created_at,
  h.updated_at
from admin_security_evidence_legal_holds h
left join admin_security_evidence_vault_objects o on o.id = h.evidence_object_id
order by h.created_at desc;

create or replace view admin_security_evidence_export_package_dashboard as
select
  p.id as admin_security_evidence_export_package_id,
  p.evidence_export_package_key,
  p.status,
  p.export_name,
  p.export_type,
  p.export_format,
  p.customer_name,
  p.customer_domain,
  p.object_count,
  p.manifest_item_count,
  p.byte_size,
  p.redaction_applied,
  p.include_payloads,
  p.include_custody_chain,
  p.include_access_grants,
  p.package_hash_sha256,
  p.manifest_hash_sha256,
  p.storage_uri,
  p.started_at,
  p.completed_at,
  p.expires_at,
  p.created_at,
  p.updated_at
from admin_security_evidence_export_packages p
order by p.created_at desc;

create or replace view admin_security_evidence_vault_integrity as
select
  (select count(*) from admin_security_evidence_vault_objects where status <> 'deleted') as active_evidence_object_count,
  (select count(*) from admin_security_evidence_vault_objects where sealed is true and status <> 'deleted') as sealed_evidence_object_count,
  (select count(*) from admin_security_evidence_vault_objects where legal_hold_active is true and status <> 'deleted') as legal_hold_object_count,
  (select count(*) from admin_security_evidence_legal_holds where status = 'active') as active_legal_hold_count,
  (select count(*) from admin_security_evidence_vault_objects where deletion_eligible_at is not null and deletion_eligible_at <= now() and legal_hold_active is false and status <> 'deleted') as deletion_eligible_object_count,
  (select count(*) from admin_security_evidence_deletion_requests where status in ('pending_approval', 'approved', 'blocked')) as pending_deletion_request_count,
  (select count(*) from admin_security_evidence_export_packages where status in ('pending', 'processing')) as pending_export_package_count,
  (select count(*) from admin_security_evidence_custody_events where occurred_at >= now() - interval '24 hours') as custody_events_24h,
  now() as checked_at;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_api_role') THEN
    GRANT SELECT ON admin_security_evidence_vault_object_dashboard TO admin_api_role;
    GRANT SELECT ON admin_security_evidence_custody_chain_dashboard TO admin_api_role;
    GRANT SELECT ON admin_security_evidence_legal_hold_dashboard TO admin_api_role;
    GRANT SELECT ON admin_security_evidence_export_package_dashboard TO admin_api_role;
    GRANT SELECT ON admin_security_evidence_vault_integrity TO admin_api_role;
  ELSE
    RAISE NOTICE 'Skipping view GRANTs: role admin_api_role not present';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 6) RLS / policies / grants
-- ---------------------------------------------------------------------------

alter table admin_security_evidence_storage_locations enable row level security;
alter table admin_security_evidence_retention_policies enable row level security;
alter table admin_security_evidence_vault_objects enable row level security;
alter table admin_security_evidence_manifest_items enable row level security;
alter table admin_security_evidence_legal_holds enable row level security;
alter table admin_security_evidence_custody_events enable row level security;
alter table admin_security_evidence_access_grants enable row level security;
alter table admin_security_evidence_export_packages enable row level security;
alter table admin_security_evidence_export_package_objects enable row level security;
alter table admin_security_evidence_deletion_requests enable row level security;

DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_api_role') THEN
    FOR t IN
      SELECT unnest(ARRAY[
        'admin_security_evidence_storage_locations',
        'admin_security_evidence_retention_policies',
        'admin_security_evidence_vault_objects',
        'admin_security_evidence_manifest_items',
        'admin_security_evidence_legal_holds',
        'admin_security_evidence_custody_events',
        'admin_security_evidence_access_grants',
        'admin_security_evidence_export_packages',
        'admin_security_evidence_export_package_objects',
        'admin_security_evidence_deletion_requests'
      ])
    LOOP
      EXECUTE format('drop policy if exists admin_api_all_%I on %I', t, t);
      EXECUTE format('create policy admin_api_all_%I on %I for all to admin_api_role using (true) with check (true)', t, t);
    END LOOP;
  ELSE
    RAISE NOTICE 'Skipping admin_api_role policy creation: role admin_api_role not present';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worker_role') THEN
    DROP POLICY IF EXISTS worker_all_admin_security_evidence_vault_objects ON admin_security_evidence_vault_objects;
    CREATE POLICY worker_all_admin_security_evidence_vault_objects
      ON admin_security_evidence_vault_objects
      FOR ALL TO worker_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS worker_all_admin_security_evidence_manifest_items ON admin_security_evidence_manifest_items;
    CREATE POLICY worker_all_admin_security_evidence_manifest_items
      ON admin_security_evidence_manifest_items
      FOR ALL TO worker_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS worker_all_admin_security_evidence_custody_events ON admin_security_evidence_custody_events;
    CREATE POLICY worker_all_admin_security_evidence_custody_events
      ON admin_security_evidence_custody_events
      FOR ALL TO worker_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS worker_all_admin_security_evidence_export_packages ON admin_security_evidence_export_packages;
    CREATE POLICY worker_all_admin_security_evidence_export_packages
      ON admin_security_evidence_export_packages
      FOR ALL TO worker_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS worker_all_admin_security_evidence_export_package_objects ON admin_security_evidence_export_package_objects;
    CREATE POLICY worker_all_admin_security_evidence_export_package_objects
      ON admin_security_evidence_export_package_objects
      FOR ALL TO worker_role USING (true) WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping worker_role policy creation: role worker_role not present';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_api_role') THEN
    GRANT EXECUTE ON FUNCTION admin_security_evidence_build_manifest_hash(uuid) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION admin_security_evidence_make_custody_hash(text, text, text, text, text, jsonb, timestamptz) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION record_admin_security_evidence_custody_event(uuid, text, text, text, text, text, uuid, uuid, text, text, text, text, text, jsonb, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION register_admin_security_evidence_object(uuid, text, text, text, text, text, text, uuid, text, text, text, text, text, uuid, text, text, text, text, text, text, bigint, text, text, jsonb, jsonb, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION add_admin_security_evidence_manifest_item(uuid, uuid, text, text, text, text, uuid, text, text, text, text, bigint, text, text, jsonb, jsonb, integer, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION seal_admin_security_evidence_object(uuid, uuid, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION apply_admin_security_evidence_legal_hold(uuid, text, text, text, uuid, text, text, text, text, uuid, text, timestamptz, timestamptz, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION release_admin_security_evidence_legal_hold(uuid, uuid, text, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION create_admin_security_evidence_export_package(uuid, text, text, text, text, text, text, text, text, uuid, boolean, boolean, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION add_admin_security_evidence_object_to_export_package(uuid, uuid, uuid, boolean, boolean, text, text, jsonb, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION complete_admin_security_evidence_export_package(text, uuid, text, text, text, bigint, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION request_admin_security_evidence_deletion(uuid, uuid, text, text, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION execute_admin_security_evidence_deletion(uuid, uuid, text, text, jsonb) TO admin_api_role;
    GRANT EXECUTE ON FUNCTION verify_admin_security_evidence_object_integrity(uuid, uuid, text, jsonb) TO admin_api_role;
  ELSE
    RAISE NOTICE 'Skipping function grants to admin_api_role: role not present';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worker_role') THEN
    GRANT EXECUTE ON FUNCTION admin_security_evidence_build_manifest_hash(uuid) TO worker_role;
    GRANT EXECUTE ON FUNCTION admin_security_evidence_make_custody_hash(text, text, text, text, text, jsonb, timestamptz) TO worker_role;
    GRANT EXECUTE ON FUNCTION record_admin_security_evidence_custody_event(uuid, text, text, text, text, text, uuid, uuid, text, text, text, text, text, jsonb, text, jsonb) TO worker_role;
    GRANT EXECUTE ON FUNCTION complete_admin_security_evidence_export_package(text, uuid, text, text, text, bigint, text, jsonb) TO worker_role;
    GRANT EXECUTE ON FUNCTION sync_admin_security_evidence_from_trust_systems(integer) TO worker_role;
  ELSE
    RAISE NOTICE 'Skipping function grants to worker_role: role not present';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 7) Scheduled job / allowlist patch (guarded)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'scheduled_jobs'
  ) then
    insert into scheduled_jobs (
      job_key,
      job_name,
      job_group,
      enabled,
      schedule_cron,
      function_name,
      function_args,
      max_runtime_seconds,
      lock_ttl_seconds
    )
    values (
      'admin_security_evidence_sync_trust_systems_every_15m',
      'Sync evidence from trust systems',
      'admin',
      true,
      '*/15 * * * *',
      'sync_admin_security_evidence_from_trust_systems',
      '{"batch_size": 500}'::jsonb,
      300,
      600
    )
    on conflict (job_key) do update
    set
      enabled = excluded.enabled,
      schedule_cron = excluded.schedule_cron,
      function_name = excluded.function_name,
      function_args = excluded.function_args,
      max_runtime_seconds = excluded.max_runtime_seconds,
      lock_ttl_seconds = excluded.lock_ttl_seconds,
      updated_at = now();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 8) Error taxonomy
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
  ('EVIDENCE_VAULT_NOT_FOUND', 'validation', 'medium', 404, false, true, 'Evidence resource not found.', 'Evidence resource not found.', 'platform'),
  ('EVIDENCE_VAULT_INVALID_STATE', 'validation', 'high', 409, false, true, 'Evidence action is not allowed from current state.', 'Evidence vault invalid state.', 'platform'),
  ('EVIDENCE_VAULT_REQUIRED_FIELDS', 'validation', 'medium', 400, false, true, 'Required evidence fields are missing.', 'Evidence vault required fields missing.', 'platform'),
  ('EVIDENCE_VAULT_LEGAL_HOLD_BLOCKED', 'permission', 'critical', 409, false, true, 'Evidence action blocked by legal hold.', 'Evidence vault deletion blocked by legal hold.', 'platform')
on conflict (error_code) do update
set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
  internal_message = excluded.internal_message,
  owner_team = excluded.owner_team,
  updated_at = now();

insert into error_mapping_rules (match_pattern, error_code, priority, metadata)
values
  ('evidence object not found', 'EVIDENCE_VAULT_NOT_FOUND', 5, '{}'::jsonb),
  ('evidence storage location not found', 'EVIDENCE_VAULT_NOT_FOUND', 5, '{}'::jsonb),
  ('evidence export package not found', 'EVIDENCE_VAULT_NOT_FOUND', 5, '{}'::jsonb),
  ('evidence deletion request not found', 'EVIDENCE_VAULT_NOT_FOUND', 5, '{}'::jsonb),
  ('evidence legal hold not found or not active', 'EVIDENCE_VAULT_NOT_FOUND', 5, '{}'::jsonb),
  ('evidence title is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('evidence manifest item name is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('evidence legal hold name is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('evidence legal hold reason is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('evidence legal hold release reason is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('evidence export name is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('evidence export reason is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('evidence deletion reason is required', 'EVIDENCE_VAULT_REQUIRED_FIELDS', 5, '{}'::jsonb),
  ('sealed evidence object cannot be modified', 'EVIDENCE_VAULT_INVALID_STATE', 5, '{}'::jsonb),
  ('evidence export package is not editable', 'EVIDENCE_VAULT_INVALID_STATE', 5, '{}'::jsonb),
  ('evidence deletion request is not executable', 'EVIDENCE_VAULT_INVALID_STATE', 5, '{}'::jsonb),
  ('evidence deletion blocked by legal hold', 'EVIDENCE_VAULT_LEGAL_HOLD_BLOCKED', 5, '{}'::jsonb)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 9) Production hardening TODOs
-- ---------------------------------------------------------------------------

comment on table admin_security_evidence_vault_objects is
'TODO: real object storage adapter; WORM/object-lock support; KMS envelope encryption; customer-managed key support; signed URL generation; large payload externalization; Merkle tree custody chains; external timestamp authority/notarization; dual-control deletion approvals; legal/auditor RBAC; eDiscovery export formats; PDF evidence bundle generation; retention simulator; deletion approval workflow; watermarked exports; evidence chain external verification.';

