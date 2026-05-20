-- Step 9.46 — Build immutable evidence snapshots per audit period.
-- Runs after 160_admin_security_auditor_export_generation_worker.sql.

create extension if not exists pgcrypto;

create table if not exists admin_security_audit_periods (
  id uuid primary key default gen_random_uuid(),

  period_key text not null unique,
  period_name text not null,

  status text not null default 'draft',

  audit_type text not null default 'internal',

  period_start timestamptz not null,
  period_end timestamptz not null,

  owner_team text not null default 'platform',

  description text not null,

  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),

  opened_at timestamptz,
  closed_at timestamptz,

  sealed_at timestamptz,
  sealed_by_auth_user_id uuid,
  sealed_by_admin_user_id uuid references admin_users(id),

  seal_checksum_sha256 text,
  snapshot_count integer not null default 0,
  item_count integer not null default 0,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_audit_periods_status_check
  check (
    status in (
      'draft',
      'open',
      'closed',
      'sealed',
      'archived',
      'cancelled'
    )
  ),

  constraint admin_security_audit_periods_type_check
  check (
    audit_type in (
      'internal',
      'soc2',
      'iso27001',
      'gdpr',
      'enterprise_review',
      'regulatory',
      'security_review'
    )
  ),

  constraint admin_security_audit_periods_period_check
  check (period_end >= period_start),

  constraint admin_security_audit_periods_name_check
  check (length(trim(period_name)) > 0),

  constraint admin_security_audit_periods_description_check
  check (length(trim(description)) > 0)
);

create index if not exists admin_security_audit_periods_status_idx
on admin_security_audit_periods (status, period_start desc, period_end desc);

create index if not exists admin_security_audit_periods_type_idx
on admin_security_audit_periods (audit_type, status);

drop trigger if exists admin_security_audit_periods_set_updated_at
on admin_security_audit_periods;

create trigger admin_security_audit_periods_set_updated_at
before update on admin_security_audit_periods
for each row
execute function set_updated_at();

create table if not exists admin_security_audit_period_snapshots (
  id uuid primary key default gen_random_uuid(),

  audit_period_id uuid not null
    references admin_security_audit_periods(id)
    on delete cascade,

  snapshot_key text not null unique,

  snapshot_type text not null,

  status text not null default 'building',

  snapshot_name text not null,

  source_scope jsonb not null default '{}'::jsonb,

  built_by_auth_user_id uuid,
  built_by_admin_user_id uuid references admin_users(id),

  built_at timestamptz,
  sealed_at timestamptz,

  item_count integer not null default 0,

  checksum_sha256 text,
  payload_bytes bigint,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_audit_period_snapshots_type_check
  check (
    snapshot_type in (
      'control_coverage',
      'control_evidence',
      'governance_policy',
      'policy_change',
      'policy_simulation',
      'auditor_access',
      'auditor_export',
      'audit_hash',
      'retention_archive_deletion',
      'legal_hold',
      'full_period'
    )
  ),

  constraint admin_security_audit_period_snapshots_status_check
  check (
    status in (
      'building',
      'built',
      'sealed',
      'failed',
      'archived'
    )
  ),

  constraint admin_security_audit_period_snapshots_name_check
  check (length(trim(snapshot_name)) > 0)
);

create index if not exists admin_security_audit_period_snapshots_period_idx
on admin_security_audit_period_snapshots (audit_period_id, snapshot_type);

create index if not exists admin_security_audit_period_snapshots_status_idx
on admin_security_audit_period_snapshots (status, created_at desc);

drop trigger if exists admin_security_audit_period_snapshots_set_updated_at
on admin_security_audit_period_snapshots;

create trigger admin_security_audit_period_snapshots_set_updated_at
before update on admin_security_audit_period_snapshots
for each row
execute function set_updated_at();

create table if not exists admin_security_audit_period_snapshot_items (
  id uuid primary key default gen_random_uuid(),

  audit_period_id uuid not null
    references admin_security_audit_periods(id)
    on delete cascade,

  audit_period_snapshot_id uuid not null
    references admin_security_audit_period_snapshots(id)
    on delete cascade,

  item_type text not null,

  source_type text not null,
  source_id uuid,

  framework_key text,
  control_key text,
  policy_key text,
  evidence_key text,

  item_status text not null default 'included',

  redaction_level text not null default 'auditor_safe',

  source_created_at timestamptz,
  source_updated_at timestamptz,

  payload jsonb not null default '{}'::jsonb,
  payload_checksum_sha256 text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_audit_period_snapshot_items_type_check
  check (
    item_type in (
      'control_coverage',
      'control_mapping',
      'control_evidence',
      'governance_policy',
      'governance_rule',
      'policy_evaluation',
      'policy_change',
      'policy_change_review',
      'policy_simulation',
      'auditor',
      'auditor_grant',
      'auditor_export',
      'auditor_export_item',
      'audit_hash_entry',
      'archive_manifest',
      'archive_verification',
      'deletion_request',
      'legal_hold',
      'legal_hold_target',
      'retention_policy',
      'summary'
    )
  ),

  constraint admin_security_audit_period_snapshot_items_status_check
  check (
    item_status in (
      'included',
      'redacted',
      'skipped',
      'missing',
      'error'
    )
  ),

  constraint admin_security_audit_period_snapshot_items_redaction_check
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

create index if not exists admin_security_audit_period_snapshot_items_snapshot_idx
on admin_security_audit_period_snapshot_items (
  audit_period_snapshot_id,
  item_type
);

create index if not exists admin_security_audit_period_snapshot_items_period_idx
on admin_security_audit_period_snapshot_items (
  audit_period_id,
  item_type
);

create index if not exists admin_security_audit_period_snapshot_items_source_idx
on admin_security_audit_period_snapshot_items (
  source_type,
  source_id
);

create index if not exists admin_security_audit_period_snapshot_items_control_idx
on admin_security_audit_period_snapshot_items (
  framework_key,
  control_key
);

create or replace function checksum_jsonb_sha256(
  p_payload jsonb
)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      coalesce(p_payload, '{}'::jsonb)::text,
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function create_admin_security_audit_period(
  p_admin_auth_user_id uuid,
  p_period_key text,
  p_period_name text,
  p_audit_type text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_description text,
  p_owner_team text default 'platform',
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_period_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_period_key is null or length(trim(p_period_key)) = 0 then
    raise exception 'audit period key is required';
  end if;

  if p_period_name is null or length(trim(p_period_name)) = 0 then
    raise exception 'audit period name is required';
  end if;

  if p_period_end < p_period_start then
    raise exception 'audit period end cannot be before start';
  end if;

  if p_description is null or length(trim(p_description)) = 0 then
    raise exception 'audit period description is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_audit_periods (
    period_key,
    period_name,
    status,
    audit_type,
    period_start,
    period_end,
    owner_team,
    description,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    p_period_key,
    p_period_name,
    'draft',
    coalesce(p_audit_type, 'internal'),
    p_period_start,
    p_period_end,
    coalesce(p_owner_team, 'platform'),
    p_description,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (period_key)
  do update set
    period_name = excluded.period_name,
    audit_type = excluded.audit_type,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    owner_team = excluded.owner_team,
    description = excluded.description,
    metadata = admin_security_audit_periods.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_period_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_audit_period',
    'admin.write',
    'admin_security_audit_period',
    v_period_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_description,
    p_metadata || jsonb_build_object(
      'period_key',
      p_period_key,
      'audit_type',
      p_audit_type,
      'period_start',
      p_period_start,
      'period_end',
      p_period_end
    )
  );

  return v_period_id;
end;
$$;

create or replace function open_admin_security_audit_period(
  p_admin_auth_user_id uuid,
  p_audit_period_id uuid,
  p_note text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_period admin_security_audit_periods%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_period
  from admin_security_audit_periods
  where id = p_audit_period_id
  for update;

  if v_period.id is null then
    raise exception 'audit period not found: %', p_audit_period_id;
  end if;

  if v_period.status <> 'draft' then
    raise exception 'audit period cannot be opened from status: %', v_period.status;
  end if;

  update admin_security_audit_periods
  set
    status = 'open',
    opened_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'open_note',
      p_note,
      'open_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_period.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'open_admin_security_audit_period',
    'admin.write',
    'admin_security_audit_period',
    v_period.id,
    p_request_id,
    null,
    null,
    'allowed',
    coalesce(p_note, 'audit period opened'),
    p_metadata
  );

  return v_period.id;
end;
$$;

create or replace function close_admin_security_audit_period(
  p_admin_auth_user_id uuid,
  p_audit_period_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_period admin_security_audit_periods%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'audit period close note is required';
  end if;

  select *
  into v_period
  from admin_security_audit_periods
  where id = p_audit_period_id
  for update;

  if v_period.id is null then
    raise exception 'audit period not found: %', p_audit_period_id;
  end if;

  if v_period.status <> 'open' then
    raise exception 'audit period cannot be closed from status: %', v_period.status;
  end if;

  update admin_security_audit_periods
  set
    status = 'closed',
    closed_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'close_note',
      p_note,
      'close_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_period.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'close_admin_security_audit_period',
    'admin.write',
    'admin_security_audit_period',
    v_period.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    p_metadata
  );

  return v_period.id;
end;
$$;

create or replace function build_admin_security_audit_period_snapshot(
  p_admin_auth_user_id uuid,
  p_audit_period_id uuid,
  p_snapshot_type text,
  p_snapshot_key text,
  p_snapshot_name text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_period admin_security_audit_periods%rowtype;
  v_snapshot_id uuid;
  v_item_count integer := 0;
  v_payload jsonb;
begin
  if p_admin_auth_user_id is not null then
    if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
      raise exception 'missing required permission: admin.write';
    end if;

    v_admin := get_active_admin_user(p_admin_auth_user_id);
  end if;

  select *
  into v_period
  from admin_security_audit_periods
  where id = p_audit_period_id
  for update;

  if v_period.id is null then
    raise exception 'audit period not found: %', p_audit_period_id;
  end if;

  if v_period.status not in ('open', 'closed') then
    raise exception 'audit period snapshot cannot be built from status: %', v_period.status;
  end if;

  if p_snapshot_type not in (
    'control_coverage',
    'control_evidence',
    'governance_policy',
    'policy_change',
    'policy_simulation',
    'auditor_access',
    'auditor_export',
    'audit_hash',
    'retention_archive_deletion',
    'legal_hold',
    'full_period'
  ) then
    raise exception 'invalid audit period snapshot type: %', p_snapshot_type;
  end if;

  insert into admin_security_audit_period_snapshots (
    audit_period_id,
    snapshot_key,
    snapshot_type,
    status,
    snapshot_name,
    source_scope,
    built_by_auth_user_id,
    built_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    v_period.id,
    p_snapshot_key,
    p_snapshot_type,
    'building',
    p_snapshot_name,
    jsonb_build_object(
      'period_start',
      v_period.period_start,
      'period_end',
      v_period.period_end,
      'audit_type',
      v_period.audit_type
    ),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (snapshot_key)
  do update set
    status = 'building',
    snapshot_name = excluded.snapshot_name,
    source_scope = excluded.source_scope,
    metadata = admin_security_audit_period_snapshots.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_snapshot_id;

  delete from admin_security_audit_period_snapshot_items
  where audit_period_snapshot_id = v_snapshot_id;

  if p_snapshot_type in ('control_coverage', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      framework_key,
      control_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'control_coverage',
      'admin_security_control',
      c.admin_security_control_id,
      c.framework_key,
      c.control_key,
      'included',
      'auditor_safe',
      to_jsonb(c),
      checksum_jsonb_sha256(to_jsonb(c)),
      c.created_at,
      c.updated_at,
      p_metadata
    from admin_security_control_coverage_dashboard c;
  end if;

  if p_snapshot_type in ('control_evidence', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      framework_key,
      control_key,
      evidence_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'control_evidence',
      e.source_type,
      e.evidence_item_id,
      e.framework_key,
      e.control_key,
      e.evidence_key,
      'included',
      'auditor_safe',
      to_jsonb(e),
      checksum_jsonb_sha256(to_jsonb(e)),
      e.collected_at,
      p_metadata
    from admin_security_auditor_evidence_public e
    where e.collected_at between v_period.period_start and v_period.period_end;
  end if;

  if p_snapshot_type in ('governance_policy', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      policy_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'governance_policy',
      'admin_security_governance_policy',
      p.admin_security_governance_policy_id,
      p.policy_key,
      'included',
      'auditor_safe',
      to_jsonb(p),
      checksum_jsonb_sha256(to_jsonb(p)),
      p.created_at,
      p.updated_at,
      p_metadata
    from admin_security_governance_policy_dashboard p
    where p.created_at <= v_period.period_end
      and (
        p.expires_at is null
        or p.expires_at >= v_period.period_start
      );

    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      policy_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'governance_rule',
      'admin_security_governance_policy_rule',
      r.admin_security_governance_policy_rule_id,
      r.policy_key,
      'included',
      'auditor_safe',
      to_jsonb(r),
      checksum_jsonb_sha256(to_jsonb(r)),
      r.created_at,
      r.updated_at,
      p_metadata
    from admin_security_governance_policy_rule_dashboard r
    where r.created_at <= v_period.period_end;
  end if;

  if p_snapshot_type in ('policy_change', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      policy_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'policy_change',
      'admin_security_policy_change_request',
      cr.admin_security_policy_change_request_id,
      coalesce(cr.draft_policy_key, cr.target_policy_key),
      'included',
      'auditor_safe',
      to_jsonb(cr),
      checksum_jsonb_sha256(to_jsonb(cr)),
      cr.created_at,
      cr.updated_at,
      p_metadata
    from admin_security_policy_change_request_dashboard cr
    where cr.created_at between v_period.period_start and v_period.period_end;

    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      policy_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'policy_change_review',
      'admin_security_policy_change_review',
      r.admin_security_policy_change_review_id,
      null,
      'included',
      'auditor_safe',
      to_jsonb(r),
      checksum_jsonb_sha256(to_jsonb(r)),
      r.created_at,
      p_metadata
    from admin_security_policy_change_review_dashboard r
    where r.created_at between v_period.period_start and v_period.period_end;
  end if;

  if p_snapshot_type in ('policy_simulation', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      policy_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'policy_simulation',
      'admin_security_policy_simulation_run',
      s.admin_security_policy_simulation_run_id,
      s.draft_policy_key,
      'included',
      'auditor_safe',
      to_jsonb(s),
      checksum_jsonb_sha256(to_jsonb(s)),
      s.created_at,
      s.updated_at,
      p_metadata
    from admin_security_policy_simulation_run_dashboard s
    where s.created_at between v_period.period_start and v_period.period_end;
  end if;

  if p_snapshot_type in ('auditor_access', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'auditor',
      'admin_security_auditor',
      a.admin_security_auditor_id,
      'included',
      'auditor_safe',
      to_jsonb(a),
      checksum_jsonb_sha256(to_jsonb(a)),
      a.created_at,
      a.updated_at,
      p_metadata
    from admin_security_auditor_dashboard a
    where a.created_at <= v_period.period_end
      and (
        a.access_expires_at >= v_period.period_start
        or a.revoked_at between v_period.period_start and v_period.period_end
      );

    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      framework_key,
      control_key,
      policy_key,
      evidence_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'auditor_grant',
      'admin_security_auditor_access_grant',
      g.admin_security_auditor_access_grant_id,
      g.framework_key,
      g.control_key,
      g.policy_key,
      g.evidence_key,
      'included',
      'auditor_safe',
      to_jsonb(g),
      checksum_jsonb_sha256(to_jsonb(g)),
      g.created_at,
      g.updated_at,
      p_metadata
    from admin_security_auditor_grant_dashboard g
    where g.created_at <= v_period.period_end
      and (
        g.revoked_at is null
        or g.revoked_at >= v_period.period_start
      );
  end if;

  if p_snapshot_type in ('auditor_export', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      framework_key,
      control_key,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'auditor_export',
      'admin_security_auditor_export_request',
      e.admin_security_auditor_export_request_id,
      e.framework_key,
      e.control_key,
      'included',
      'metadata_redacted',
      to_jsonb(e) - 'storage_uri',
      checksum_jsonb_sha256(to_jsonb(e) - 'storage_uri'),
      e.created_at,
      e.updated_at,
      p_metadata
    from admin_security_auditor_export_dashboard e
    where e.created_at between v_period.period_start and v_period.period_end;
  end if;

  if p_snapshot_type in ('audit_hash', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'audit_hash_entry',
      'audit_hash_chain_entry',
      ahc.id,
      'included',
      'auditor_safe',
      to_jsonb(ahc),
      checksum_jsonb_sha256(to_jsonb(ahc)),
      ahc.created_at,
      p_metadata
    from audit_hash_chain_entries ahc
    where ahc.created_at between v_period.period_start and v_period.period_end;
  end if;

  if p_snapshot_type in ('retention_archive_deletion', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'retention_policy',
      'admin_security_retention_policy',
      rp.id,
      'included',
      'auditor_safe',
      to_jsonb(rp),
      checksum_jsonb_sha256(to_jsonb(rp)),
      rp.created_at,
      rp.updated_at,
      p_metadata
    from admin_security_retention_policies rp
    where rp.created_at <= v_period.period_end;

    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'archive_manifest',
      'admin_security_archive_manifest',
      m.id,
      'included',
      'auditor_safe',
      to_jsonb(m),
      checksum_jsonb_sha256(to_jsonb(m)),
      m.created_at,
      m.updated_at,
      p_metadata
    from admin_security_archive_manifests m
    where m.created_at <= v_period.period_end
      and m.period_end >= v_period.period_start;

    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'deletion_request',
      'admin_security_deletion_request',
      d.admin_security_deletion_request_id,
      'included',
      'auditor_safe',
      to_jsonb(d),
      checksum_jsonb_sha256(to_jsonb(d)),
      d.created_at,
      d.updated_at,
      p_metadata
    from admin_security_deletion_request_dashboard d
    where d.created_at between v_period.period_start and v_period.period_end
       or d.executed_at between v_period.period_start and v_period.period_end;
  end if;

  if p_snapshot_type in ('legal_hold', 'full_period') then
    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'legal_hold',
      'admin_security_legal_hold',
      h.admin_security_legal_hold_id,
      'included',
      'metadata_redacted',
      to_jsonb(h),
      checksum_jsonb_sha256(to_jsonb(h)),
      h.created_at,
      h.updated_at,
      p_metadata
    from admin_security_legal_hold_dashboard h
    where h.created_at <= v_period.period_end
      and (
        h.released_at is null
        or h.released_at >= v_period.period_start
      );

    insert into admin_security_audit_period_snapshot_items (
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      source_created_at,
      source_updated_at,
      metadata
    )
    select
      v_period.id,
      v_snapshot_id,
      'legal_hold_target',
      'admin_security_legal_hold_target',
      t.admin_security_legal_hold_target_id,
      'included',
      'metadata_redacted',
      to_jsonb(t),
      checksum_jsonb_sha256(to_jsonb(t)),
      t.created_at,
      t.updated_at,
      p_metadata
    from admin_security_legal_hold_target_dashboard t
    where t.created_at <= v_period.period_end;
  end if;

  select count(*)
  into v_item_count
  from admin_security_audit_period_snapshot_items
  where audit_period_snapshot_id = v_snapshot_id;

  v_payload := jsonb_build_object(
    'audit_period_id', v_period.id,
    'snapshot_id', v_snapshot_id,
    'snapshot_type', p_snapshot_type,
    'item_count', v_item_count,
    'built_at', now(),
    'items_checksum',
    (
      select encode(
        digest(
          coalesce(string_agg(payload_checksum_sha256, '' order by id), ''),
          'sha256'
        ),
        'hex'
      )
      from admin_security_audit_period_snapshot_items
      where audit_period_snapshot_id = v_snapshot_id
    )
  );

  update admin_security_audit_period_snapshots
  set
    status = 'built',
    built_at = now(),
    item_count = v_item_count,
    checksum_sha256 = checksum_jsonb_sha256(v_payload),
    payload_bytes = length(v_payload::text),
    metadata = metadata || p_metadata || jsonb_build_object(
      'snapshot_payload',
      v_payload
    ),
    updated_at = now()
  where id = v_snapshot_id;

  update admin_security_audit_periods
  set
    snapshot_count = (
      select count(*)
      from admin_security_audit_period_snapshots
      where audit_period_id = v_period.id
        and status in ('built', 'sealed')
    ),
    item_count = (
      select count(*)
      from admin_security_audit_period_snapshot_items
      where audit_period_id = v_period.id
    ),
    updated_at = now()
  where id = v_period.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'build_admin_security_audit_period_snapshot',
    'admin.write',
    'admin_security_audit_period_snapshot',
    v_snapshot_id,
    p_request_id,
    null,
    null,
    'allowed',
    'audit period snapshot built',
    p_metadata || jsonb_build_object(
      'audit_period_id',
      v_period.id,
      'snapshot_type',
      p_snapshot_type,
      'item_count',
      v_item_count
    )
  );

  return v_snapshot_id;
exception
  when others then
    if v_snapshot_id is not null then
      update admin_security_audit_period_snapshots
      set
        status = 'failed',
        metadata = metadata || jsonb_build_object(
          'failure',
          sqlerrm,
          'failed_at',
          now()
        ),
        updated_at = now()
      where id = v_snapshot_id;
    end if;

    raise;
end;
$$;

create or replace function seal_admin_security_audit_period_snapshot(
  p_admin_auth_user_id uuid,
  p_snapshot_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot admin_security_audit_period_snapshots%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'audit period snapshot seal note is required';
  end if;

  select *
  into v_snapshot
  from admin_security_audit_period_snapshots
  where id = p_snapshot_id
  for update;

  if v_snapshot.id is null then
    raise exception 'audit period snapshot not found: %', p_snapshot_id;
  end if;

  if v_snapshot.status <> 'built' then
    raise exception 'audit period snapshot cannot be sealed from status: %', v_snapshot.status;
  end if;

  update admin_security_audit_period_snapshots
  set
    status = 'sealed',
    sealed_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'seal_note',
      p_note,
      'seal_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_snapshot.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'seal_admin_security_audit_period_snapshot',
    'admin.write',
    'admin_security_audit_period_snapshot',
    v_snapshot.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    p_metadata
  );

  return v_snapshot.id;
end;
$$;

create or replace function seal_admin_security_audit_period(
  p_admin_auth_user_id uuid,
  p_audit_period_id uuid,
  p_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_period admin_security_audit_periods%rowtype;
  v_checksum text;
  v_snapshot_count integer;
  v_item_count integer;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'seal_admin_security_audit_period'
    )
  );

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'audit period seal note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_period
  from admin_security_audit_periods
  where id = p_audit_period_id
  for update;

  if v_period.id is null then
    raise exception 'audit period not found: %', p_audit_period_id;
  end if;

  if v_period.status <> 'closed' then
    raise exception 'audit period cannot be sealed from status: %', v_period.status;
  end if;

  select count(*)
  into v_snapshot_count
  from admin_security_audit_period_snapshots
  where audit_period_id = v_period.id
    and status in ('built', 'sealed');

  if v_snapshot_count = 0 then
    raise exception 'audit period requires at least one built snapshot before sealing';
  end if;

  if exists (
    select 1
    from admin_security_audit_period_snapshots
    where audit_period_id = v_period.id
      and status in ('building', 'failed')
  ) then
    raise exception 'audit period has unsealed failed or building snapshots';
  end if;

  select count(*)
  into v_item_count
  from admin_security_audit_period_snapshot_items
  where audit_period_id = v_period.id;

  select encode(
    digest(
      coalesce(
        string_agg(
          s.checksum_sha256,
          ''
          order by s.created_at, s.id
        ),
        ''
      ),
      'sha256'
    ),
    'hex'
  )
  into v_checksum
  from admin_security_audit_period_snapshots s
  where s.audit_period_id = v_period.id
    and s.status in ('built', 'sealed');

  update admin_security_audit_period_snapshots
  set
    status = 'sealed',
    sealed_at = coalesce(sealed_at, now()),
    updated_at = now()
  where audit_period_id = v_period.id
    and status = 'built';

  update admin_security_audit_periods
  set
    status = 'sealed',
    sealed_at = now(),
    sealed_by_auth_user_id = p_admin_auth_user_id,
    sealed_by_admin_user_id = v_admin.id,
    seal_checksum_sha256 = v_checksum,
    snapshot_count = v_snapshot_count,
    item_count = v_item_count,
    metadata = metadata || p_metadata || jsonb_build_object(
      'seal_note',
      p_note,
      'seal_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_period.id;

  perform hash_admin_security_audit_period(
    v_period.id,
    p_metadata || jsonb_build_object(
      'source',
      'seal_admin_security_audit_period'
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'seal_admin_security_audit_period',
    'admin.write',
    'admin_security_audit_period',
    v_period.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_note,
    p_metadata || jsonb_build_object(
      'snapshot_count',
      v_snapshot_count,
      'item_count',
      v_item_count,
      'seal_checksum_sha256',
      v_checksum
    )
  );

  perform create_admin_security_alert(
    'admin_security_audit_period_sealed',
    'high',
    p_admin_auth_user_id,
    null,
    'seal_admin_security_audit_period',
    null,
    'Admin security audit period was sealed.',
    p_metadata || jsonb_build_object(
      'audit_period_id',
      v_period.id,
      'period_key',
      v_period.period_key,
      'seal_checksum_sha256',
      v_checksum
    )
  );

  return v_period.id;
end;
$$;

create or replace function hash_admin_security_audit_period(
  p_audit_period_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_period admin_security_audit_periods%rowtype;
  v_snapshots jsonb;
  v_payload jsonb;
begin
  select *
  into v_period
  from admin_security_audit_periods
  where id = p_audit_period_id;

  if v_period.id is null then
    raise exception 'audit period not found: %', p_audit_period_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at asc), '[]'::jsonb)
  into v_snapshots
  from admin_security_audit_period_snapshots s
  where s.audit_period_id = v_period.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_audit_period',
    'source_id', v_period.id,
    'period_key', v_period.period_key,
    'period_name', v_period.period_name,
    'status', v_period.status,
    'audit_type', v_period.audit_type,
    'period_start', v_period.period_start,
    'period_end', v_period.period_end,
    'owner_team', v_period.owner_team,
    'snapshot_count', v_period.snapshot_count,
    'item_count', v_period.item_count,
    'sealed_at', v_period.sealed_at,
    'seal_checksum_sha256', v_period.seal_checksum_sha256,
    'snapshots', v_snapshots,
    'created_at', v_period.created_at,
    'updated_at', v_period.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_audit_period',
    v_period.id,
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
  select 1 from audit_hash_chain_entries ahc
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
  select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
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
  select 1 from audit_hash_chain_entries ahc
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
    select 1 from audit_hash_chain_entries ahc
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
  select 1 from audit_hash_chain_entries ahc
  where ahc.source_type = 'external_payout'
    and ahc.source_id = ep.id
)
union all
select
  'payout_provider_event'::text as source_type,
  ppe.id as source_id,
  ppe.created_at
from payout_provider_events ppe
where ppe.processing_status in ('processed', 'ignored', 'failed')
  and not exists (
    select 1 from audit_hash_chain_entries ahc
    where ahc.source_type = 'payout_provider_event'
      and ahc.source_id = ppe.id
  )
union all
select
  'admin_security_auditor'::text as source_type,
  a.id as source_id,
  a.created_at
from admin_security_auditors a
where a.status in ('expired', 'revoked', 'suspended')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_auditor'
      and ahc.source_id = a.id
  )
union all
select
  'admin_security_audit_period'::text as source_type,
  p.id as source_id,
  p.created_at
from admin_security_audit_periods p
where p.status in ('sealed', 'archived', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_audit_period'
      and ahc.source_id = p.id
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
      elsif v_row.source_type = 'payout_provider_event' then
        perform hash_payout_provider_event(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_security_auditor' then
        perform hash_admin_security_auditor(v_row.source_id, p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id));
      elsif v_row.source_type = 'admin_security_audit_period' then
        perform hash_admin_security_audit_period(
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

create or replace view admin_security_audit_period_dashboard as
select
  p.id as admin_security_audit_period_id,
  p.period_key,
  p.period_name,
  p.status,
  p.audit_type,
  p.period_start,
  p.period_end,
  p.owner_team,
  p.description,
  p.created_by_auth_user_id,
  creator.email as created_by_email,
  creator.display_name as created_by_display_name,
  p.opened_at,
  p.closed_at,
  p.sealed_at,
  p.sealed_by_auth_user_id,
  sealer.email as sealed_by_email,
  p.seal_checksum_sha256,
  p.snapshot_count,
  p.item_count,
  (
    select count(*)
    from admin_security_audit_period_snapshots s
    where s.audit_period_id = p.id
      and s.status = 'failed'
  ) as failed_snapshot_count,
  (
    select count(*)
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_audit_period'
      and ahc.source_id = p.id
  ) as audit_hash_entry_count,
  p.created_at,
  p.updated_at,
  p.metadata
from admin_security_audit_periods p
left join admin_users creator
  on creator.id = p.created_by_admin_user_id
left join admin_users sealer
  on sealer.id = p.sealed_by_admin_user_id
order by p.period_start desc, p.created_at desc;

create or replace view admin_security_audit_period_snapshot_dashboard as
select
  s.id as admin_security_audit_period_snapshot_id,
  s.audit_period_id,
  p.period_key,
  p.period_name,
  p.status as audit_period_status,
  s.snapshot_key,
  s.snapshot_type,
  s.snapshot_name,
  s.status,
  s.source_scope,
  s.built_by_auth_user_id,
  builder.email as built_by_email,
  s.built_at,
  s.sealed_at,
  s.item_count,
  s.checksum_sha256,
  s.payload_bytes,
  s.created_at,
  s.updated_at,
  s.metadata
from admin_security_audit_period_snapshots s
join admin_security_audit_periods p
  on p.id = s.audit_period_id
left join admin_users builder
  on builder.id = s.built_by_admin_user_id
order by s.created_at desc;

create or replace view admin_security_audit_period_snapshot_item_dashboard as
select
  i.id as admin_security_audit_period_snapshot_item_id,
  i.audit_period_id,
  p.period_key,
  i.audit_period_snapshot_id,
  s.snapshot_key,
  s.snapshot_type,
  i.item_type,
  i.source_type,
  i.source_id,
  i.framework_key,
  i.control_key,
  i.policy_key,
  i.evidence_key,
  i.item_status,
  i.redaction_level,
  i.payload_checksum_sha256,
  i.source_created_at,
  i.source_updated_at,
  i.created_at,
  i.metadata
from admin_security_audit_period_snapshot_items i
join admin_security_audit_period_snapshots s
  on s.id = i.audit_period_snapshot_id
join admin_security_audit_periods p
  on p.id = i.audit_period_id
order by i.created_at desc;

create or replace view admin_security_audit_period_integrity as
select
  (
    select count(*)
    from admin_security_audit_periods
    where status = 'open'
  ) as open_audit_period_count,
  (
    select count(*)
    from admin_security_audit_periods
    where status = 'closed'
  ) as closed_unsealed_audit_period_count,
  (
    select count(*)
    from admin_security_audit_periods
    where status = 'sealed'
  ) as sealed_audit_period_count,
  (
    select count(*)
    from admin_security_audit_period_snapshots
    where status = 'failed'
  ) as failed_snapshot_count,
  (
    select count(*)
    from admin_security_audit_periods p
    where p.status = 'sealed'
      and not exists (
        select 1
        from audit_hash_chain_entries ahc
        where ahc.source_type = 'admin_security_audit_period'
          and ahc.source_id = p.id
      )
  ) as sealed_period_missing_hash_count,
  (
    select count(*)
    from admin_security_audit_period_snapshot_items
  ) as snapshot_item_count,
  now() as checked_at;

grant select on admin_security_audit_period_dashboard to admin_api_role;
grant select on admin_security_audit_period_snapshot_dashboard to admin_api_role;
grant select on admin_security_audit_period_snapshot_item_dashboard to admin_api_role;
grant select on admin_security_audit_period_integrity to admin_api_role;

alter table admin_security_audit_periods enable row level security;
alter table admin_security_audit_period_snapshots enable row level security;
alter table admin_security_audit_period_snapshot_items enable row level security;

create policy admin_security_audit_periods_no_user_direct_access
on admin_security_audit_periods
for all
to authenticated
using (false)
with check (false);

create policy admin_security_audit_period_snapshots_no_user_direct_access
on admin_security_audit_period_snapshots
for all
to authenticated
using (false)
with check (false);

create policy admin_security_audit_period_snapshot_items_no_user_direct_access
on admin_security_audit_period_snapshot_items
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_audit_periods
on admin_security_audit_periods
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_audit_period_snapshots
on admin_security_audit_period_snapshots
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_audit_period_snapshot_items
on admin_security_audit_period_snapshot_items
for all
to admin_api_role
using (true)
with check (true);

create policy worker_read_admin_security_audit_periods
on admin_security_audit_periods
for select
to worker_role
using (true);

create policy worker_all_admin_security_audit_period_snapshots
on admin_security_audit_period_snapshots
for all
to worker_role
using (true)
with check (true);

create policy worker_all_admin_security_audit_period_snapshot_items
on admin_security_audit_period_snapshot_items
for all
to worker_role
using (true)
with check (true);

grant execute on function checksum_jsonb_sha256(jsonb)
to admin_api_role, worker_role;

grant execute on function create_admin_security_audit_period(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function open_admin_security_audit_period(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function close_admin_security_audit_period(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function build_admin_security_audit_period_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role, worker_role;

grant execute on function seal_admin_security_audit_period_snapshot(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function seal_admin_security_audit_period(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function hash_admin_security_audit_period(uuid, jsonb)
to worker_role, admin_api_role;

alter function checksum_jsonb_sha256(jsonb) security definer;
alter function checksum_jsonb_sha256(jsonb) set search_path = public;

alter function create_admin_security_audit_period(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  jsonb
) security definer;

alter function create_admin_security_audit_period(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function open_admin_security_audit_period(uuid, uuid, text, text, jsonb) security definer;
alter function open_admin_security_audit_period(uuid, uuid, text, text, jsonb) set search_path = public;

alter function close_admin_security_audit_period(uuid, uuid, text, text, jsonb) security definer;
alter function close_admin_security_audit_period(uuid, uuid, text, text, jsonb) set search_path = public;

alter function build_admin_security_audit_period_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) security definer;

alter function build_admin_security_audit_period_snapshot(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function seal_admin_security_audit_period_snapshot(uuid, uuid, text, text, jsonb) security definer;
alter function seal_admin_security_audit_period_snapshot(uuid, uuid, text, text, jsonb) set search_path = public;

alter function seal_admin_security_audit_period(uuid, uuid, text, text, jsonb) security definer;
alter function seal_admin_security_audit_period(uuid, uuid, text, text, jsonb) set search_path = public;

alter function hash_admin_security_audit_period(uuid, jsonb) security definer;
alter function hash_admin_security_audit_period(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_AUDIT_PERIOD_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Audit period not found.',
    'Admin security audit period not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Audit period cannot move from its current state.',
    'Admin security audit period invalid lifecycle state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Audit period requires complete fields.',
    'Admin security audit period required fields missing.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDIT_SNAPSHOT_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Audit snapshot failed.',
    'Admin security audit period snapshot failed.',
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
  ('audit period not found', 'ADMIN_SECURITY_AUDIT_PERIOD_NOT_FOUND', 5, '{}'),
  ('audit period cannot be opened from status', 'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE', 5, '{}'),
  ('audit period cannot be closed from status', 'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE', 5, '{}'),
  ('audit period cannot be sealed from status', 'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE', 5, '{}'),
  ('audit period snapshot cannot be built from status', 'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE', 5, '{}'),
  ('audit period snapshot cannot be sealed from status', 'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE', 5, '{}'),
  ('audit period requires at least one built snapshot before sealing', 'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE', 5, '{}'),
  ('audit period has unsealed failed or building snapshots', 'ADMIN_SECURITY_AUDIT_PERIOD_INVALID_STATE', 5, '{}'),
  ('audit period key is required', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}'),
  ('audit period name is required', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}'),
  ('audit period description is required', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}'),
  ('audit period close note is required', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}'),
  ('audit period seal note is required', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}'),
  ('audit period snapshot seal note is required', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}'),
  ('invalid audit period snapshot type', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
