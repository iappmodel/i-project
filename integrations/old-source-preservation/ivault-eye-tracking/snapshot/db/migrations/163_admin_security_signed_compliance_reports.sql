-- Step 9.48 — Build signed compliance report generator.
-- Runs after 162_admin_security_audit_period_export_bundle.sql.

create table if not exists admin_security_compliance_report_requests (
  id uuid primary key default gen_random_uuid(),

  report_key text not null unique,

  audit_period_id uuid not null
    references admin_security_audit_periods(id)
    on delete cascade,

  audit_period_export_request_id uuid
    references admin_security_audit_period_export_requests(id)
    on delete set null,

  status text not null default 'draft',

  report_type text not null,
  report_format text not null default 'markdown',

  report_title text not null,
  report_audience text not null default 'internal',

  requested_by_auth_user_id uuid not null,
  requested_by_admin_user_id uuid references admin_users(id),

  requested_for_auditor_id uuid references admin_security_auditors(id),

  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id),
  approved_at timestamptz,
  approval_note text,

  claimed_by_worker_id text,
  claimed_at timestamptz,

  generated_at timestamptz,
  generated_by_worker_id text,

  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,

  signature_algorithm text,
  signing_key_version text,
  signature text,
  signed_at timestamptz,

  watermark text not null,

  section_count integer not null default 0,
  evidence_item_count integer not null default 0,

  expires_at timestamptz,

  download_count integer not null default 0,
  last_downloaded_at timestamptz,

  last_error text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_compliance_report_requests_status_check
  check (
    status in (
      'draft',
      'pending',
      'approved',
      'generating',
      'ready',
      'failed',
      'expired',
      'revoked'
    )
  ),

  constraint admin_security_compliance_report_requests_type_check
  check (
    report_type in (
      'soc2_readiness',
      'iso27001_readiness',
      'gdpr_security_summary',
      'enterprise_security_review',
      'internal_security_review',
      'audit_period_executive_summary'
    )
  ),

  constraint admin_security_compliance_report_requests_format_check
  check (
    report_format in (
      'json',
      'markdown',
      'pdf'
    )
  ),

  constraint admin_security_compliance_report_requests_audience_check
  check (
    report_audience in (
      'internal',
      'external_auditor',
      'enterprise_customer',
      'regulator',
      'board'
    )
  ),

  constraint admin_security_compliance_report_requests_title_check
  check (length(trim(report_title)) > 0)
);

create index if not exists admin_security_compliance_report_requests_period_idx
on admin_security_compliance_report_requests (audit_period_id, created_at desc);

create index if not exists admin_security_compliance_report_requests_status_idx
on admin_security_compliance_report_requests (status, created_at asc);

create index if not exists admin_security_compliance_report_requests_auditor_idx
on admin_security_compliance_report_requests (requested_for_auditor_id, created_at desc);

drop trigger if exists admin_security_compliance_report_requests_set_updated_at
on admin_security_compliance_report_requests;

create trigger admin_security_compliance_report_requests_set_updated_at
before update on admin_security_compliance_report_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_compliance_report_sections (
  id uuid primary key default gen_random_uuid(),

  compliance_report_request_id uuid not null
    references admin_security_compliance_report_requests(id)
    on delete cascade,

  audit_period_id uuid not null
    references admin_security_audit_periods(id)
    on delete cascade,

  section_key text not null,
  section_order integer not null default 0,

  section_type text not null,

  title text not null,
  body_markdown text not null,

  severity text not null default 'medium',

  finding_status text not null default 'informational',

  evidence_summary jsonb not null default '{}'::jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (compliance_report_request_id, section_key),

  constraint admin_security_compliance_report_sections_type_check
  check (
    section_type in (
      'executive_summary',
      'scope',
      'control_coverage',
      'evidence_summary',
      'findings',
      'exceptions',
      'audit_hash',
      'auditor_access',
      'exports',
      'recommendations',
      'appendix'
    )
  ),

  constraint admin_security_compliance_report_sections_severity_check
  check (
    severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_compliance_report_sections_finding_check
  check (
    finding_status in (
      'informational',
      'pass',
      'warning',
      'gap',
      'critical_gap',
      'not_applicable'
    )
  )
);

create index if not exists admin_security_compliance_report_sections_report_idx
on admin_security_compliance_report_sections (
  compliance_report_request_id,
  section_order
);

create table if not exists admin_security_compliance_report_evidence_items (
  id uuid primary key default gen_random_uuid(),

  compliance_report_request_id uuid not null
    references admin_security_compliance_report_requests(id)
    on delete cascade,

  audit_period_id uuid not null
    references admin_security_audit_periods(id)
    on delete cascade,

  audit_period_snapshot_item_id uuid
    references admin_security_audit_period_snapshot_items(id)
    on delete set null,

  audit_period_export_item_id uuid
    references admin_security_audit_period_export_items(id)
    on delete set null,

  evidence_ref text not null,

  evidence_type text not null,
  source_type text not null,
  source_id uuid,

  framework_key text,
  control_key text,
  policy_key text,
  evidence_key text,

  redaction_level text not null default 'auditor_safe',

  payload_checksum_sha256 text,
  included_in_report boolean not null default true,

  summary text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique (compliance_report_request_id, evidence_ref),

  constraint admin_security_compliance_report_evidence_items_type_check
  check (
    evidence_type in (
      'control_coverage',
      'control_evidence',
      'policy',
      'policy_change',
      'simulation',
      'auditor_access',
      'export',
      'audit_hash',
      'retention',
      'legal_hold',
      'summary'
    )
  ),

  constraint admin_security_compliance_report_evidence_items_redaction_check
  check (
    redaction_level in (
      'none',
      'auditor_safe',
      'metadata_redacted',
      'secret_redacted',
      'fully_redacted'
    )
  )
);

create index if not exists admin_security_compliance_report_evidence_report_idx
on admin_security_compliance_report_evidence_items (
  compliance_report_request_id,
  evidence_type
);

create index if not exists admin_security_compliance_report_evidence_control_idx
on admin_security_compliance_report_evidence_items (
  framework_key,
  control_key
);

create table if not exists admin_security_compliance_report_signing_keys (
  id uuid primary key default gen_random_uuid(),

  key_version text not null unique,
  status text not null default 'active',

  algorithm text not null default 'HMAC-SHA256',

  description text not null,

  activated_at timestamptz not null default now(),
  retired_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_compliance_report_signing_keys_status_check
  check (
    status in (
      'active',
      'retired',
      'revoked'
    )
  ),

  constraint admin_security_compliance_report_signing_keys_algorithm_check
  check (
    algorithm in (
      'HMAC-SHA256',
      'ED25519',
      'RSA-PSS-SHA256'
    )
  )
);

create index if not exists admin_security_compliance_report_signing_keys_status_idx
on admin_security_compliance_report_signing_keys (status, activated_at desc);

drop trigger if exists admin_security_compliance_report_signing_keys_set_updated_at
on admin_security_compliance_report_signing_keys;

create trigger admin_security_compliance_report_signing_keys_set_updated_at
before update on admin_security_compliance_report_signing_keys
for each row
execute function set_updated_at();

insert into admin_security_compliance_report_signing_keys (
  key_version,
  status,
  algorithm,
  description,
  metadata
)
values (
  'compliance-report-signing-v1',
  'active',
  'HMAC-SHA256',
  'MVP compliance report signing key metadata. Secret material is stored outside the database.',
  '{"secret_location": "COMPLIANCE_REPORT_SIGNING_SECRET"}'::jsonb
)
on conflict (key_version)
do update set
  status = excluded.status,
  algorithm = excluded.algorithm,
  description = excluded.description,
  metadata = admin_security_compliance_report_signing_keys.metadata || excluded.metadata,
  updated_at = now();

create or replace function request_admin_security_compliance_report(
  p_admin_auth_user_id uuid,
  p_audit_period_id uuid,
  p_audit_period_export_request_id uuid default null,
  p_report_type text default 'audit_period_executive_summary',
  p_report_format text default 'markdown',
  p_report_title text default null,
  p_report_audience text default 'internal',
  p_requested_for_auditor_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_period admin_security_audit_periods%rowtype;
  v_export admin_security_audit_period_export_requests%rowtype;
  v_auditor admin_security_auditors%rowtype;
  v_report_id uuid;
  v_report_key text;
  v_title text;
  v_watermark text;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.read') is not true then
    raise exception 'missing required permission: admin.read';
  end if;

  select *
  into v_period
  from admin_security_audit_periods
  where id = p_audit_period_id;

  if v_period.id is null then
    raise exception 'audit period not found: %', p_audit_period_id;
  end if;

  if v_period.status <> 'sealed' then
    raise exception 'compliance report requires sealed audit period';
  end if;

  if p_audit_period_export_request_id is not null then
    select *
    into v_export
    from admin_security_audit_period_export_requests
    where id = p_audit_period_export_request_id;

    if v_export.id is null then
      raise exception 'audit period export request not found: %', p_audit_period_export_request_id;
    end if;

    if v_export.audit_period_id <> v_period.id then
      raise exception 'compliance report export does not belong to audit period';
    end if;

    if v_export.status <> 'ready' then
      raise exception 'compliance report requires ready audit period export';
    end if;
  end if;

  if p_report_type not in (
    'soc2_readiness',
    'iso27001_readiness',
    'gdpr_security_summary',
    'enterprise_security_review',
    'internal_security_review',
    'audit_period_executive_summary'
  ) then
    raise exception 'invalid compliance report type: %', p_report_type;
  end if;

  if p_report_format not in ('json', 'markdown', 'pdf') then
    raise exception 'invalid compliance report format: %', p_report_format;
  end if;

  if p_report_audience not in (
    'internal',
    'external_auditor',
    'enterprise_customer',
    'regulator',
    'board'
  ) then
    raise exception 'invalid compliance report audience: %', p_report_audience;
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  if p_requested_for_auditor_id is not null then
    select *
    into v_auditor
    from admin_security_auditors
    where id = p_requested_for_auditor_id;

    if v_auditor.id is null then
      raise exception 'auditor not found: %', p_requested_for_auditor_id;
    end if;
  end if;

  v_title := coalesce(
    p_report_title,
    v_period.period_name || ' Compliance Report'
  );

  v_report_key :=
    'compliance_report:' ||
    v_period.period_key || ':' ||
    p_report_type || ':' ||
    extract(epoch from now())::bigint::text;

  v_watermark :=
    'COMPLIANCE_REPORT=' || v_report_key ||
    ';AUDIT_PERIOD=' || v_period.period_key ||
    ';PERIOD_SEAL=' || coalesce(v_period.seal_checksum_sha256, 'none') ||
    case
      when v_auditor.id is not null then
        ';AUDITOR=' || v_auditor.email || ';ORG=' || v_auditor.organization_name
      else
        ';REQUESTED_BY_ADMIN=' || p_admin_auth_user_id::text
    end;

  insert into admin_security_compliance_report_requests (
    report_key,
    audit_period_id,
    audit_period_export_request_id,
    status,
    report_type,
    report_format,
    report_title,
    report_audience,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    requested_for_auditor_id,
    watermark,
    request_id,
    metadata
  )
  values (
    v_report_key,
    v_period.id,
    p_audit_period_export_request_id,
    'pending',
    p_report_type,
    p_report_format,
    v_title,
    p_report_audience,
    p_admin_auth_user_id,
    v_admin.id,
    p_requested_for_auditor_id,
    v_watermark,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_report_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'request_admin_security_compliance_report',
    'admin.read',
    'admin_security_compliance_report_request',
    v_report_id,
    p_request_id,
    null,
    null,
    'allowed',
    'compliance report requested',
    p_metadata || jsonb_build_object(
      'audit_period_id',
      v_period.id,
      'period_key',
      v_period.period_key,
      'report_type',
      p_report_type,
      'report_format',
      p_report_format,
      'report_audience',
      p_report_audience
    )
  );

  return v_report_id;
end;
$$;

create or replace function approve_admin_security_compliance_report(
  p_admin_auth_user_id uuid,
  p_compliance_report_request_id uuid,
  p_approval_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_report admin_security_compliance_report_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_approval_note is null or length(trim(p_approval_note)) = 0 then
    raise exception 'compliance report approval note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  if v_report.status <> 'pending' then
    raise exception 'compliance report cannot be approved from status: %', v_report.status;
  end if;

  update admin_security_compliance_report_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_admin_auth_user_id,
    approved_by_admin_user_id = v_admin.id,
    approved_at = now(),
    approval_note = p_approval_note,
    metadata = metadata || p_metadata || jsonb_build_object(
      'approval_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_report.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_security_compliance_report',
    'admin.write',
    'admin_security_compliance_report_request',
    v_report.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_approval_note,
    p_metadata
  );

  return v_report.id;
end;
$$;

create or replace function claim_admin_security_compliance_reports(
  p_batch_size integer default 5,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  compliance_report_request_id uuid,
  report_key text,
  audit_period_id uuid,
  period_key text,
  period_name text,
  audit_type text,
  period_start timestamptz,
  period_end timestamptz,
  seal_checksum_sha256 text,
  audit_period_export_request_id uuid,
  report_type text,
  report_format text,
  report_title text,
  report_audience text,
  watermark text,
  signing_key_version text,
  signature_algorithm text
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 25 then
    raise exception 'batch size must be between 1 and 25';
  end if;

  return query
  with active_key as (
    select key_version, algorithm
    from admin_security_compliance_report_signing_keys
    where status = 'active'
    order by activated_at desc
    limit 1
  ),
  candidates as (
    select r.id
    from admin_security_compliance_report_requests r
    join admin_security_audit_periods p
      on p.id = r.audit_period_id
    where r.status in ('approved', 'failed')
      and p.status = 'sealed'
      and (
        r.status = 'approved'
        or (
          r.status = 'failed'
          and r.created_at >= now() - interval '7 days'
        )
      )
    order by r.approved_at asc nulls last, r.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_compliance_report_requests r
    set
      status = 'generating',
      claimed_by_worker_id = p_worker_id,
      claimed_at = now(),
      last_error = null,
      signing_key_version = (select key_version from active_key),
      signature_algorithm = (select algorithm from active_key),
      metadata = r.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from candidates
    where r.id = candidates.id
    returning r.*
  )
  select
    u.id,
    u.report_key,
    p.id,
    p.period_key,
    p.period_name,
    p.audit_type,
    p.period_start,
    p.period_end,
    p.seal_checksum_sha256,
    u.audit_period_export_request_id,
    u.report_type,
    u.report_format,
    u.report_title,
    u.report_audience,
    u.watermark,
    u.signing_key_version,
    u.signature_algorithm
  from updated u
  join admin_security_audit_periods p
    on p.id = u.audit_period_id;
end;
$$;

create or replace function build_admin_security_compliance_report_content(
  p_compliance_report_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
  v_period admin_security_audit_periods%rowtype;

  v_control_count integer := 0;
  v_covered_control_count integer := 0;
  v_gap_control_count integer := 0;

  v_snapshot_count integer := 0;
  v_snapshot_item_count integer := 0;
  v_hash_count integer := 0;
  v_export_count integer := 0;
  v_auditor_count integer := 0;

  v_section_count integer := 0;
  v_evidence_count integer := 0;

  v_summary_status text := 'pass';
begin
  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  select *
  into v_period
  from admin_security_audit_periods
  where id = v_report.audit_period_id;

  if v_period.id is null then
    raise exception 'audit period not found: %', v_report.audit_period_id;
  end if;

  if v_period.status <> 'sealed' then
    raise exception 'compliance report requires sealed audit period';
  end if;

  delete from admin_security_compliance_report_sections
  where compliance_report_request_id = v_report.id;

  delete from admin_security_compliance_report_evidence_items
  where compliance_report_request_id = v_report.id;

  select count(*)
  into v_snapshot_count
  from admin_security_audit_period_snapshots
  where audit_period_id = v_period.id
    and status = 'sealed';

  select count(*)
  into v_snapshot_item_count
  from admin_security_audit_period_snapshot_items
  where audit_period_id = v_period.id;

  select count(*)
  into v_control_count
  from admin_security_audit_period_snapshot_items
  where audit_period_id = v_period.id
    and item_type = 'control_coverage';

  select count(*)
  into v_covered_control_count
  from admin_security_audit_period_snapshot_items
  where audit_period_id = v_period.id
    and item_type = 'control_coverage'
    and payload->>'coverage_status' = 'covered';

  select count(*)
  into v_gap_control_count
  from admin_security_audit_period_snapshot_items
  where audit_period_id = v_period.id
    and item_type = 'control_coverage'
    and coalesce(payload->>'coverage_status', '') <> 'covered';

  select count(*)
  into v_hash_count
  from admin_security_audit_period_snapshot_items
  where audit_period_id = v_period.id
    and item_type = 'audit_hash_entry';

  select count(*)
  into v_export_count
  from admin_security_audit_period_export_requests
  where audit_period_id = v_period.id
    and status in ('ready', 'expired');

  select count(*)
  into v_auditor_count
  from admin_security_audit_period_snapshot_items
  where audit_period_id = v_period.id
    and item_type in ('auditor', 'auditor_grant');

  if v_gap_control_count > 0 then
    v_summary_status := 'warning';
  end if;

  insert into admin_security_compliance_report_sections (
    compliance_report_request_id,
    audit_period_id,
    section_key,
    section_order,
    section_type,
    title,
    body_markdown,
    severity,
    finding_status,
    evidence_summary,
    metadata
  )
  values (
    v_report.id,
    v_period.id,
    'executive_summary',
    10,
    'executive_summary',
    'Executive Summary',
    'This report was generated from sealed audit-period evidence only.' || E'\n\n' ||
    '- Audit period: **' || v_period.period_name || '**' || E'\n' ||
    '- Audit type: **' || v_period.audit_type || '**' || E'\n' ||
    '- Period: **' || v_period.period_start || ' → ' || v_period.period_end || '**' || E'\n' ||
    '- Seal checksum: `' || coalesce(v_period.seal_checksum_sha256, 'missing') || '`' || E'\n' ||
    '- Sealed snapshots: **' || v_snapshot_count || '**' || E'\n' ||
    '- Frozen evidence items: **' || v_snapshot_item_count || '**' || E'\n' ||
    '- Covered controls: **' || v_covered_control_count || '/' || greatest(v_control_count, 1) || '**' || E'\n' ||
    '- Control gaps: **' || v_gap_control_count || '**',
    case when v_gap_control_count > 0 then 'high' else 'medium' end,
    v_summary_status,
    jsonb_build_object(
      'snapshot_count', v_snapshot_count,
      'snapshot_item_count', v_snapshot_item_count,
      'control_count', v_control_count,
      'covered_control_count', v_covered_control_count,
      'gap_control_count', v_gap_control_count
    ),
    p_metadata
  );

  insert into admin_security_compliance_report_sections (
    compliance_report_request_id,
    audit_period_id,
    section_key,
    section_order,
    section_type,
    title,
    body_markdown,
    severity,
    finding_status,
    evidence_summary,
    metadata
  )
  values (
    v_report.id,
    v_period.id,
    'scope',
    20,
    'scope',
    'Scope and Source of Truth',
    'The source of truth for this report is the sealed audit period and its sealed snapshots.' || E'\n\n' ||
    'The report does not use live mutable operational records directly. It references frozen snapshot items and their checksums.',
    'medium',
    'informational',
    jsonb_build_object(
      'period_key', v_period.period_key,
      'audit_type', v_period.audit_type,
      'seal_checksum_sha256', v_period.seal_checksum_sha256
    ),
    p_metadata
  );

  insert into admin_security_compliance_report_sections (
    compliance_report_request_id,
    audit_period_id,
    section_key,
    section_order,
    section_type,
    title,
    body_markdown,
    severity,
    finding_status,
    evidence_summary,
    metadata
  )
  values (
    v_report.id,
    v_period.id,
    'control_coverage',
    30,
    'control_coverage',
    'Control Coverage',
    'Control coverage was evaluated from frozen control coverage snapshot items.' || E'\n\n' ||
    '- Total controls in snapshot: **' || v_control_count || '**' || E'\n' ||
    '- Covered controls: **' || v_covered_control_count || '**' || E'\n' ||
    '- Controls with gaps: **' || v_gap_control_count || '**',
    case when v_gap_control_count > 0 then 'high' else 'medium' end,
    case when v_gap_control_count > 0 then 'gap' else 'pass' end,
    jsonb_build_object(
      'control_count', v_control_count,
      'covered_control_count', v_covered_control_count,
      'gap_control_count', v_gap_control_count
    ),
    p_metadata
  );

  insert into admin_security_compliance_report_sections (
    compliance_report_request_id,
    audit_period_id,
    section_key,
    section_order,
    section_type,
    title,
    body_markdown,
    severity,
    finding_status,
    evidence_summary,
    metadata
  )
  values (
    v_report.id,
    v_period.id,
    'evidence_summary',
    40,
    'evidence_summary',
    'Evidence Summary',
    'The sealed period contains **' || v_snapshot_item_count || '** frozen evidence items across **' || v_snapshot_count || '** sealed snapshots.' || E'\n\n' ||
    'Evidence categories include controls, policies, policy changes, simulations, auditor access, exports, audit hash entries, retention/archive/deletion records, and legal holds when present.',
    'medium',
    'informational',
    jsonb_build_object(
      'snapshot_count', v_snapshot_count,
      'snapshot_item_count', v_snapshot_item_count
    ),
    p_metadata
  );

  insert into admin_security_compliance_report_sections (
    compliance_report_request_id,
    audit_period_id,
    section_key,
    section_order,
    section_type,
    title,
    body_markdown,
    severity,
    finding_status,
    evidence_summary,
    metadata
  )
  values (
    v_report.id,
    v_period.id,
    'audit_hash',
    50,
    'audit_hash',
    'Audit Hash Chain',
    'The sealed audit period references tamper-evident audit hash records.' || E'\n\n' ||
    '- Hash entries in period snapshot: **' || v_hash_count || '**' || E'\n' ||
    '- Period seal checksum: `' || coalesce(v_period.seal_checksum_sha256, 'missing') || '`',
    case when v_hash_count = 0 then 'high' else 'medium' end,
    case when v_hash_count = 0 then 'warning' else 'pass' end,
    jsonb_build_object(
      'hash_entry_count', v_hash_count,
      'seal_checksum_sha256', v_period.seal_checksum_sha256
    ),
    p_metadata
  );

  insert into admin_security_compliance_report_sections (
    compliance_report_request_id,
    audit_period_id,
    section_key,
    section_order,
    section_type,
    title,
    body_markdown,
    severity,
    finding_status,
    evidence_summary,
    metadata
  )
  values (
    v_report.id,
    v_period.id,
    'auditor_access_exports',
    60,
    'auditor_access',
    'Auditor Access and Evidence Exports',
    'Auditor access and export activity are included when present in sealed snapshots.' || E'\n\n' ||
    '- Auditor access/grant records: **' || v_auditor_count || '**' || E'\n' ||
    '- Audit-period export records: **' || v_export_count || '**',
    'medium',
    'informational',
    jsonb_build_object(
      'auditor_item_count', v_auditor_count,
      'export_count', v_export_count
    ),
    p_metadata
  );

  insert into admin_security_compliance_report_sections (
    compliance_report_request_id,
    audit_period_id,
    section_key,
    section_order,
    section_type,
    title,
    body_markdown,
    severity,
    finding_status,
    evidence_summary,
    metadata
  )
  values (
    v_report.id,
    v_period.id,
    'recommendations',
    70,
    'recommendations',
    'Recommendations',
    case
      when v_gap_control_count > 0 then
        'Resolve control coverage gaps before relying on this period as strong external compliance evidence.' || E'\n\n' ||
        'Priority: map missing controls to policies, evidence mappings, and fresh evidence runs.'
      else
        'No control coverage gaps were identified in the sealed control coverage snapshot. Continue periodic evidence collection, snapshot sealing, and audit hash verification.'
    end,
    case when v_gap_control_count > 0 then 'high' else 'low' end,
    case when v_gap_control_count > 0 then 'warning' else 'pass' end,
    jsonb_build_object(
      'gap_control_count', v_gap_control_count
    ),
    p_metadata
  );

  insert into admin_security_compliance_report_evidence_items (
    compliance_report_request_id,
    audit_period_id,
    audit_period_snapshot_item_id,
    evidence_ref,
    evidence_type,
    source_type,
    source_id,
    framework_key,
    control_key,
    policy_key,
    evidence_key,
    redaction_level,
    payload_checksum_sha256,
    included_in_report,
    summary,
    metadata
  )
  select
    v_report.id,
    v_period.id,
    i.id,
    'EVID-' || row_number() over (order by i.item_type, i.created_at, i.id)::text,
    case
      when i.item_type = 'control_coverage' then 'control_coverage'
      when i.item_type = 'control_evidence' then 'control_evidence'
      when i.item_type in ('governance_policy', 'governance_rule') then 'policy'
      when i.item_type in ('policy_change', 'policy_change_review') then 'policy_change'
      when i.item_type = 'policy_simulation' then 'simulation'
      when i.item_type in ('auditor', 'auditor_grant') then 'auditor_access'
      when i.item_type in ('auditor_export', 'auditor_export_item') then 'export'
      when i.item_type = 'audit_hash_entry' then 'audit_hash'
      when i.item_type in ('retention_policy', 'archive_manifest', 'archive_verification', 'deletion_request') then 'retention'
      when i.item_type in ('legal_hold', 'legal_hold_target') then 'legal_hold'
      else 'summary'
    end,
    i.source_type,
    i.source_id,
    i.framework_key,
    i.control_key,
    i.policy_key,
    i.evidence_key,
    i.redaction_level,
    i.payload_checksum_sha256,
    true,
    coalesce(i.item_type, 'evidence') ||
      case when i.framework_key is not null then ' / ' || i.framework_key else '' end ||
      case when i.control_key is not null then ' / ' || i.control_key else '' end ||
      case when i.policy_key is not null then ' / ' || i.policy_key else '' end,
    p_metadata
  from admin_security_audit_period_snapshot_items i
  where i.audit_period_id = v_period.id
  order by i.item_type, i.created_at, i.id;

  select count(*)
  into v_section_count
  from admin_security_compliance_report_sections
  where compliance_report_request_id = v_report.id;

  select count(*)
  into v_evidence_count
  from admin_security_compliance_report_evidence_items
  where compliance_report_request_id = v_report.id;

  update admin_security_compliance_report_requests
  set
    section_count = v_section_count,
    evidence_item_count = v_evidence_count,
    metadata = metadata || jsonb_build_object(
      'content_built_at',
      now(),
      'section_count',
      v_section_count,
      'evidence_item_count',
      v_evidence_count,
      'summary_status',
      v_summary_status
    ),
    updated_at = now()
  where id = v_report.id;

  return jsonb_build_object(
    'section_count', v_section_count,
    'evidence_item_count', v_evidence_count,
    'summary_status', v_summary_status,
    'control_count', v_control_count,
    'covered_control_count', v_covered_control_count,
    'gap_control_count', v_gap_control_count
  );
end;
$$;

create or replace function complete_admin_security_compliance_report(
  p_compliance_report_request_id uuid,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_signature text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
begin
  if p_storage_uri is null or length(trim(p_storage_uri)) = 0 then
    raise exception 'compliance report storage uri is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'compliance report checksum is required';
  end if;

  if p_signature is null or length(trim(p_signature)) = 0 then
    raise exception 'compliance report signature is required';
  end if;

  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  if v_report.status <> 'generating' then
    raise exception 'compliance report cannot be completed from status: %', v_report.status;
  end if;

  update admin_security_compliance_report_requests
  set
    status = 'ready',
    generated_at = now(),
    generated_by_worker_id = p_worker_id,
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    payload_bytes = p_payload_bytes,
    signature = p_signature,
    signed_at = now(),
    expires_at = now() + interval '90 days',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_report.id;

  perform create_admin_security_alert(
    'admin_security_compliance_report_ready',
    'medium',
    null,
    v_report.requested_by_auth_user_id,
    'complete_admin_security_compliance_report',
    null,
    'Signed compliance report is ready.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'compliance_report_request_id',
      v_report.id,
      'report_key',
      v_report.report_key,
      'expires_at',
      now() + interval '90 days'
    )
  );

  return v_report.id;
end;
$$;

create or replace function fail_admin_security_compliance_report(
  p_compliance_report_request_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'compliance report error is required';
  end if;

  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  update admin_security_compliance_report_requests
  set
    status = 'failed',
    last_error = p_error,
    generated_by_worker_id = p_worker_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'failed_at',
      now(),
      'failed_by_worker_id',
      p_worker_id
    ),
    updated_at = now()
  where id = v_report.id;

  perform create_admin_security_alert(
    'admin_security_compliance_report_failed',
    'high',
    null,
    v_report.requested_by_auth_user_id,
    'fail_admin_security_compliance_report',
    null,
    'Compliance report generation failed.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'compliance_report_request_id',
      v_report.id,
      'error',
      p_error
    )
  );

  return v_report.id;
end;
$$;

create or replace function register_admin_security_compliance_report_download(
  p_auth_user_id uuid,
  p_compliance_report_request_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  compliance_report_request_id uuid,
  report_key text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  signature_algorithm text,
  signing_key_version text,
  signature text,
  watermark text,
  expires_at timestamptz
)
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
  v_is_admin boolean := false;
  v_is_auditor_allowed boolean := false;
  v_auditor admin_security_auditors%rowtype;
begin
  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id
  for update;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  v_is_admin := admin_has_permission(p_auth_user_id, 'admin.read') is true;

  begin
    v_auditor := get_active_admin_security_auditor(p_auth_user_id);
    v_is_auditor_allowed := v_report.requested_for_auditor_id = v_auditor.id;
  exception
    when others then
      v_is_auditor_allowed := false;
  end;

  if v_is_admin is not true and v_is_auditor_allowed is not true then
    raise exception 'compliance report download not allowed';
  end if;

  if v_report.status <> 'ready' then
    raise exception 'compliance report is not ready: %', v_report.status;
  end if;

  if v_report.signature is null or length(trim(v_report.signature)) = 0 then
    raise exception 'compliance report signature is required';
  end if;

  if v_report.expires_at is not null and v_report.expires_at <= now() then
    raise exception 'compliance report has expired';
  end if;

  update admin_security_compliance_report_requests
  set
    download_count = download_count + 1,
    last_downloaded_at = now(),
    metadata = metadata || jsonb_build_object(
      'last_download_request_id',
      p_request_id,
      'last_download_auth_user_id',
      p_auth_user_id
    ),
    updated_at = now()
  where id = v_report.id;

  if v_is_admin then
    perform record_admin_action(
      p_auth_user_id,
      'register_admin_security_compliance_report_download',
      'admin.read',
      'admin_security_compliance_report_request',
      v_report.id,
      p_request_id,
      null,
      null,
      'allowed',
      'compliance report downloaded',
      p_metadata
    );
  else
    perform record_admin_security_auditor_access_event(
      p_auth_user_id,
      'auditor_compliance_report_downloaded',
      'high',
      'register_admin_security_compliance_report_download',
      'admin_security_compliance_report_request',
      v_report.id,
      true,
      'auditor downloaded compliance report',
      p_request_id,
      p_metadata
    );
  end if;

  return query
  select
    v_report.id,
    v_report.report_key,
    v_report.storage_uri,
    v_report.checksum_sha256,
    v_report.payload_bytes,
    v_report.signature_algorithm,
    v_report.signing_key_version,
    v_report.signature,
    v_report.watermark,
    v_report.expires_at;
end;
$$;

create or replace function expire_admin_security_compliance_reports(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_report record;
begin
  for v_report in
    select *
    from admin_security_compliance_report_requests
    where status = 'ready'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_compliance_report_requests
    set
      status = 'expired',
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_at',
        now(),
        'expire_run_id',
        v_run_id
      ),
      updated_at = now()
    where id = v_report.id;
  end loop;

  return v_run_id;
end;
$$;

create or replace view admin_security_compliance_report_dashboard as
select
  r.id as admin_security_compliance_report_request_id,
  r.report_key,

  r.audit_period_id,
  p.period_key,
  p.period_name,
  p.audit_type,
  p.status as audit_period_status,
  p.seal_checksum_sha256,

  r.audit_period_export_request_id,
  ape.export_key as audit_period_export_key,
  ape.checksum_sha256 as audit_period_export_checksum_sha256,

  r.status,
  r.report_type,
  r.report_format,
  r.report_title,
  r.report_audience,

  r.requested_by_auth_user_id,
  requester.email as requested_by_email,

  r.requested_for_auditor_id,
  auditor.email as auditor_email,
  auditor.organization_name as auditor_organization_name,

  r.approved_by_auth_user_id,
  approver.email as approved_by_email,
  r.approved_at,
  r.approval_note,

  r.claimed_by_worker_id,
  r.claimed_at,

  r.generated_at,
  r.generated_by_worker_id,

  r.storage_uri,
  r.checksum_sha256,
  r.payload_bytes,

  r.signature_algorithm,
  r.signing_key_version,
  r.signature,
  r.signed_at,

  r.watermark,

  r.section_count,
  r.evidence_item_count,

  r.expires_at,
  r.download_count,
  r.last_downloaded_at,

  r.last_error,

  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_compliance_report_requests r
join admin_security_audit_periods p
  on p.id = r.audit_period_id
left join admin_security_audit_period_export_requests ape
  on ape.id = r.audit_period_export_request_id
left join admin_users requester
  on requester.id = r.requested_by_admin_user_id
left join admin_users approver
  on approver.id = r.approved_by_admin_user_id
left join admin_security_auditors auditor
  on auditor.id = r.requested_for_auditor_id
order by r.created_at desc;

create or replace view admin_security_compliance_report_section_dashboard as
select
  s.id as admin_security_compliance_report_section_id,
  s.compliance_report_request_id,

  r.report_key,
  r.status as report_status,
  r.report_type,

  s.audit_period_id,
  p.period_key,

  s.section_key,
  s.section_order,
  s.section_type,
  s.title,
  s.severity,
  s.finding_status,
  s.evidence_summary,

  s.created_at,
  s.metadata
from admin_security_compliance_report_sections s
join admin_security_compliance_report_requests r
  on r.id = s.compliance_report_request_id
join admin_security_audit_periods p
  on p.id = s.audit_period_id
order by s.section_order asc, s.created_at asc;

create or replace view admin_security_compliance_report_evidence_dashboard as
select
  e.id as admin_security_compliance_report_evidence_item_id,
  e.compliance_report_request_id,

  r.report_key,
  r.status as report_status,
  r.report_type,

  e.audit_period_id,
  p.period_key,

  e.audit_period_snapshot_item_id,
  e.audit_period_export_item_id,

  e.evidence_ref,
  e.evidence_type,
  e.source_type,
  e.source_id,

  e.framework_key,
  e.control_key,
  e.policy_key,
  e.evidence_key,

  e.redaction_level,
  e.payload_checksum_sha256,
  e.included_in_report,
  e.summary,

  e.created_at,
  e.metadata
from admin_security_compliance_report_evidence_items e
join admin_security_compliance_report_requests r
  on r.id = e.compliance_report_request_id
join admin_security_audit_periods p
  on p.id = e.audit_period_id
order by e.evidence_ref asc;

create or replace view admin_security_compliance_report_integrity as
select
  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'pending'
  ) as pending_report_count,

  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'approved'
  ) as approved_report_count,

  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'generating'
  ) as generating_report_count,

  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'ready'
  ) as ready_report_count,

  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'failed'
  ) as failed_report_count,

  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'ready'
      and signature is null
  ) as ready_unsigned_report_count,

  (
    select count(*)
    from admin_security_compliance_report_requests
    where status = 'ready'
      and expires_at <= now()
  ) as expired_unprocessed_report_count,

  (
    select coalesce(sum(download_count), 0)
    from admin_security_compliance_report_requests
    where created_at >= now() - interval '30 days'
  ) as report_download_count_30d,

  now() as checked_at;

grant select on admin_security_compliance_report_dashboard to admin_api_role;
grant select on admin_security_compliance_report_section_dashboard to admin_api_role;
grant select on admin_security_compliance_report_evidence_dashboard to admin_api_role;
grant select on admin_security_compliance_report_integrity to admin_api_role;

create or replace function hash_admin_security_compliance_report(
  p_compliance_report_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_report admin_security_compliance_report_requests%rowtype;
  v_sections jsonb;
  v_evidence jsonb;
  v_payload jsonb;
begin
  select *
  into v_report
  from admin_security_compliance_report_requests
  where id = p_compliance_report_request_id;

  if v_report.id is null then
    raise exception 'compliance report request not found: %', p_compliance_report_request_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.section_order asc), '[]'::jsonb)
  into v_sections
  from admin_security_compliance_report_sections s
  where s.compliance_report_request_id = v_report.id;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.evidence_ref asc), '[]'::jsonb)
  into v_evidence
  from admin_security_compliance_report_evidence_items e
  where e.compliance_report_request_id = v_report.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_compliance_report',
    'source_id', v_report.id,
    'report_key', v_report.report_key,
    'audit_period_id', v_report.audit_period_id,
    'status', v_report.status,
    'report_type', v_report.report_type,
    'report_format', v_report.report_format,
    'report_title', v_report.report_title,
    'report_audience', v_report.report_audience,
    'checksum_sha256', v_report.checksum_sha256,
    'signature_algorithm', v_report.signature_algorithm,
    'signing_key_version', v_report.signing_key_version,
    'signature', v_report.signature,
    'signed_at', v_report.signed_at,
    'section_count', v_report.section_count,
    'evidence_item_count', v_report.evidence_item_count,
    'sections', v_sections,
    'evidence', v_evidence,
    'created_at', v_report.created_at,
    'updated_at', v_report.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_compliance_report',
    v_report.id,
    v_payload,
    'global_audit_chain',
    p_metadata
  );
end;
$$;

create or replace view audit_hash_missing_records as
select
  'wallet_ledger_entry'::text as source_type,
  wle.id as source_id,
  wle.created_at
from wallet_ledger_entries wle
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'wallet_ledger_entry'
    and ahc.source_id = wle.id
)
union all
select
  'accounting_journal_entry'::text as source_type,
  aje.id as source_id,
  aje.created_at
from accounting_journal_entries aje
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'accounting_journal_entry'
    and ahc.source_id = aje.id
)
union all
select
  'reward_issuance_group'::text as source_type,
  rig.id as source_id,
  rig.created_at
from reward_issuance_groups rig
where rig.status = 'completed'
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'reward_issuance_group'
      and ahc.source_id = rig.id
  )
union all
select
  'attention_verification_event'::text as source_type,
  ave.id as source_id,
  ave.created_at
from attention_verification_events ave
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'attention_verification_event'
    and ahc.source_id = ave.id
)
union all
select
  'withdrawal_request'::text as source_type,
  wr.id as source_id,
  wr.created_at
from withdrawal_requests wr
where wr.status in ('reserved', 'submitted', 'processing', 'paid', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'withdrawal_request'
      and ahc.source_id = wr.id
  )
union all
select
  'external_payout'::text as source_type,
  ep.id as source_id,
  ep.created_at
from external_payouts ep
where not exists (
  select 1
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'external_payout'
    and ahc.source_id = ep.id
)
union all
select
  'admin_incident_review'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_incident_reviews r
where r.status in ('closed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_review'
      and ahc.source_id = r.id
  )
union all
select
  'admin_incident_corrective_action'::text as source_type,
  ca.id as source_id,
  ca.created_at
from admin_incident_corrective_actions ca
where ca.status in ('completed', 'dismissed')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_incident_corrective_action'
      and ahc.source_id = ca.id
  )
union all
select
  'admin_security_daily_snapshot'::text as source_type,
  s.id as source_id,
  s.created_at
from admin_security_daily_snapshots s
where s.snapshot_date < current_date
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_daily_snapshot'
      and ahc.source_id = s.id
  )
union all
select
  'admin_security_report_export'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_report_exports r
where r.status in ('generated', 'exported', 'archived')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_report_export'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_compliance_report'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_compliance_report_requests r
where r.status in ('ready', 'expired', 'revoked')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_compliance_report'
      and ahc.source_id = r.id
  );

create or replace function run_audit_hash_backfill_job(
  p_batch_size integer default 1000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid;
  v_row record;
  v_scanned integer := 0;
  v_hashed integer := 0;
  v_failed integer := 0;
begin
  if p_batch_size <= 0 then
    raise exception 'batch size must be positive';
  end if;

  insert into audit_hash_backfill_runs (status, metadata)
  values ('processing', coalesce(p_metadata, '{}'::jsonb))
  returning id into v_run_id;

  for v_row in
    select *
    from audit_hash_missing_records
    order by created_at asc
    limit p_batch_size
  loop
    v_scanned := v_scanned + 1;
    begin
      if v_row.source_type = 'wallet_ledger_entry' then
        perform hash_wallet_ledger_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'accounting_journal_entry' then
        perform hash_accounting_journal_entry(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'reward_issuance_group' then
        perform hash_reward_issuance_group(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'attention_verification_event' then
        perform hash_attention_verification_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'withdrawal_request' then
        perform hash_withdrawal_request(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'external_payout' then
        perform hash_external_payout(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_review' then
        perform hash_admin_incident_review(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_incident_corrective_action' then
        perform hash_admin_incident_corrective_action(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_daily_snapshot' then
        perform hash_admin_security_daily_snapshot(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_report_export' then
        perform hash_admin_security_report_export(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_compliance_report' then
        perform hash_admin_security_compliance_report(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      end if;
      v_hashed := v_hashed + 1;
    exception
      when others then
        v_failed := v_failed + 1;
    end;
  end loop;

  update audit_hash_backfill_runs
  set
    status = 'completed',
    completed_at = now(),
    scanned_count = v_scanned,
    hashed_count = v_hashed,
    failed_count = v_failed
  where id = v_run_id;

  return v_run_id;
exception
  when others then
    if v_run_id is not null then
      update audit_hash_backfill_runs
      set
        status = 'failed',
        failed_at = now(),
        failure_reason = sqlerrm
      where id = v_run_id;
    end if;
    raise;
end;
$$;

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
values (
  'admin_security_compliance_reports_expire_hourly',
  'Expire admin security compliance reports',
  'admin',
  true,
  '17 * * * *',
  'expire_admin_security_compliance_reports',
  '{"batch_size": 500}'::jsonb,
  120,
  300,
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

  select *
  into v_job
  from scheduled_jobs
  where job_key = p_job_key;

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
  elsif v_job.function_name = 'expire_admin_sessions' then
    v_uuid_result := expire_admin_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_break_glass_requests' then
    v_uuid_result := expire_admin_break_glass_requests(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'run_admin_incident_review_creation_job' then
    v_uuid_result := run_admin_incident_review_creation_job(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'mark_overdue_admin_incident_reviews' then
    v_uuid_result := mark_overdue_admin_incident_reviews(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'mark_overdue_admin_incident_corrective_actions' then
    v_uuid_result := mark_overdue_admin_incident_corrective_actions(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'create_admin_security_daily_snapshot' then
    v_uuid_result := create_admin_security_daily_snapshot(
      current_date,
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('snapshot_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_audit_period_exports' then
    v_uuid_result := expire_admin_security_audit_period_exports(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_compliance_reports' then
    v_uuid_result := expire_admin_security_compliance_reports(
      coalesce((v_job.function_args->>'batch_size')::integer, 500),
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

alter table admin_security_compliance_report_requests enable row level security;
alter table admin_security_compliance_report_sections enable row level security;
alter table admin_security_compliance_report_evidence_items enable row level security;
alter table admin_security_compliance_report_signing_keys enable row level security;

drop policy if exists admin_security_compliance_report_requests_no_user_direct_access
on admin_security_compliance_report_requests;
create policy admin_security_compliance_report_requests_no_user_direct_access
on admin_security_compliance_report_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_compliance_report_sections_no_user_direct_access
on admin_security_compliance_report_sections;
create policy admin_security_compliance_report_sections_no_user_direct_access
on admin_security_compliance_report_sections
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_compliance_report_evidence_items_no_user_direct_access
on admin_security_compliance_report_evidence_items;
create policy admin_security_compliance_report_evidence_items_no_user_direct_access
on admin_security_compliance_report_evidence_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_compliance_report_signing_keys_no_user_direct_access
on admin_security_compliance_report_signing_keys;
create policy admin_security_compliance_report_signing_keys_no_user_direct_access
on admin_security_compliance_report_signing_keys
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_compliance_report_requests
on admin_security_compliance_report_requests;
create policy admin_api_all_admin_security_compliance_report_requests
on admin_security_compliance_report_requests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_compliance_report_sections
on admin_security_compliance_report_sections;
create policy admin_api_all_admin_security_compliance_report_sections
on admin_security_compliance_report_sections
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_compliance_report_evidence_items
on admin_security_compliance_report_evidence_items;
create policy admin_api_all_admin_security_compliance_report_evidence_items
on admin_security_compliance_report_evidence_items
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_read_admin_security_compliance_report_signing_keys
on admin_security_compliance_report_signing_keys;
create policy admin_api_read_admin_security_compliance_report_signing_keys
on admin_security_compliance_report_signing_keys
for select
to admin_api_role
using (true);

drop policy if exists worker_all_admin_security_compliance_report_requests
on admin_security_compliance_report_requests;
create policy worker_all_admin_security_compliance_report_requests
on admin_security_compliance_report_requests
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_compliance_report_sections
on admin_security_compliance_report_sections;
create policy worker_all_admin_security_compliance_report_sections
on admin_security_compliance_report_sections
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_compliance_report_evidence_items
on admin_security_compliance_report_evidence_items;
create policy worker_all_admin_security_compliance_report_evidence_items
on admin_security_compliance_report_evidence_items
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_read_admin_security_compliance_report_signing_keys
on admin_security_compliance_report_signing_keys;
create policy worker_read_admin_security_compliance_report_signing_keys
on admin_security_compliance_report_signing_keys
for select
to worker_role
using (true);

grant execute on function request_admin_security_compliance_report(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function approve_admin_security_compliance_report(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function claim_admin_security_compliance_reports(integer, text, jsonb)
to worker_role;

grant execute on function build_admin_security_compliance_report_content(uuid, jsonb)
to worker_role, admin_api_role;

grant execute on function complete_admin_security_compliance_report(
  uuid,
  text,
  text,
  bigint,
  text,
  text,
  jsonb
) to worker_role;

grant execute on function fail_admin_security_compliance_report(uuid, text, text, jsonb)
to worker_role;

grant execute on function register_admin_security_compliance_report_download(
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function expire_admin_security_compliance_reports(integer, jsonb)
to worker_role;

grant execute on function hash_admin_security_compliance_report(uuid, jsonb)
to worker_role, admin_api_role;

alter function request_admin_security_compliance_report(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) security definer;
alter function request_admin_security_compliance_report(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function approve_admin_security_compliance_report(uuid, uuid, text, text, jsonb) security definer;
alter function approve_admin_security_compliance_report(uuid, uuid, text, text, jsonb) set search_path = public;

alter function claim_admin_security_compliance_reports(integer, text, jsonb) security definer;
alter function claim_admin_security_compliance_reports(integer, text, jsonb) set search_path = public;

alter function build_admin_security_compliance_report_content(uuid, jsonb) security definer;
alter function build_admin_security_compliance_report_content(uuid, jsonb) set search_path = public;

alter function complete_admin_security_compliance_report(
  uuid,
  text,
  text,
  bigint,
  text,
  text,
  jsonb
) security definer;
alter function complete_admin_security_compliance_report(
  uuid,
  text,
  text,
  bigint,
  text,
  text,
  jsonb
) set search_path = public;

alter function fail_admin_security_compliance_report(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_compliance_report(uuid, text, text, jsonb) set search_path = public;

alter function register_admin_security_compliance_report_download(
  uuid,
  uuid,
  text,
  jsonb
) security definer;
alter function register_admin_security_compliance_report_download(
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function expire_admin_security_compliance_reports(integer, jsonb) security definer;
alter function expire_admin_security_compliance_reports(integer, jsonb) set search_path = public;

alter function hash_admin_security_compliance_report(uuid, jsonb) security definer;
alter function hash_admin_security_compliance_report(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_COMPLIANCE_REPORT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Compliance report not found.',
    'Admin security compliance report request not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_COMPLIANCE_REPORT_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Compliance report cannot move from its current state.',
    'Admin security compliance report invalid lifecycle state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_COMPLIANCE_REPORT_NOT_READY',
    'validation',
    'medium',
    409,
    false,
    true,
    'Compliance report is not ready.',
    'Compliance report download attempted before ready state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_COMPLIANCE_REPORT_EXPIRED',
    'validation',
    'medium',
    410,
    false,
    true,
    'Compliance report has expired.',
    'Compliance report download attempted after expiry.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_COMPLIANCE_REPORT_UNSIGNED',
    'validation',
    'critical',
    409,
    false,
    true,
    'Compliance report is missing signature.',
    'Ready compliance report is missing signature.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_COMPLIANCE_REPORT_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Compliance report requires complete fields.',
    'Compliance report required fields missing.',
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
  ('compliance report request not found', 'ADMIN_SECURITY_COMPLIANCE_REPORT_NOT_FOUND', 5, '{}'),
  ('compliance report requires sealed audit period', 'ADMIN_SECURITY_COMPLIANCE_REPORT_INVALID_STATE', 5, '{}'),
  ('compliance report requires ready audit period export', 'ADMIN_SECURITY_COMPLIANCE_REPORT_INVALID_STATE', 5, '{}'),
  ('compliance report export does not belong to audit period', 'ADMIN_SECURITY_COMPLIANCE_REPORT_INVALID_STATE', 5, '{}'),
  ('compliance report cannot be approved from status', 'ADMIN_SECURITY_COMPLIANCE_REPORT_INVALID_STATE', 5, '{}'),
  ('compliance report cannot be completed from status', 'ADMIN_SECURITY_COMPLIANCE_REPORT_INVALID_STATE', 5, '{}'),
  ('compliance report is not ready', 'ADMIN_SECURITY_COMPLIANCE_REPORT_NOT_READY', 5, '{}'),
  ('compliance report has expired', 'ADMIN_SECURITY_COMPLIANCE_REPORT_EXPIRED', 5, '{}'),
  ('compliance report approval note is required', 'ADMIN_SECURITY_COMPLIANCE_REPORT_REQUIRED_FIELDS', 5, '{}'),
  ('compliance report storage uri is required', 'ADMIN_SECURITY_COMPLIANCE_REPORT_REQUIRED_FIELDS', 5, '{}'),
  ('compliance report checksum is required', 'ADMIN_SECURITY_COMPLIANCE_REPORT_REQUIRED_FIELDS', 5, '{}'),
  ('compliance report signature is required', 'ADMIN_SECURITY_COMPLIANCE_REPORT_UNSIGNED', 5, '{}')
on conflict do nothing;
