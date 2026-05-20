-- Step 9.61 — Build evidence lifecycle and retention engine.
-- Runs after 175_admin_security_auditor_packet_manifest_downloads.sql.

/*
  Existing repo already has early retention/legal-hold primitives.
  This migration upgrades those surfaces in-place to the Step 9.61 model
  while preserving backward compatibility for earlier functions.
*/

-- 1) Retention policies (upgrade existing table shape safely).
alter table if exists admin_security_retention_policies
  add column if not exists policy_type text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists retention_days integer,
  add column if not exists allow_legal_hold boolean not null default true,
  add column if not exists require_second_admin_for_delete boolean not null default true,
  add column if not exists require_mfa_for_delete boolean not null default true,
  add column if not exists public_deletion_proof boolean not null default false;

update admin_security_retention_policies
set
  policy_type = coalesce(policy_type, 'standard'),
  title = coalesce(title, initcap(replace(policy_key, '_', ' '))),
  description = coalesce(description, 'Retention policy for ' || source_type || '.'),
  retention_days = coalesce(retention_days, greatest(1, coalesce(delete_after_days, archive_after_days, hot_retention_days, 365)))
where true;

alter table admin_security_retention_policies
  alter column policy_type set not null,
  alter column title set not null,
  alter column description set not null,
  alter column retention_days set not null;

alter table admin_security_retention_policies
  drop constraint if exists admin_security_retention_policies_status_check;
alter table admin_security_retention_policies
  add constraint admin_security_retention_policies_status_check
  check (
    status in (
      'active',
      'disabled',
      'archived',
      'paused'
    )
  );

alter table admin_security_retention_policies
  drop constraint if exists admin_security_retention_policies_type_check;
alter table admin_security_retention_policies
  add constraint admin_security_retention_policies_type_check
  check (
    policy_type in (
      'standard',
      'customer_evidence',
      'auditor_evidence',
      'public_trust_artifact',
      'download_log',
      'verification_log',
      'legal_hold_sensitive',
      'custom'
    )
  );

alter table admin_security_retention_policies
  drop constraint if exists admin_security_retention_policies_source_type_check;
alter table admin_security_retention_policies
  add constraint admin_security_retention_policies_source_type_check
  check (
    source_type in (
      'admin_security_compliance_report',
      'admin_security_questionnaire_export',
      'admin_security_disclosure_package',
      'admin_security_external_trust_timeline_event',
      'admin_security_auditor_portal',
      'admin_security_auditor_evidence_packet',
      'admin_security_auditor_packet_manifest',
      'admin_security_auditor_packet_download_request',
      'admin_security_revocation_record',
      'admin_security_verification_attempt',
      'admin_security_document_request',
      'admin_security_audit_period_export',
      'other',
      -- legacy values retained for backward compatibility
      'admin_security_alert_event',
      'admin_incident_review',
      'admin_incident_corrective_action',
      'admin_break_glass_request',
      'admin_session_control',
      'admin_action_risk_evaluation',
      'admin_security_daily_snapshot',
      'admin_security_report_export',
      'audit_hash_chain_entry',
      'admin_security_notification_delivery'
    )
  );

alter table admin_security_retention_policies
  drop constraint if exists admin_security_retention_policies_days_check;
alter table admin_security_retention_policies
  add constraint admin_security_retention_policies_days_check
  check (
    retention_days > 0
    and (archive_after_days is null or archive_after_days > 0)
    and (delete_after_days is null or delete_after_days >= retention_days)
  );

alter table admin_security_retention_policies
  drop constraint if exists admin_security_retention_policies_title_check;
alter table admin_security_retention_policies
  add constraint admin_security_retention_policies_title_check
  check (length(trim(title)) > 0);

alter table admin_security_retention_policies
  drop constraint if exists admin_security_retention_policies_description_check;
alter table admin_security_retention_policies
  add constraint admin_security_retention_policies_description_check
  check (length(trim(description)) > 0);

create index if not exists admin_security_retention_policies_status_idx
on admin_security_retention_policies (status, source_type);

drop trigger if exists admin_security_retention_policies_set_updated_at
on admin_security_retention_policies;

create trigger admin_security_retention_policies_set_updated_at
before update on admin_security_retention_policies
for each row
execute function set_updated_at();

insert into admin_security_retention_policies (
  policy_key,
  status,
  policy_type,
  source_type,
  title,
  description,
  retention_days,
  archive_after_days,
  delete_after_days,
  allow_legal_hold,
  require_second_admin_for_delete,
  require_mfa_for_delete,
  public_deletion_proof,
  metadata
)
values
  (
    'compliance_reports_7y',
    'active',
    'public_trust_artifact',
    'admin_security_compliance_report',
    'Compliance reports retention',
    'Signed compliance reports are retained for seven years unless legal hold extends retention.',
    2555,
    365,
    2555,
    true,
    true,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'questionnaire_exports_3y',
    'active',
    'customer_evidence',
    'admin_security_questionnaire_export',
    'Security questionnaire exports retention',
    'Customer questionnaire response exports are retained for three years.',
    1095,
    365,
    1095,
    true,
    true,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'disclosure_packages_7y',
    'active',
    'public_trust_artifact',
    'admin_security_disclosure_package',
    'Disclosure package retention',
    'Immutable disclosure packages are retained for seven years.',
    2555,
    365,
    2555,
    true,
    true,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'auditor_portals_2y',
    'active',
    'auditor_evidence',
    'admin_security_auditor_portal',
    'Auditor portal retention',
    'Auditor portals are retained for two years after creation or expiry.',
    730,
    180,
    730,
    true,
    true,
    true,
    false,
    '{}'::jsonb
  ),
  (
    'auditor_packet_manifests_2y',
    'active',
    'auditor_evidence',
    'admin_security_auditor_packet_manifest',
    'Auditor packet manifest retention',
    'Auditor packet manifests are retained for two years.',
    730,
    180,
    730,
    true,
    true,
    true,
    false,
    '{}'::jsonb
  ),
  (
    'download_logs_1y',
    'active',
    'download_log',
    'admin_security_auditor_packet_download_request',
    'Download logs retention',
    'Auditor packet download request records are retained for one year.',
    365,
    180,
    365,
    true,
    true,
    true,
    false,
    '{}'::jsonb
  ),
  (
    'revocation_records_7y',
    'active',
    'public_trust_artifact',
    'admin_security_revocation_record',
    'Revocation records retention',
    'Revocation records are retained for seven years.',
    2555,
    365,
    2555,
    true,
    true,
    true,
    true,
    '{}'::jsonb
  )
on conflict (policy_key)
do update set
  status = excluded.status,
  policy_type = excluded.policy_type,
  source_type = excluded.source_type,
  title = excluded.title,
  description = excluded.description,
  retention_days = excluded.retention_days,
  archive_after_days = excluded.archive_after_days,
  delete_after_days = excluded.delete_after_days,
  allow_legal_hold = excluded.allow_legal_hold,
  require_second_admin_for_delete = excluded.require_second_admin_for_delete,
  require_mfa_for_delete = excluded.require_mfa_for_delete,
  public_deletion_proof = excluded.public_deletion_proof,
  metadata = admin_security_retention_policies.metadata || excluded.metadata,
  updated_at = now();

insert into admin_security_retention_policies (
  policy_key,
  status,
  policy_type,
  source_type,
  title,
  description,
  retention_days,
  archive_after_days,
  delete_after_days,
  allow_legal_hold,
  require_second_admin_for_delete,
  require_mfa_for_delete,
  public_deletion_proof,
  metadata
)
values (
  'default_other_1y',
  'active',
  'standard',
  'other',
  'Default security retention policy',
  'Default one-year retention policy for security records without a specific policy.',
  365,
  180,
  365,
  true,
  true,
  true,
  false,
  '{}'::jsonb
)
on conflict (policy_key)
do nothing;

-- 2) Retention subjects.
create table if not exists admin_security_retention_subjects (
  id uuid primary key default gen_random_uuid(),
  retention_subject_key text not null unique,
  status text not null default 'active',
  source_type text not null,
  source_id uuid not null,
  policy_id uuid references admin_security_retention_policies(id) on delete set null,
  subject_title text not null,
  subject_summary text,
  customer_name text,
  customer_domain text,
  artifact_key text,
  checksum_sha256 text,
  signature text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  retain_until timestamptz not null,
  archive_after timestamptz,
  delete_after timestamptz,
  archived_at timestamptz,
  deletion_eligible_at timestamptz,
  deleted_at timestamptz,
  legal_hold_active boolean not null default false,
  legal_hold_count integer not null default 0,
  deletion_blocked_reason text,
  public_deletion_proof boolean not null default false,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id),
  constraint admin_security_retention_subjects_status_check
  check (
    status in (
      'active',
      'archived',
      'deletion_eligible',
      'deleted',
      'legal_hold',
      'superseded',
      'error'
    )
  ),
  constraint admin_security_retention_subjects_source_type_check
  check (
    source_type in (
      'admin_security_compliance_report',
      'admin_security_questionnaire_export',
      'admin_security_disclosure_package',
      'admin_security_external_trust_timeline_event',
      'admin_security_auditor_portal',
      'admin_security_auditor_evidence_packet',
      'admin_security_auditor_packet_manifest',
      'admin_security_auditor_packet_download_request',
      'admin_security_revocation_record',
      'admin_security_verification_attempt',
      'admin_security_document_request',
      'admin_security_audit_period_export',
      'other'
    )
  ),
  constraint admin_security_retention_subjects_title_check
  check (length(trim(subject_title)) > 0)
);

create index if not exists admin_security_retention_subjects_status_idx
on admin_security_retention_subjects (status, retain_until, delete_after);

create index if not exists admin_security_retention_subjects_source_idx
on admin_security_retention_subjects (source_type, source_id);

create index if not exists admin_security_retention_subjects_customer_idx
on admin_security_retention_subjects (customer_name, customer_domain);

drop trigger if exists admin_security_retention_subjects_set_updated_at
on admin_security_retention_subjects;

create trigger admin_security_retention_subjects_set_updated_at
before update on admin_security_retention_subjects
for each row
execute function set_updated_at();

-- 3) Legal holds (upgrade existing table to include source/subject semantics).
alter table if exists admin_security_legal_holds
  add column if not exists legal_hold_key text,
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists retention_subject_id uuid references admin_security_retention_subjects(id) on delete set null,
  add column if not exists case_reference text,
  add column if not exists placed_by_auth_user_id uuid,
  add column if not exists placed_by_admin_user_id uuid references admin_users(id);

update admin_security_legal_holds
set
  legal_hold_key = coalesce(legal_hold_key, hold_key),
  placed_by_auth_user_id = coalesce(placed_by_auth_user_id, created_by_auth_user_id),
  placed_by_admin_user_id = coalesce(placed_by_admin_user_id, created_by_admin_user_id),
  source_type = coalesce(source_type, 'other'),
  source_id = coalesce(source_id, id)
where true;

alter table admin_security_legal_holds
  alter column legal_hold_key set not null,
  alter column source_type set not null,
  alter column source_id set not null,
  alter column placed_by_auth_user_id set not null;

create unique index if not exists admin_security_legal_holds_legal_hold_key_uidx
on admin_security_legal_holds (legal_hold_key);

alter table admin_security_legal_holds
  drop constraint if exists admin_security_legal_holds_status_check;
alter table admin_security_legal_holds
  add constraint admin_security_legal_holds_status_check
  check (
    status in (
      'active',
      'released',
      'superseded',
      'archived',
      'expired',
      'cancelled'
    )
  );

alter table admin_security_legal_holds
  drop constraint if exists admin_security_legal_holds_type_check;
alter table admin_security_legal_holds
  add constraint admin_security_legal_holds_type_check
  check (
    hold_type in (
      'legal',
      'security_incident',
      'customer_dispute',
      'regulatory',
      'litigation',
      'internal_investigation',
      'other',
      -- legacy values retained for compatibility
      'compliance',
      'security',
      'investigation'
    )
  );

create index if not exists admin_security_legal_holds_source_idx
on admin_security_legal_holds (source_type, source_id, status);

create index if not exists admin_security_legal_holds_subject_idx
on admin_security_legal_holds (retention_subject_id, status);

create index if not exists admin_security_legal_holds_status_idx
on admin_security_legal_holds (status, effective_at desc);

drop trigger if exists admin_security_legal_holds_set_updated_at
on admin_security_legal_holds;

create trigger admin_security_legal_holds_set_updated_at
before update on admin_security_legal_holds
for each row
execute function set_updated_at();

-- 4) Retention decisions immutable ledger.
create table if not exists admin_security_retention_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_key text not null unique,
  retention_subject_id uuid references admin_security_retention_subjects(id) on delete set null,
  source_type text not null,
  source_id uuid not null,
  decision_type text not null,
  decision_status text not null default 'completed',
  previous_subject_status text,
  new_subject_status text,
  policy_id uuid references admin_security_retention_policies(id) on delete set null,
  legal_hold_id uuid references admin_security_legal_holds(id) on delete set null,
  reason_code text not null,
  reason text not null,
  public_reason text,
  decision_payload jsonb not null default '{}'::jsonb,
  payload_checksum_sha256 text,
  hash_chain_entry_id uuid,
  decided_by_auth_user_id uuid,
  decided_by_admin_user_id uuid references admin_users(id),
  worker_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_retention_decisions_type_check
  check (
    decision_type in (
      'subject_registered',
      'policy_applied',
      'archived',
      'deletion_eligible',
      'deleted',
      'legal_hold_placed',
      'legal_hold_released',
      'deletion_blocked',
      'retention_extended',
      'retention_error',
      'other'
    )
  ),
  constraint admin_security_retention_decisions_status_check
  check (
    decision_status in (
      'completed',
      'pending',
      'failed',
      'cancelled'
    )
  ),
  constraint admin_security_retention_decisions_reason_code_check
  check (
    reason_code in (
      'policy',
      'manual',
      'legal_hold',
      'legal_hold_release',
      'expired',
      'customer_request',
      'security_incident',
      'regulatory',
      'dependency',
      'system_job',
      'error',
      'other'
    )
  ),
  constraint admin_security_retention_decisions_reason_check
  check (length(trim(reason)) > 0)
);

create index if not exists admin_security_retention_decisions_subject_idx
on admin_security_retention_decisions (retention_subject_id, created_at desc);

create index if not exists admin_security_retention_decisions_source_idx
on admin_security_retention_decisions (source_type, source_id, created_at desc);

create index if not exists admin_security_retention_decisions_type_idx
on admin_security_retention_decisions (decision_type, created_at desc);

-- 5) Public-safe deletion proof view.
create or replace view admin_security_public_retention_deletion_proof as
select
  s.retention_subject_key,
  s.source_type,
  s.source_id,
  s.artifact_key,
  s.checksum_sha256,
  s.signature,
  s.customer_name,
  s.status,
  s.deleted_at,
  d.decision_key,
  d.reason_code,
  coalesce(d.public_reason, d.reason) as public_reason,
  d.payload_checksum_sha256,
  d.created_at as decision_at
from admin_security_retention_subjects s
join admin_security_retention_decisions d
  on d.retention_subject_id = s.id
where s.status = 'deleted'
  and s.public_deletion_proof is true
  and d.decision_type = 'deleted';

grant select on admin_security_public_retention_deletion_proof to admin_api_role;

-- 6) Helper functions.
create or replace function find_admin_security_retention_policy(
  p_source_type text
)
returns admin_security_retention_policies
language plpgsql
stable
as $$
declare
  v_policy admin_security_retention_policies%rowtype;
begin
  select *
  into v_policy
  from admin_security_retention_policies
  where status = 'active'
    and source_type = p_source_type
  order by created_at desc
  limit 1;

  if v_policy.id is null then
    select *
    into v_policy
    from admin_security_retention_policies
    where status = 'active'
      and source_type = 'other'
    order by created_at desc
    limit 1;
  end if;

  return v_policy;
end;
$$;

create or replace function record_admin_security_retention_decision(
  p_retention_subject_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_decision_type text,
  p_previous_subject_status text,
  p_new_subject_status text,
  p_policy_id uuid,
  p_legal_hold_id uuid,
  p_reason_code text,
  p_reason text,
  p_public_reason text default null,
  p_decision_payload jsonb default '{}'::jsonb,
  p_decided_by_auth_user_id uuid default null,
  p_worker_id text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_decision_id uuid;
  v_decision_key text;
  v_payload_checksum text;
  v_hash_entry_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'retention decision reason is required';
  end if;

  if p_decided_by_auth_user_id is not null then
    v_admin := get_active_admin_user(p_decided_by_auth_user_id);
  end if;

  v_decision_key :=
    'retention_decision:' ||
    p_decision_type || ':' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  v_payload_checksum :=
    encode(
      digest(
        coalesce(p_decision_payload, '{}'::jsonb)::text,
        'sha256'
      ),
      'hex'
    );

  insert into admin_security_retention_decisions (
    decision_key,
    retention_subject_id,
    source_type,
    source_id,
    decision_type,
    decision_status,
    previous_subject_status,
    new_subject_status,
    policy_id,
    legal_hold_id,
    reason_code,
    reason,
    public_reason,
    decision_payload,
    payload_checksum_sha256,
    decided_by_auth_user_id,
    decided_by_admin_user_id,
    worker_id,
    request_id,
    metadata
  )
  values (
    v_decision_key,
    p_retention_subject_id,
    p_source_type,
    p_source_id,
    p_decision_type,
    'completed',
    p_previous_subject_status,
    p_new_subject_status,
    p_policy_id,
    p_legal_hold_id,
    p_reason_code,
    p_reason,
    p_public_reason,
    coalesce(p_decision_payload, '{}'::jsonb),
    v_payload_checksum,
    p_decided_by_auth_user_id,
    v_admin.id,
    p_worker_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_decision_id;

  v_hash_entry_id := append_audit_hash_chain_entry(
    'admin_security_retention_decision',
    v_decision_id,
    jsonb_build_object(
      'decision_key', v_decision_key,
      'retention_subject_id', p_retention_subject_id,
      'source_type', p_source_type,
      'source_id', p_source_id,
      'decision_type', p_decision_type,
      'previous_subject_status', p_previous_subject_status,
      'new_subject_status', p_new_subject_status,
      'reason_code', p_reason_code,
      'reason', p_reason,
      'payload_checksum_sha256', v_payload_checksum,
      'created_at', now()
    ),
    'global_audit_chain',
    coalesce(p_metadata, '{}'::jsonb)
  );

  update admin_security_retention_decisions
  set hash_chain_entry_id = v_hash_entry_id
  where id = v_decision_id;

  return v_decision_id;
end;
$$;

create or replace function register_admin_security_retention_subject(
  p_source_type text,
  p_source_id uuid,
  p_subject_title text,
  p_subject_summary text default null,
  p_customer_name text default null,
  p_customer_domain text default null,
  p_artifact_key text default null,
  p_checksum_sha256 text default null,
  p_signature text default null,
  p_first_seen_at timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_policy admin_security_retention_policies%rowtype;
  v_subject_id uuid;
  v_subject_key text;
  v_first_seen timestamptz;
begin
  if p_source_id is null then
    raise exception 'retention subject source id is required';
  end if;

  if p_subject_title is null or length(trim(p_subject_title)) = 0 then
    raise exception 'retention subject title is required';
  end if;

  v_policy := find_admin_security_retention_policy(p_source_type);

  if v_policy.id is null then
    raise exception 'retention policy not found for source type: %', p_source_type;
  end if;

  v_first_seen := coalesce(p_first_seen_at, now());
  v_subject_key := 'retention_subject:' || p_source_type || ':' || p_source_id::text;

  insert into admin_security_retention_subjects (
    retention_subject_key,
    status,
    source_type,
    source_id,
    policy_id,
    subject_title,
    subject_summary,
    customer_name,
    customer_domain,
    artifact_key,
    checksum_sha256,
    signature,
    first_seen_at,
    last_seen_at,
    retain_until,
    archive_after,
    delete_after,
    public_deletion_proof,
    request_id,
    metadata
  )
  values (
    v_subject_key,
    'active',
    p_source_type,
    p_source_id,
    v_policy.id,
    p_subject_title,
    p_subject_summary,
    p_customer_name,
    p_customer_domain,
    p_artifact_key,
    p_checksum_sha256,
    p_signature,
    v_first_seen,
    now(),
    v_first_seen + make_interval(days => v_policy.retention_days),
    case
      when v_policy.archive_after_days is not null
      then v_first_seen + make_interval(days => v_policy.archive_after_days)
      else null
    end,
    case
      when v_policy.delete_after_days is not null
      then v_first_seen + make_interval(days => v_policy.delete_after_days)
      else null
    end,
    v_policy.public_deletion_proof,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (source_type, source_id)
  do update set
    last_seen_at = now(),
    subject_title = excluded.subject_title,
    subject_summary = coalesce(excluded.subject_summary, admin_security_retention_subjects.subject_summary),
    customer_name = coalesce(excluded.customer_name, admin_security_retention_subjects.customer_name),
    customer_domain = coalesce(excluded.customer_domain, admin_security_retention_subjects.customer_domain),
    artifact_key = coalesce(excluded.artifact_key, admin_security_retention_subjects.artifact_key),
    checksum_sha256 = coalesce(excluded.checksum_sha256, admin_security_retention_subjects.checksum_sha256),
    signature = coalesce(excluded.signature, admin_security_retention_subjects.signature),
    metadata = admin_security_retention_subjects.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_subject_id;

  perform record_admin_security_retention_decision(
    v_subject_id,
    p_source_type,
    p_source_id,
    'subject_registered',
    null,
    'active',
    v_policy.id,
    null,
    'policy',
    'Retention subject registered under policy ' || v_policy.policy_key,
    null,
    jsonb_build_object(
      'policy_key',
      v_policy.policy_key,
      'retain_until',
      (
        select retain_until
        from admin_security_retention_subjects
        where id = v_subject_id
      ),
      'archive_after',
      (
        select archive_after
        from admin_security_retention_subjects
        where id = v_subject_id
      ),
      'delete_after',
      (
        select delete_after
        from admin_security_retention_subjects
        where id = v_subject_id
      )
    ),
    null,
    null,
    p_request_id,
    p_metadata
  );

  return v_subject_id;
end;
$$;

create or replace function discover_admin_security_retention_subjects(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_row record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_row in
    select
      'admin_security_compliance_report'::text as source_type,
      r.id as source_id,
      r.report_title as title,
      r.report_key as artifact_key,
      r.checksum_sha256,
      r.signature,
      null::text as customer_name,
      null::text as customer_domain,
      r.created_at
    from admin_security_compliance_report_requests r
    where r.status in ('ready', 'expired', 'revoked')
      and not exists (
        select 1 from admin_security_retention_subjects s
        where s.source_type = 'admin_security_compliance_report'
          and s.source_id = r.id
      )

    union all

    select
      'admin_security_questionnaire_export'::text,
      e.id,
      p.questionnaire_title || ' Export',
      e.export_key,
      e.checksum_sha256,
      e.signature,
      p.customer_name,
      p.customer_domain,
      e.created_at
    from admin_security_questionnaire_exports e
    join admin_security_questionnaire_projects p
      on p.id = e.questionnaire_project_id
    where e.status in ('ready', 'expired', 'revoked')
      and not exists (
        select 1 from admin_security_retention_subjects s
        where s.source_type = 'admin_security_questionnaire_export'
          and s.source_id = e.id
      )

    union all

    select
      'admin_security_disclosure_package'::text,
      p.id,
      p.title,
      p.package_key,
      p.checksum_sha256,
      p.signature,
      p.customer_name,
      p.customer_domain,
      p.created_at
    from admin_security_disclosure_packages p
    where p.status in ('active', 'revoked', 'superseded')
      and not exists (
        select 1 from admin_security_retention_subjects s
        where s.source_type = 'admin_security_disclosure_package'
          and s.source_id = p.id
      )

    union all

    select
      'admin_security_auditor_portal'::text,
      p.id,
      p.title,
      p.portal_key,
      null,
      null,
      p.customer_name,
      p.customer_domain,
      p.created_at
    from admin_security_auditor_portals p
    where p.status in ('published', 'expired', 'revoked', 'archived')
      and not exists (
        select 1 from admin_security_retention_subjects s
        where s.source_type = 'admin_security_auditor_portal'
          and s.source_id = p.id
      )

    union all

    select
      'admin_security_auditor_packet_manifest'::text,
      m.id,
      m.title,
      m.manifest_key,
      m.checksum_sha256,
      m.signature,
      m.customer_name,
      m.customer_domain,
      m.created_at
    from admin_security_auditor_packet_manifests m
    where m.status in ('ready', 'expired', 'revoked')
      and not exists (
        select 1 from admin_security_retention_subjects s
        where s.source_type = 'admin_security_auditor_packet_manifest'
          and s.source_id = m.id
      )

    union all

    select
      'admin_security_revocation_record'::text,
      r.id,
      'Revocation: ' || r.source_type,
      r.revocation_key,
      null,
      null,
      r.affected_customer_name,
      null,
      r.created_at
    from admin_security_revocation_records r
    where r.status in ('active', 'superseded', 'rescinded', 'archived')
      and not exists (
        select 1 from admin_security_retention_subjects s
        where s.source_type = 'admin_security_revocation_record'
          and s.source_id = r.id
      )

    limit p_batch_size
  loop
    perform register_admin_security_retention_subject(
      v_row.source_type,
      v_row.source_id,
      v_row.title,
      null,
      v_row.customer_name,
      v_row.customer_domain,
      v_row.artifact_key,
      v_row.checksum_sha256,
      v_row.signature,
      v_row.created_at,
      null,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'retention_discovery_run_id',
        v_run_id,
        'worker_id',
        p_worker_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function place_admin_security_legal_hold(
  p_admin_auth_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_hold_type text,
  p_title text,
  p_reason text,
  p_case_reference text default null,
  p_external_reference text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_subject admin_security_retention_subjects%rowtype;
  v_hold_id uuid;
  v_hold_key text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'action_key',
      'place_admin_security_legal_hold',
      'source_type',
      p_source_type,
      'source_id',
      p_source_id
    )
  );

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'legal hold reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_subject
  from admin_security_retention_subjects
  where source_type = p_source_type
    and source_id = p_source_id
  for update;

  if v_subject.id is null then
    raise exception 'retention subject not found for legal hold';
  end if;

  v_hold_key :=
    'legal_hold:' ||
    p_source_type || ':' ||
    p_source_id::text || ':' ||
    substr(encode(gen_random_bytes(8), 'hex'), 1, 16);

  insert into admin_security_legal_holds (
    legal_hold_key,
    hold_key,
    status,
    hold_type,
    source_type,
    source_id,
    retention_subject_id,
    title,
    reason,
    case_reference,
    external_reference,
    placed_by_auth_user_id,
    placed_by_admin_user_id,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_hold_key,
    v_hold_key,
    'active',
    coalesce(p_hold_type, 'legal'),
    p_source_type,
    p_source_id,
    v_subject.id,
    p_title,
    p_reason,
    p_case_reference,
    p_external_reference,
    p_admin_auth_user_id,
    v_admin.id,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_hold_id;

  update admin_security_retention_subjects
  set
    status = 'legal_hold',
    legal_hold_active = true,
    legal_hold_count = legal_hold_count + 1,
    deletion_blocked_reason = 'active legal hold',
    updated_at = now()
  where id = v_subject.id;

  perform record_admin_security_retention_decision(
    v_subject.id,
    p_source_type,
    p_source_id,
    'legal_hold_placed',
    v_subject.status,
    'legal_hold',
    v_subject.policy_id,
    v_hold_id,
    'legal_hold',
    p_reason,
    null,
    jsonb_build_object(
      'legal_hold_key',
      v_hold_key,
      'hold_type',
      coalesce(p_hold_type, 'legal'),
      'case_reference',
      p_case_reference
    ),
    p_admin_auth_user_id,
    null,
    p_request_id,
    p_metadata
  );

  return v_hold_id;
end;
$$;

create or replace function release_admin_security_legal_hold(
  p_admin_auth_user_id uuid,
  p_legal_hold_id uuid,
  p_release_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_hold admin_security_legal_holds%rowtype;
  v_active_hold_count integer;
  v_previous_status text;
  v_new_status text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'action_key',
      'release_admin_security_legal_hold',
      'legal_hold_id',
      p_legal_hold_id
    )
  );

  if p_release_reason is null or length(trim(p_release_reason)) = 0 then
    raise exception 'legal hold release reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_hold
  from admin_security_legal_holds
  where id = p_legal_hold_id
  for update;

  if v_hold.id is null then
    raise exception 'legal hold not found: %', p_legal_hold_id;
  end if;

  if v_hold.status <> 'active' then
    raise exception 'legal hold cannot be released from status: %', v_hold.status;
  end if;

  update admin_security_legal_holds
  set
    status = 'released',
    released_at = now(),
    released_by_auth_user_id = p_admin_auth_user_id,
    released_by_admin_user_id = v_admin.id,
    release_reason = p_release_reason,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_hold.id;

  select count(*)
  into v_active_hold_count
  from admin_security_legal_holds
  where retention_subject_id = v_hold.retention_subject_id
    and status = 'active';

  select status
  into v_previous_status
  from admin_security_retention_subjects
  where id = v_hold.retention_subject_id
  for update;

  v_new_status := case
    when v_active_hold_count > 0 then 'legal_hold'
    when exists (
      select 1
      from admin_security_retention_subjects
      where id = v_hold.retention_subject_id
        and delete_after is not null
        and delete_after <= now()
    ) then 'deletion_eligible'
    when exists (
      select 1
      from admin_security_retention_subjects
      where id = v_hold.retention_subject_id
        and archived_at is not null
    ) then 'archived'
    else 'active'
  end;

  update admin_security_retention_subjects
  set
    status = v_new_status,
    legal_hold_active = v_active_hold_count > 0,
    legal_hold_count = v_active_hold_count,
    deletion_blocked_reason = case
      when v_active_hold_count > 0 then 'active legal hold'
      else null
    end,
    updated_at = now()
  where id = v_hold.retention_subject_id;

  perform record_admin_security_retention_decision(
    v_hold.retention_subject_id,
    v_hold.source_type,
    v_hold.source_id,
    'legal_hold_released',
    v_previous_status,
    v_new_status,
    null,
    v_hold.id,
    'legal_hold_release',
    p_release_reason,
    null,
    jsonb_build_object(
      'legal_hold_key',
      v_hold.legal_hold_key,
      'remaining_active_holds',
      v_active_hold_count
    ),
    p_admin_auth_user_id,
    null,
    p_request_id,
    p_metadata
  );

  return v_hold.id;
end;
$$;

create or replace function run_admin_security_retention_lifecycle_job(
  p_batch_size integer default 500,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_subject admin_security_retention_subjects%rowtype;
  v_previous_status text;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  for v_subject in
    select *
    from admin_security_retention_subjects
    where status in ('active', 'archived')
      and legal_hold_active is false
      and (
        (status = 'active' and archive_after is not null and archive_after <= now())
        or
        (delete_after is not null and delete_after <= now())
      )
    order by coalesce(delete_after, archive_after) asc
    limit p_batch_size
    for update skip locked
  loop
    v_previous_status := v_subject.status;

    if v_subject.delete_after is not null and v_subject.delete_after <= now() then
      update admin_security_retention_subjects
      set
        status = 'deletion_eligible',
        deletion_eligible_at = coalesce(deletion_eligible_at, now()),
        deletion_blocked_reason = null,
        updated_at = now()
      where id = v_subject.id;

      perform record_admin_security_retention_decision(
        v_subject.id,
        v_subject.source_type,
        v_subject.source_id,
        'deletion_eligible',
        v_previous_status,
        'deletion_eligible',
        v_subject.policy_id,
        null,
        'policy',
        'Retention period ended; subject is deletion eligible.',
        null,
        jsonb_build_object(
          'retention_lifecycle_run_id',
          v_run_id,
          'delete_after',
          v_subject.delete_after
        ),
        null,
        p_worker_id,
        null,
        p_metadata
      );

    elsif v_subject.archive_after is not null and v_subject.archive_after <= now() then
      update admin_security_retention_subjects
      set
        status = 'archived',
        archived_at = coalesce(archived_at, now()),
        updated_at = now()
      where id = v_subject.id;

      perform record_admin_security_retention_decision(
        v_subject.id,
        v_subject.source_type,
        v_subject.source_id,
        'archived',
        v_previous_status,
        'archived',
        v_subject.policy_id,
        null,
        'policy',
        'Archive threshold reached by retention policy.',
        null,
        jsonb_build_object(
          'retention_lifecycle_run_id',
          v_run_id,
          'archive_after',
          v_subject.archive_after
        ),
        null,
        p_worker_id,
        null,
        p_metadata
      );
    end if;
  end loop;

  return v_run_id;
end;
$$;

create or replace function execute_admin_security_retention_deletion(
  p_admin_auth_user_id uuid,
  p_retention_subject_id uuid,
  p_reason text,
  p_second_admin_approval_request_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_subject admin_security_retention_subjects%rowtype;
  v_policy admin_security_retention_policies%rowtype;
  v_previous_status text;
  v_decision_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'retention deletion reason is required';
  end if;

  select *
  into v_subject
  from admin_security_retention_subjects
  where id = p_retention_subject_id
  for update;

  if v_subject.id is null then
    raise exception 'retention subject not found: %', p_retention_subject_id;
  end if;

  if v_subject.legal_hold_active is true then
    raise exception 'cannot delete retention subject under legal hold';
  end if;

  if v_subject.status <> 'deletion_eligible' then
    raise exception 'retention subject is not deletion eligible: %', v_subject.status;
  end if;

  select *
  into v_policy
  from admin_security_retention_policies
  where id = v_subject.policy_id;

  if coalesce(v_policy.require_mfa_for_delete, true) is true then
    perform require_admin_mfa(
      p_admin_auth_user_id,
      'privileged_action',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'action_key',
        'execute_admin_security_retention_deletion',
        'retention_subject_id',
        v_subject.id
      )
    );
  end if;

  if coalesce(v_policy.require_second_admin_for_delete, true) is true then
    perform require_admin_security_disclosure_approval(
      'admin_security_retention_subject',
      v_subject.id,
      'other'
    );
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);
  v_previous_status := v_subject.status;

  if v_subject.source_type = 'admin_security_questionnaire_export' then
    update admin_security_questionnaire_exports
    set
      storage_uri = null,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;

  elsif v_subject.source_type = 'admin_security_compliance_report' then
    update admin_security_compliance_report_requests
    set
      storage_uri = null,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;

  elsif v_subject.source_type = 'admin_security_auditor_packet_manifest' then
    update admin_security_auditor_packet_manifests
    set
      storage_uri = null,
      manifest_json = '{}'::jsonb,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;

  elsif v_subject.source_type = 'admin_security_auditor_packet_download_request' then
    update admin_security_auditor_packet_download_requests
    set
      storage_uri = null,
      metadata = metadata || jsonb_build_object(
        'retention_deleted_at',
        now(),
        'retention_subject_id',
        v_subject.id
      ),
      updated_at = now()
    where id = v_subject.source_id;
  end if;

  update admin_security_retention_subjects
  set
    status = 'deleted',
    deleted_at = now(),
    deletion_blocked_reason = null,
    updated_at = now()
  where id = v_subject.id;

  v_decision_id := record_admin_security_retention_decision(
    v_subject.id,
    v_subject.source_type,
    v_subject.source_id,
    'deleted',
    v_previous_status,
    'deleted',
    v_subject.policy_id,
    null,
    'manual',
    p_reason,
    case
      when v_subject.public_deletion_proof is true then 'Retention period ended and deletion was completed.'
      else null
    end,
    jsonb_build_object(
      'retention_subject_key',
      v_subject.retention_subject_key,
      'source_type',
      v_subject.source_type,
      'source_id',
      v_subject.source_id,
      'artifact_key',
      v_subject.artifact_key,
      'checksum_sha256',
      v_subject.checksum_sha256,
      'deleted_at',
      now()
    ),
    p_admin_auth_user_id,
    null,
    p_request_id,
    p_metadata
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'execute_admin_security_retention_deletion',
    'admin.write',
    'admin_security_retention_subject',
    v_subject.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'retention_decision_id',
      v_decision_id
    )
  );

  return v_decision_id;
end;
$$;

insert into admin_security_disclosure_approval_policies (
  policy_key,
  status,
  disclosure_type,
  risk_level,
  title,
  description,
  require_security_approval,
  require_legal_approval,
  require_second_admin_approval,
  require_mfa,
  min_required_approvals,
  applies_to_source_types,
  metadata
)
values (
  'retention_deletion_second_admin_high',
  'active',
  'other',
  'high',
  'Retention deletion approval',
  'Deletion of security retention subjects requires second-admin approval.',
  true,
  false,
  true,
  true,
  2,
  array['admin_security_retention_subject'],
  '{}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  description = excluded.description,
  applies_to_source_types = excluded.applies_to_source_types,
  updated_at = now();

-- 7) Scheduler entries + run_scheduled_job allowlist patch.
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
    'admin_security_retention_discovery_daily',
    'Discover security retention subjects',
    'admin',
    true,
    '11 2 * * *',
    'discover_admin_security_retention_subjects',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
  ),
  (
    'admin_security_retention_lifecycle_daily',
    'Run security retention lifecycle',
    'admin',
    true,
    '41 2 * * *',
    'run_admin_security_retention_lifecycle_job',
    '{"batch_size": 1000}'::jsonb,
    300,
    600,
    '{"priority": "medium"}'::jsonb
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

  select * into v_job from scheduled_jobs where job_key = p_job_key;
  if v_job.id is null then
    raise exception 'scheduled job not found: %', p_job_key;
  end if;

  if v_job.enabled is false then
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'disabled', p_metadata)
    returning id into v_run_id;
    update scheduled_jobs
    set last_status = 'disabled', last_run_id = v_run_id, updated_at = now()
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
    insert into scheduled_job_runs (scheduled_job_id, job_key, job_group, status, metadata)
    values (v_job.id, v_job.job_key, v_job.job_group, 'skipped_locked', p_metadata)
    returning id into v_run_id;
    update scheduled_jobs
    set last_status = 'skipped_locked', last_run_id = v_run_id, updated_at = now()
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
  values (v_job.id, v_job.job_key, v_job.job_group, 'started', v_started_at, p_metadata)
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
  elsif v_job.function_name = 'discover_admin_security_retention_subjects' then
    v_uuid_result := discover_admin_security_retention_subjects(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      'scheduled-job',
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_admin_security_retention_lifecycle_job' then
    v_uuid_result := run_admin_security_retention_lifecycle_job(
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
            when v_started_at is not null
            then (extract(epoch from (now() - v_started_at)) * 1000)::integer
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

-- 8) Dashboard views.
create or replace view admin_security_retention_subject_dashboard as
select
  s.id as admin_security_retention_subject_id,
  s.retention_subject_key,
  s.status,
  s.source_type,
  s.source_id,
  p.policy_key,
  p.policy_type,
  p.retention_days,
  p.archive_after_days,
  p.delete_after_days,
  s.subject_title,
  s.subject_summary,
  s.customer_name,
  s.customer_domain,
  s.artifact_key,
  s.checksum_sha256,
  s.signature,
  s.first_seen_at,
  s.last_seen_at,
  s.retain_until,
  s.archive_after,
  s.delete_after,
  s.archived_at,
  s.deletion_eligible_at,
  s.deleted_at,
  s.legal_hold_active,
  s.legal_hold_count,
  s.deletion_blocked_reason,
  s.public_deletion_proof,
  (
    select count(*)
    from admin_security_retention_decisions d
    where d.retention_subject_id = s.id
  ) as decision_count,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_retention_subjects s
left join admin_security_retention_policies p
  on p.id = s.policy_id
order by s.created_at desc;

create or replace view admin_security_legal_hold_dashboard as
select
  h.id as admin_security_legal_hold_id,
  h.legal_hold_key,
  h.status,
  h.hold_type,
  h.source_type,
  h.source_id,
  h.retention_subject_id,
  s.retention_subject_key,
  h.title,
  h.reason,
  h.case_reference,
  h.external_reference,
  h.effective_at,
  h.released_at,
  placer.email as placed_by_email,
  releaser.email as released_by_email,
  h.release_reason,
  h.created_at,
  h.updated_at,
  h.metadata
from admin_security_legal_holds h
left join admin_security_retention_subjects s
  on s.id = h.retention_subject_id
left join admin_users placer
  on placer.id = h.placed_by_admin_user_id
left join admin_users releaser
  on releaser.id = h.released_by_admin_user_id
order by h.created_at desc;

create or replace view admin_security_retention_decision_dashboard as
select
  d.id as admin_security_retention_decision_id,
  d.decision_key,
  d.retention_subject_id,
  s.retention_subject_key,
  d.source_type,
  d.source_id,
  d.decision_type,
  d.decision_status,
  d.previous_subject_status,
  d.new_subject_status,
  p.policy_key,
  h.legal_hold_key,
  d.reason_code,
  d.reason,
  d.public_reason,
  d.payload_checksum_sha256,
  d.hash_chain_entry_id,
  admin.email as decided_by_email,
  d.worker_id,
  d.created_at,
  d.metadata
from admin_security_retention_decisions d
left join admin_security_retention_subjects s
  on s.id = d.retention_subject_id
left join admin_security_retention_policies p
  on p.id = d.policy_id
left join admin_security_legal_holds h
  on h.id = d.legal_hold_id
left join admin_users admin
  on admin.id = d.decided_by_admin_user_id
order by d.created_at desc;

create or replace view admin_security_retention_integrity as
select
  (
    select count(*)
    from admin_security_retention_subjects
  ) as retention_subject_count,
  (
    select count(*)
    from admin_security_retention_subjects
    where status = 'legal_hold'
  ) as legal_hold_subject_count,
  (
    select count(*)
    from admin_security_retention_subjects
    where status = 'deletion_eligible'
  ) as deletion_eligible_subject_count,
  (
    select count(*)
    from admin_security_retention_subjects
    where status = 'deleted'
  ) as deleted_subject_count,
  (
    select count(*)
    from admin_security_legal_holds
    where status = 'active'
  ) as active_legal_hold_count,
  (
    select count(*)
    from admin_security_retention_subjects
    where legal_hold_active is true
      and not exists (
        select 1
        from admin_security_legal_holds h
        where h.retention_subject_id = admin_security_retention_subjects.id
          and h.status = 'active'
      )
  ) as subject_legal_hold_mismatch_count,
  (
    select count(*)
    from admin_security_retention_decisions
    where hash_chain_entry_id is null
  ) as decision_missing_hash_count,
  (
    select count(*)
    from admin_security_retention_subjects
    where status = 'active'
      and delete_after is not null
      and delete_after <= now()
      and legal_hold_active is false
  ) as overdue_deletion_eligibility_count,
  now() as checked_at;

grant select on admin_security_retention_subject_dashboard to admin_api_role;
grant select on admin_security_legal_hold_dashboard to admin_api_role;
grant select on admin_security_retention_decision_dashboard to admin_api_role;
grant select on admin_security_retention_integrity to admin_api_role;

-- 9) RLS & grants.
alter table admin_security_retention_policies enable row level security;
alter table admin_security_retention_subjects enable row level security;
alter table admin_security_legal_holds enable row level security;
alter table admin_security_retention_decisions enable row level security;

drop policy if exists admin_security_retention_policies_no_user_direct_access
on admin_security_retention_policies;
create policy admin_security_retention_policies_no_user_direct_access
on admin_security_retention_policies
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_retention_subjects_no_user_direct_access
on admin_security_retention_subjects;
create policy admin_security_retention_subjects_no_user_direct_access
on admin_security_retention_subjects
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_legal_holds_no_user_direct_access
on admin_security_legal_holds;
create policy admin_security_legal_holds_no_user_direct_access
on admin_security_legal_holds
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_retention_decisions_no_user_direct_access
on admin_security_retention_decisions;
create policy admin_security_retention_decisions_no_user_direct_access
on admin_security_retention_decisions
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_retention_policies
on admin_security_retention_policies;
create policy admin_api_all_admin_security_retention_policies
on admin_security_retention_policies
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_retention_subjects
on admin_security_retention_subjects;
create policy admin_api_all_admin_security_retention_subjects
on admin_security_retention_subjects
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_legal_holds
on admin_security_legal_holds;
create policy admin_api_all_admin_security_legal_holds
on admin_security_legal_holds
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_retention_decisions
on admin_security_retention_decisions;
create policy admin_api_all_admin_security_retention_decisions
on admin_security_retention_decisions
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_retention_subjects
on admin_security_retention_subjects;
create policy worker_all_admin_security_retention_subjects
on admin_security_retention_subjects
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_insert_admin_security_retention_decisions
on admin_security_retention_decisions;
create policy worker_insert_admin_security_retention_decisions
on admin_security_retention_decisions
for insert
to worker_role
with check (true);

drop policy if exists worker_read_admin_security_retention_policies
on admin_security_retention_policies;
create policy worker_read_admin_security_retention_policies
on admin_security_retention_policies
for select
to worker_role
using (true);

grant execute on function find_admin_security_retention_policy(text)
to admin_api_role, worker_role;

grant execute on function record_admin_security_retention_decision(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role, worker_role;

grant execute on function register_admin_security_retention_subject(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  jsonb
) to admin_api_role, worker_role;

grant execute on function discover_admin_security_retention_subjects(integer, text, jsonb)
to worker_role, admin_api_role;

grant execute on function place_admin_security_legal_hold(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function release_admin_security_legal_hold(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function run_admin_security_retention_lifecycle_job(integer, text, jsonb)
to worker_role, admin_api_role;

grant execute on function execute_admin_security_retention_deletion(
  uuid,
  uuid,
  text,
  uuid,
  text,
  jsonb
) to admin_api_role;

alter function find_admin_security_retention_policy(text) security definer;
alter function find_admin_security_retention_policy(text) set search_path = public;

alter function record_admin_security_retention_decision(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  uuid,
  text,
  text,
  jsonb
) security definer;
alter function record_admin_security_retention_decision(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function register_admin_security_retention_subject(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  jsonb
) security definer;
alter function register_admin_security_retention_subject(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  jsonb
) set search_path = public;

alter function discover_admin_security_retention_subjects(integer, text, jsonb) security definer;
alter function discover_admin_security_retention_subjects(integer, text, jsonb) set search_path = public;

alter function place_admin_security_legal_hold(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) security definer;
alter function place_admin_security_legal_hold(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function release_admin_security_legal_hold(uuid, uuid, text, text, jsonb) security definer;
alter function release_admin_security_legal_hold(uuid, uuid, text, text, jsonb) set search_path = public;

alter function run_admin_security_retention_lifecycle_job(integer, text, jsonb) security definer;
alter function run_admin_security_retention_lifecycle_job(integer, text, jsonb) set search_path = public;

alter function execute_admin_security_retention_deletion(
  uuid,
  uuid,
  text,
  uuid,
  text,
  jsonb
) security definer;
alter function execute_admin_security_retention_deletion(
  uuid,
  uuid,
  text,
  uuid,
  text,
  jsonb
) set search_path = public;

-- 10) Error taxonomy patches.
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
    'RETENTION_SUBJECT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Retention subject not found.',
    'Retention subject not found.',
    'platform'
  ),
  (
    'RETENTION_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Retention action is not allowed from the current state.',
    'Retention invalid state.',
    'platform'
  ),
  (
    'RETENTION_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Retention action requires complete fields.',
    'Retention required fields missing.',
    'platform'
  ),
  (
    'LEGAL_HOLD_ACTIVE',
    'permission',
    'critical',
    409,
    false,
    true,
    'This artifact is under legal hold and cannot be deleted.',
    'Retention deletion blocked by active legal hold.',
    'platform'
  ),
  (
    'LEGAL_HOLD_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Legal hold not found.',
    'Legal hold not found.',
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
  ('retention subject not found', 'RETENTION_SUBJECT_NOT_FOUND', 5, '{}'),
  ('retention policy not found', 'RETENTION_INVALID_STATE', 5, '{}'),
  ('retention subject source id is required', 'RETENTION_REQUIRED_FIELDS', 5, '{}'),
  ('retention subject title is required', 'RETENTION_REQUIRED_FIELDS', 5, '{}'),
  ('retention decision reason is required', 'RETENTION_REQUIRED_FIELDS', 5, '{}'),
  ('retention deletion reason is required', 'RETENTION_REQUIRED_FIELDS', 5, '{}'),
  ('batch size must be between 1 and 5000', 'RETENTION_REQUIRED_FIELDS', 5, '{}'),
  ('retention subject is not deletion eligible', 'RETENTION_INVALID_STATE', 5, '{}'),
  ('cannot delete retention subject under legal hold', 'LEGAL_HOLD_ACTIVE', 5, '{}'),
  ('legal hold not found', 'LEGAL_HOLD_NOT_FOUND', 5, '{}'),
  ('legal hold reason is required', 'RETENTION_REQUIRED_FIELDS', 5, '{}'),
  ('legal hold release reason is required', 'RETENTION_REQUIRED_FIELDS', 5, '{}'),
  ('legal hold cannot be released from status', 'RETENTION_INVALID_STATE', 5, '{}')
on conflict do nothing;
