-- Step 9.44 — Build auditor access mode.
-- Runs after 158_admin_security_policy_control_mapping.sql.

create table if not exists admin_security_auditors (
  id uuid primary key default gen_random_uuid(),
  auditor_auth_user_id uuid not null unique,
  status text not null default 'active',
  auditor_type text not null default 'external',
  organization_name text not null,
  display_name text not null,
  email text not null,
  purpose text not null,
  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz not null,
  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoked_at timestamptz,
  revoke_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_auditors_status_check
  check (status in ('active', 'expired', 'revoked', 'suspended')),
  constraint admin_security_auditors_type_check
  check (auditor_type in ('external', 'internal', 'enterprise_reviewer', 'regulator', 'security_reviewer')),
  constraint admin_security_auditors_access_window_check
  check (access_expires_at > access_starts_at),
  constraint admin_security_auditors_email_check
  check (position('@' in email) > 1),
  constraint admin_security_auditors_org_check
  check (length(trim(organization_name)) > 0),
  constraint admin_security_auditors_purpose_check
  check (length(trim(purpose)) > 0)
);

create index if not exists admin_security_auditors_status_idx
on admin_security_auditors (status, access_expires_at);

create index if not exists admin_security_auditors_org_idx
on admin_security_auditors (organization_name, status);

drop trigger if exists admin_security_auditors_set_updated_at on admin_security_auditors;
create trigger admin_security_auditors_set_updated_at
before update on admin_security_auditors
for each row execute function set_updated_at();

create table if not exists admin_security_auditor_access_grants (
  id uuid primary key default gen_random_uuid(),
  auditor_id uuid not null references admin_security_auditors(id) on delete cascade,
  status text not null default 'active',
  grant_type text not null,
  framework_id uuid references admin_security_control_frameworks(id),
  control_id uuid references admin_security_controls(id),
  policy_id uuid references admin_security_governance_policies(id),
  evidence_key text,
  source_type text,
  period_start timestamptz,
  period_end timestamptz,
  allow_export boolean not null default false,
  granted_by_auth_user_id uuid not null,
  granted_by_admin_user_id uuid references admin_users(id),
  revoked_by_auth_user_id uuid,
  revoked_by_admin_user_id uuid references admin_users(id),
  revoked_at timestamptz,
  revoke_reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_auditor_access_grants_status_check
  check (status in ('active', 'revoked', 'expired')),
  constraint admin_security_auditor_access_grants_type_check
  check (grant_type in ('framework', 'control', 'policy', 'evidence_key', 'source_type', 'global_readonly')),
  constraint admin_security_auditor_access_grants_period_check
  check (period_start is null or period_end is null or period_end >= period_start),
  constraint admin_security_auditor_access_grants_shape_check
  check (
    (grant_type = 'framework' and framework_id is not null)
    or (grant_type = 'control' and control_id is not null)
    or (grant_type = 'policy' and policy_id is not null)
    or (grant_type = 'evidence_key' and evidence_key is not null)
    or (grant_type = 'source_type' and source_type is not null)
    or (grant_type = 'global_readonly')
  )
);

create index if not exists admin_security_auditor_access_grants_auditor_idx
on admin_security_auditor_access_grants (auditor_id, status);

create index if not exists admin_security_auditor_access_grants_framework_idx
on admin_security_auditor_access_grants (framework_id, status);

create index if not exists admin_security_auditor_access_grants_control_idx
on admin_security_auditor_access_grants (control_id, status);

create index if not exists admin_security_auditor_access_grants_policy_idx
on admin_security_auditor_access_grants (policy_id, status);

drop trigger if exists admin_security_auditor_access_grants_set_updated_at on admin_security_auditor_access_grants;
create trigger admin_security_auditor_access_grants_set_updated_at
before update on admin_security_auditor_access_grants
for each row execute function set_updated_at();

create table if not exists admin_security_auditor_sessions (
  id uuid primary key default gen_random_uuid(),
  auditor_id uuid not null references admin_security_auditors(id) on delete cascade,
  auditor_auth_user_id uuid not null,
  status text not null default 'active',
  session_key text not null unique,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  ip_address inet,
  user_agent text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_auditor_sessions_status_check
  check (status in ('active', 'ended', 'expired', 'revoked'))
);

create index if not exists admin_security_auditor_sessions_auditor_idx
on admin_security_auditor_sessions (auditor_id, started_at desc);

create index if not exists admin_security_auditor_sessions_status_idx
on admin_security_auditor_sessions (status, last_seen_at desc);

create table if not exists admin_security_auditor_access_events (
  id uuid primary key default gen_random_uuid(),
  auditor_id uuid references admin_security_auditors(id) on delete set null,
  auditor_auth_user_id uuid,
  event_key text not null,
  severity text not null default 'medium',
  action_key text,
  source_type text,
  source_id uuid,
  allowed boolean not null default true,
  reason text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_auditor_access_events_severity_check
  check (severity in ('low', 'medium', 'high', 'critical'))
);

create index if not exists admin_security_auditor_access_events_auditor_idx
on admin_security_auditor_access_events (auditor_id, created_at desc);

create index if not exists admin_security_auditor_access_events_source_idx
on admin_security_auditor_access_events (source_type, source_id);

create index if not exists admin_security_auditor_access_events_key_idx
on admin_security_auditor_access_events (event_key, created_at desc);

create table if not exists admin_security_auditor_export_requests (
  id uuid primary key default gen_random_uuid(),
  export_key text not null unique,
  auditor_id uuid not null references admin_security_auditors(id) on delete cascade,
  status text not null default 'pending',
  export_type text not null,
  framework_id uuid references admin_security_control_frameworks(id),
  control_id uuid references admin_security_controls(id),
  period_start timestamptz,
  period_end timestamptz,
  requested_by_auth_user_id uuid not null,
  requested_at timestamptz not null default now(),
  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id),
  approved_at timestamptz,
  approval_note text,
  generated_at timestamptz,
  generated_by_worker_id text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  watermark text not null,
  download_count integer not null default 0,
  last_downloaded_at timestamptz,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_auditor_export_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'generating', 'ready', 'failed', 'expired')),
  constraint admin_security_auditor_export_requests_type_check
  check (export_type in ('framework_evidence_bundle', 'control_evidence_bundle', 'policy_mapping_bundle', 'audit_summary_bundle')),
  constraint admin_security_auditor_export_requests_period_check
  check (period_start is null or period_end is null or period_end >= period_start)
);

create index if not exists admin_security_auditor_export_requests_auditor_idx
on admin_security_auditor_export_requests (auditor_id, created_at desc);

create index if not exists admin_security_auditor_export_requests_status_idx
on admin_security_auditor_export_requests (status, created_at desc);

drop trigger if exists admin_security_auditor_export_requests_set_updated_at on admin_security_auditor_export_requests;
create trigger admin_security_auditor_export_requests_set_updated_at
before update on admin_security_auditor_export_requests
for each row execute function set_updated_at();

create or replace function get_active_admin_security_auditor(
  p_auditor_auth_user_id uuid
)
returns admin_security_auditors
language plpgsql
stable
as $$
declare
  v_auditor admin_security_auditors%rowtype;
begin
  if p_auditor_auth_user_id is null then
    raise exception 'auditor auth user id is required';
  end if;

  select *
  into v_auditor
  from admin_security_auditors
  where auditor_auth_user_id = p_auditor_auth_user_id
    and status = 'active'
    and access_starts_at <= now()
    and access_expires_at > now();

  if v_auditor.id is null then
    raise exception 'active auditor access not found';
  end if;

  return v_auditor;
end;
$$;

create or replace function record_admin_security_auditor_access_event(
  p_auditor_auth_user_id uuid,
  p_event_key text,
  p_severity text default 'medium',
  p_action_key text default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_allowed boolean default true,
  p_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_auditor admin_security_auditors%rowtype;
  v_event_id uuid;
begin
  if p_event_key is null or length(trim(p_event_key)) = 0 then
    raise exception 'auditor event key is required';
  end if;

  if p_auditor_auth_user_id is not null then
    begin
      v_auditor := get_active_admin_security_auditor(p_auditor_auth_user_id);
    exception
      when others then
        v_auditor.id := null;
    end;
  end if;

  insert into admin_security_auditor_access_events (
    auditor_id,
    auditor_auth_user_id,
    event_key,
    severity,
    action_key,
    source_type,
    source_id,
    allowed,
    reason,
    request_id,
    metadata
  )
  values (
    v_auditor.id,
    p_auditor_auth_user_id,
    p_event_key,
    p_severity,
    p_action_key,
    p_source_type,
    p_source_id,
    coalesce(p_allowed, true),
    p_reason,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function auditor_has_security_access_grant(
  p_auditor_auth_user_id uuid,
  p_framework_id uuid default null,
  p_control_id uuid default null,
  p_policy_id uuid default null,
  p_evidence_key text default null,
  p_source_type text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_require_export boolean default false
)
returns boolean
language plpgsql
stable
as $$
declare
  v_auditor admin_security_auditors%rowtype;
  v_allowed boolean := false;
begin
  v_auditor := get_active_admin_security_auditor(p_auditor_auth_user_id);

  select exists (
    select 1
    from admin_security_auditor_access_grants g
    where g.auditor_id = v_auditor.id
      and g.status = 'active'
      and (p_require_export is false or g.allow_export is true)
      and (
        g.period_start is null
        or p_period_start is null
        or p_period_end is null
        or tstzrange(g.period_start, g.period_end, '[]')
          && tstzrange(p_period_start, p_period_end, '[]')
      )
      and (
        g.grant_type = 'global_readonly'
        or (g.grant_type = 'framework' and p_framework_id is not null and g.framework_id = p_framework_id)
        or (g.grant_type = 'control' and p_control_id is not null and g.control_id = p_control_id)
        or (g.grant_type = 'policy' and p_policy_id is not null and g.policy_id = p_policy_id)
        or (g.grant_type = 'evidence_key' and p_evidence_key is not null and g.evidence_key = p_evidence_key)
        or (g.grant_type = 'source_type' and p_source_type is not null and g.source_type = p_source_type)
      )
  )
  into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

create or replace function create_admin_security_auditor(
  p_admin_auth_user_id uuid,
  p_auditor_auth_user_id uuid,
  p_auditor_type text,
  p_organization_name text,
  p_display_name text,
  p_email text,
  p_purpose text,
  p_access_starts_at timestamptz,
  p_access_expires_at timestamptz,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_auditor_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object('action_key', 'create_admin_security_auditor')
  );

  if p_auditor_auth_user_id is null then
    raise exception 'auditor auth user id is required';
  end if;

  if p_access_expires_at <= coalesce(p_access_starts_at, now()) then
    raise exception 'auditor access expiry must be after start';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_auditors (
    auditor_auth_user_id,
    status,
    auditor_type,
    organization_name,
    display_name,
    email,
    purpose,
    access_starts_at,
    access_expires_at,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    p_auditor_auth_user_id,
    'active',
    coalesce(p_auditor_type, 'external'),
    p_organization_name,
    p_display_name,
    p_email,
    p_purpose,
    coalesce(p_access_starts_at, now()),
    p_access_expires_at,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (auditor_auth_user_id)
  do update set
    status = 'active',
    auditor_type = excluded.auditor_type,
    organization_name = excluded.organization_name,
    display_name = excluded.display_name,
    email = excluded.email,
    purpose = excluded.purpose,
    access_starts_at = excluded.access_starts_at,
    access_expires_at = excluded.access_expires_at,
    metadata = admin_security_auditors.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_auditor_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_auditor',
    'admin.write',
    'admin_security_auditor',
    v_auditor_id,
    p_request_id,
    null,
    p_auditor_auth_user_id,
    'allowed',
    p_purpose,
    p_metadata || jsonb_build_object(
      'organization_name', p_organization_name,
      'auditor_type', p_auditor_type
    )
  );

  perform create_admin_security_alert(
    'admin_security_auditor_created',
    'high',
    p_admin_auth_user_id,
    p_auditor_auth_user_id,
    'create_admin_security_auditor',
    null,
    'Security auditor access was created.',
    p_metadata || jsonb_build_object(
      'admin_security_auditor_id', v_auditor_id,
      'organization_name', p_organization_name,
      'access_expires_at', p_access_expires_at
    )
  );

  return v_auditor_id;
end;
$$;

create or replace function grant_admin_security_auditor_access(
  p_admin_auth_user_id uuid,
  p_auditor_id uuid,
  p_grant_type text,
  p_framework_id uuid default null,
  p_control_id uuid default null,
  p_policy_id uuid default null,
  p_evidence_key text default null,
  p_source_type text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_allow_export boolean default false,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_auditor admin_security_auditors%rowtype;
  v_grant_id uuid;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_auditor_id is null then
    raise exception 'auditor id is required';
  end if;

  select * into v_auditor
  from admin_security_auditors
  where id = p_auditor_id
  for update;

  if v_auditor.id is null then
    raise exception 'auditor not found: %', p_auditor_id;
  end if;

  if v_auditor.status <> 'active' then
    raise exception 'auditor access grant cannot be added to status: %', v_auditor.status;
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_auditor_access_grants (
    auditor_id,
    status,
    grant_type,
    framework_id,
    control_id,
    policy_id,
    evidence_key,
    source_type,
    period_start,
    period_end,
    allow_export,
    granted_by_auth_user_id,
    granted_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    p_auditor_id,
    'active',
    p_grant_type,
    p_framework_id,
    p_control_id,
    p_policy_id,
    p_evidence_key,
    p_source_type,
    p_period_start,
    p_period_end,
    coalesce(p_allow_export, false),
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_grant_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'grant_admin_security_auditor_access',
    'admin.write',
    'admin_security_auditor_access_grant',
    v_grant_id,
    p_request_id,
    null,
    v_auditor.auditor_auth_user_id,
    'allowed',
    'auditor access grant created',
    p_metadata || jsonb_build_object(
      'grant_type', p_grant_type,
      'allow_export', p_allow_export
    )
  );

  return v_grant_id;
end;
$$;

create or replace function revoke_admin_security_auditor(
  p_admin_auth_user_id uuid,
  p_auditor_id uuid,
  p_revoke_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_auditor admin_security_auditors%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object('action_key', 'revoke_admin_security_auditor')
  );

  if p_revoke_reason is null or length(trim(p_revoke_reason)) = 0 then
    raise exception 'auditor revoke reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select * into v_auditor
  from admin_security_auditors
  where id = p_auditor_id
  for update;

  if v_auditor.id is null then
    raise exception 'auditor not found: %', p_auditor_id;
  end if;

  update admin_security_auditors
  set
    status = 'revoked',
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_admin.id,
    revoked_at = now(),
    revoke_reason = p_revoke_reason,
    metadata = metadata || p_metadata || jsonb_build_object('revoke_request_id', p_request_id),
    updated_at = now()
  where id = v_auditor.id;

  update admin_security_auditor_access_grants
  set
    status = 'revoked',
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_admin.id,
    revoked_at = now(),
    revoke_reason = p_revoke_reason,
    updated_at = now()
  where auditor_id = v_auditor.id
    and status = 'active';

  update admin_security_auditor_sessions
  set
    status = 'revoked',
    ended_at = now()
  where auditor_id = v_auditor.id
    and status = 'active';

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_security_auditor',
    'admin.write',
    'admin_security_auditor',
    v_auditor.id,
    p_request_id,
    null,
    v_auditor.auditor_auth_user_id,
    'allowed',
    p_revoke_reason,
    p_metadata
  );

  perform create_admin_security_alert(
    'admin_security_auditor_revoked',
    'high',
    p_admin_auth_user_id,
    v_auditor.auditor_auth_user_id,
    'revoke_admin_security_auditor',
    null,
    'Security auditor access was revoked.',
    p_metadata || jsonb_build_object(
      'admin_security_auditor_id', v_auditor.id,
      'reason', p_revoke_reason
    )
  );

  return v_auditor.id;
end;
$$;

create or replace function expire_admin_security_auditors(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_auditor record;
begin
  for v_auditor in
    select *
    from admin_security_auditors
    where status = 'active'
      and access_expires_at <= now()
    order by access_expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_auditors
    set
      status = 'expired',
      metadata = metadata || p_metadata || jsonb_build_object(
        'expired_at', now(),
        'expire_run_id', v_run_id
      ),
      updated_at = now()
    where id = v_auditor.id;

    update admin_security_auditor_access_grants
    set
      status = 'expired',
      updated_at = now()
    where auditor_id = v_auditor.id
      and status = 'active';

    update admin_security_auditor_sessions
    set
      status = 'expired',
      ended_at = now()
    where auditor_id = v_auditor.id
      and status = 'active';

    perform create_admin_security_alert(
      'admin_security_auditor_expired',
      'medium',
      null,
      v_auditor.auditor_auth_user_id,
      'expire_admin_security_auditors',
      null,
      'Security auditor access expired.',
      p_metadata || jsonb_build_object(
        'admin_security_auditor_id', v_auditor.id,
        'organization_name', v_auditor.organization_name
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace view admin_security_auditor_control_coverage_public as
select
  framework_key,
  framework_name,
  framework_version,
  control_key,
  control_name,
  domain,
  control_type,
  severity,
  status,
  description,
  expected_evidence,
  mapped_policy_count,
  mapped_rule_count,
  evidence_mapping_count,
  latest_evidence_collected_at,
  coverage_status
from admin_security_control_coverage_dashboard;

create or replace view admin_security_auditor_evidence_public as
select
  ei.id as evidence_item_id,
  f.framework_key,
  f.framework_name,
  c.control_key,
  c.control_name,
  c.domain,
  c.severity,
  ei.evidence_key,
  ei.status,
  ei.source_type,
  ei.evidence_payload,
  ei.collected_at,
  ei.stale,
  ei.message
from admin_security_control_evidence_items ei
join admin_security_controls c
  on c.id = ei.admin_security_control_id
join admin_security_control_frameworks f
  on f.id = c.framework_id;

create or replace view admin_security_auditor_policy_public as
select
  p.policy_key,
  p.policy_name,
  p.category,
  p.status,
  p.version,
  p.severity,
  p.owner_team,
  p.description,
  p.effective_at,
  (
    select count(*)
    from admin_security_governance_policy_rules r
    where r.admin_security_governance_policy_id = p.admin_security_governance_policy_id
      and r.status = 'active'
  ) as active_rule_count
from admin_security_governance_policy_dashboard p
where p.status in ('active', 'superseded', 'archived');

create or replace function list_auditor_control_coverage(
  p_auditor_auth_user_id uuid,
  p_framework_key text default null,
  p_limit integer default 100,
  p_request_id text default null
)
returns setof admin_security_auditor_control_coverage_public
language plpgsql
stable
as $$
begin
  perform get_active_admin_security_auditor(p_auditor_auth_user_id);

  perform record_admin_security_auditor_access_event(
    p_auditor_auth_user_id,
    'auditor_list_control_coverage',
    'medium',
    'list_auditor_control_coverage',
    'admin_security_control_coverage',
    null,
    true,
    'auditor listed control coverage',
    p_request_id,
    jsonb_build_object('framework_key', p_framework_key)
  );

  return query
  select c.*
  from admin_security_auditor_control_coverage_public c
  join admin_security_control_frameworks f
    on f.framework_key = c.framework_key
  join admin_security_controls ctrl
    on ctrl.framework_id = f.id
   and ctrl.control_key = c.control_key
  where (p_framework_key is null or c.framework_key = p_framework_key)
    and auditor_has_security_access_grant(
      p_auditor_auth_user_id,
      f.id,
      ctrl.id,
      null,
      null,
      null,
      null,
      null,
      false
    ) is true
  limit least(greatest(coalesce(p_limit, 100), 1), 250);
end;
$$;

create or replace function list_auditor_evidence(
  p_auditor_auth_user_id uuid,
  p_framework_key text default null,
  p_control_key text default null,
  p_limit integer default 100,
  p_request_id text default null
)
returns setof admin_security_auditor_evidence_public
language plpgsql
stable
as $$
begin
  perform get_active_admin_security_auditor(p_auditor_auth_user_id);

  perform record_admin_security_auditor_access_event(
    p_auditor_auth_user_id,
    'auditor_list_evidence',
    'medium',
    'list_auditor_evidence',
    'admin_security_control_evidence',
    null,
    true,
    'auditor listed evidence',
    p_request_id,
    jsonb_build_object(
      'framework_key', p_framework_key,
      'control_key', p_control_key
    )
  );

  return query
  select e.*
  from admin_security_auditor_evidence_public e
  join admin_security_control_frameworks f
    on f.framework_key = e.framework_key
  join admin_security_controls c
    on c.framework_id = f.id
   and c.control_key = e.control_key
  where (p_framework_key is null or e.framework_key = p_framework_key)
    and (p_control_key is null or e.control_key = p_control_key)
    and auditor_has_security_access_grant(
      p_auditor_auth_user_id,
      f.id,
      c.id,
      null,
      e.evidence_key,
      e.source_type,
      null,
      null,
      false
    ) is true
  order by e.collected_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 250);
end;
$$;

create or replace function list_auditor_policies(
  p_auditor_auth_user_id uuid,
  p_category text default null,
  p_limit integer default 100,
  p_request_id text default null
)
returns setof admin_security_auditor_policy_public
language plpgsql
stable
as $$
begin
  perform get_active_admin_security_auditor(p_auditor_auth_user_id);

  perform record_admin_security_auditor_access_event(
    p_auditor_auth_user_id,
    'auditor_list_policies',
    'medium',
    'list_auditor_policies',
    'admin_security_governance_policy',
    null,
    true,
    'auditor listed governance policies',
    p_request_id,
    jsonb_build_object('category', p_category)
  );

  return query
  select p.*
  from admin_security_auditor_policy_public p
  join admin_security_governance_policies gp
    on gp.policy_key = p.policy_key
  where (p_category is null or p.category = p_category)
    and auditor_has_security_access_grant(
      p_auditor_auth_user_id,
      null,
      null,
      gp.id,
      null,
      null,
      null,
      null,
      false
    ) is true
  order by p.category, p.policy_key
  limit least(greatest(coalesce(p_limit, 100), 1), 250);
end;
$$;

create or replace function request_admin_security_auditor_export(
  p_auditor_auth_user_id uuid,
  p_export_type text,
  p_framework_key text default null,
  p_control_key text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_auditor admin_security_auditors%rowtype;
  v_framework admin_security_control_frameworks%rowtype;
  v_control admin_security_controls%rowtype;
  v_export_id uuid;
  v_export_key text;
  v_allowed boolean := false;
  v_watermark text;
begin
  v_auditor := get_active_admin_security_auditor(p_auditor_auth_user_id);

  if p_export_type not in (
    'framework_evidence_bundle',
    'control_evidence_bundle',
    'policy_mapping_bundle',
    'audit_summary_bundle'
  ) then
    raise exception 'invalid auditor export type: %', p_export_type;
  end if;

  if p_framework_key is not null then
    select * into v_framework
    from admin_security_control_frameworks
    where framework_key = p_framework_key
      and status = 'active';
  end if;

  if p_control_key is not null then
    select c.* into v_control
    from admin_security_controls c
    join admin_security_control_frameworks f
      on f.id = c.framework_id
    where c.control_key = p_control_key
      and (p_framework_key is null or f.framework_key = p_framework_key)
      and c.status = 'active'
    limit 1;
  end if;

  v_allowed := auditor_has_security_access_grant(
    p_auditor_auth_user_id,
    v_framework.id,
    v_control.id,
    null,
    null,
    null,
    p_period_start,
    p_period_end,
    true
  );

  if v_allowed is not true then
    perform record_admin_security_auditor_access_event(
      p_auditor_auth_user_id,
      'auditor_export_denied',
      'high',
      'request_admin_security_auditor_export',
      'admin_security_auditor_export_request',
      null,
      false,
      'auditor export denied by grant scope',
      p_request_id,
      p_metadata || jsonb_build_object(
        'export_type', p_export_type,
        'framework_key', p_framework_key,
        'control_key', p_control_key
      )
    );

    raise exception 'auditor export not allowed by access grant';
  end if;

  v_export_key := 'auditor_export:' || v_auditor.id::text || ':' || p_export_type || ':' || extract(epoch from now())::bigint::text;
  v_watermark := 'AUDITOR=' || v_auditor.email ||
    ';ORG=' || v_auditor.organization_name ||
    ';EXPORT_KEY=' || v_export_key ||
    ';GENERATED_FOR=' || v_auditor.purpose;

  insert into admin_security_auditor_export_requests (
    export_key,
    auditor_id,
    status,
    export_type,
    framework_id,
    control_id,
    period_start,
    period_end,
    requested_by_auth_user_id,
    watermark,
    request_id,
    metadata
  )
  values (
    v_export_key,
    v_auditor.id,
    'pending',
    p_export_type,
    v_framework.id,
    v_control.id,
    p_period_start,
    p_period_end,
    p_auditor_auth_user_id,
    v_watermark,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_export_id;

  perform record_admin_security_auditor_access_event(
    p_auditor_auth_user_id,
    'auditor_export_requested',
    'high',
    'request_admin_security_auditor_export',
    'admin_security_auditor_export_request',
    v_export_id,
    true,
    'auditor requested evidence export',
    p_request_id,
    p_metadata || jsonb_build_object(
      'export_type', p_export_type,
      'framework_key', p_framework_key,
      'control_key', p_control_key
    )
  );

  return v_export_id;
end;
$$;

create or replace function approve_admin_security_auditor_export(
  p_admin_auth_user_id uuid,
  p_export_request_id uuid,
  p_approval_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_export admin_security_auditor_export_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_approval_note is null or length(trim(p_approval_note)) = 0 then
    raise exception 'auditor export approval note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select * into v_export
  from admin_security_auditor_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'auditor export request not found: %', p_export_request_id;
  end if;

  if v_export.status <> 'pending' then
    raise exception 'auditor export cannot be approved from status: %', v_export.status;
  end if;

  update admin_security_auditor_export_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_admin_auth_user_id,
    approved_by_admin_user_id = v_admin.id,
    approved_at = now(),
    approval_note = p_approval_note,
    metadata = metadata || p_metadata || jsonb_build_object('approval_request_id', p_request_id),
    updated_at = now()
  where id = v_export.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_security_auditor_export',
    'admin.write',
    'admin_security_auditor_export_request',
    v_export.id,
    p_request_id,
    null,
    v_export.requested_by_auth_user_id,
    'allowed',
    p_approval_note,
    p_metadata
  );

  return v_export.id;
end;
$$;

create or replace view admin_security_auditor_dashboard as
select
  a.id as admin_security_auditor_id,
  a.auditor_auth_user_id,
  a.status,
  a.auditor_type,
  a.organization_name,
  a.display_name,
  a.email,
  a.purpose,
  a.access_starts_at,
  a.access_expires_at,
  a.created_by_auth_user_id,
  creator.email as created_by_email,
  a.revoked_by_auth_user_id,
  revoker.email as revoked_by_email,
  a.revoked_at,
  a.revoke_reason,
  (
    select count(*)
    from admin_security_auditor_access_grants g
    where g.auditor_id = a.id
      and g.status = 'active'
  ) as active_grant_count,
  (
    select count(*)
    from admin_security_auditor_access_events e
    where e.auditor_id = a.id
      and e.created_at >= now() - interval '30 days'
  ) as access_event_count_30d,
  (
    select count(*)
    from admin_security_auditor_export_requests er
    where er.auditor_id = a.id
      and er.created_at >= now() - interval '30 days'
  ) as export_request_count_30d,
  a.created_at,
  a.updated_at,
  a.metadata
from admin_security_auditors a
left join admin_users creator
  on creator.id = a.created_by_admin_user_id
left join admin_users revoker
  on revoker.id = a.revoked_by_admin_user_id
order by
  case a.status when 'active' then 0 else 1 end,
  a.access_expires_at asc;

create or replace view admin_security_auditor_grant_dashboard as
select
  g.id as admin_security_auditor_access_grant_id,
  g.auditor_id,
  a.email as auditor_email,
  a.organization_name,
  g.status,
  g.grant_type,
  f.framework_key,
  f.framework_name,
  c.control_key,
  c.control_name,
  p.policy_key,
  p.policy_name,
  g.evidence_key,
  g.source_type,
  g.period_start,
  g.period_end,
  g.allow_export,
  g.granted_by_auth_user_id,
  granter.email as granted_by_email,
  g.revoked_by_auth_user_id,
  revoker.email as revoked_by_email,
  g.revoked_at,
  g.revoke_reason,
  g.created_at,
  g.updated_at,
  g.metadata
from admin_security_auditor_access_grants g
join admin_security_auditors a
  on a.id = g.auditor_id
left join admin_security_control_frameworks f
  on f.id = g.framework_id
left join admin_security_controls c
  on c.id = g.control_id
left join admin_security_governance_policies p
  on p.id = g.policy_id
left join admin_users granter
  on granter.id = g.granted_by_admin_user_id
left join admin_users revoker
  on revoker.id = g.revoked_by_admin_user_id
order by g.created_at desc;

create or replace view admin_security_auditor_export_dashboard as
select
  er.id as admin_security_auditor_export_request_id,
  er.export_key,
  er.auditor_id,
  a.email as auditor_email,
  a.organization_name,
  er.status,
  er.export_type,
  f.framework_key,
  f.framework_name,
  c.control_key,
  c.control_name,
  er.period_start,
  er.period_end,
  er.requested_by_auth_user_id,
  er.requested_at,
  er.approved_by_auth_user_id,
  approver.email as approved_by_email,
  er.approved_at,
  er.approval_note,
  er.generated_at,
  er.storage_uri,
  er.checksum_sha256,
  er.payload_bytes,
  er.download_count,
  er.last_downloaded_at,
  er.created_at,
  er.updated_at,
  er.metadata
from admin_security_auditor_export_requests er
join admin_security_auditors a
  on a.id = er.auditor_id
left join admin_security_control_frameworks f
  on f.id = er.framework_id
left join admin_security_controls c
  on c.id = er.control_id
left join admin_users approver
  on approver.id = er.approved_by_admin_user_id
order by er.created_at desc;

create or replace view admin_security_auditor_integrity as
select
  (
    select count(*) from admin_security_auditors where status = 'active'
  ) as active_auditor_count,
  (
    select count(*)
    from admin_security_auditors
    where status = 'active'
      and access_expires_at <= now()
  ) as expired_unprocessed_auditor_count,
  (
    select count(*) from admin_security_auditor_access_grants where status = 'active'
  ) as active_auditor_grant_count,
  (
    select count(*)
    from admin_security_auditor_access_events
    where allowed is false
      and created_at >= now() - interval '24 hours'
  ) as denied_auditor_access_count_24h,
  (
    select count(*)
    from admin_security_auditor_export_requests
    where status = 'pending'
  ) as pending_export_request_count,
  (
    select count(*)
    from admin_security_auditor_export_requests
    where status = 'ready'
      and generated_at >= now() - interval '30 days'
  ) as ready_export_count_30d,
  now() as checked_at;

grant select on admin_security_auditor_dashboard to admin_api_role;
grant select on admin_security_auditor_grant_dashboard to admin_api_role;
grant select on admin_security_auditor_export_dashboard to admin_api_role;
grant select on admin_security_auditor_integrity to admin_api_role;

create or replace function hash_admin_security_auditor(
  p_admin_security_auditor_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_auditor admin_security_auditors%rowtype;
  v_grants jsonb;
  v_exports jsonb;
  v_payload jsonb;
begin
  select * into v_auditor
  from admin_security_auditors
  where id = p_admin_security_auditor_id;

  if v_auditor.id is null then
    raise exception 'admin security auditor not found: %', p_admin_security_auditor_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at asc), '[]'::jsonb)
  into v_grants
  from admin_security_auditor_access_grants g
  where g.auditor_id = v_auditor.id;

  select coalesce(jsonb_agg(to_jsonb(er) order by er.created_at asc), '[]'::jsonb)
  into v_exports
  from admin_security_auditor_export_requests er
  where er.auditor_id = v_auditor.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_auditor',
    'source_id', v_auditor.id,
    'auditor_auth_user_id', v_auditor.auditor_auth_user_id,
    'status', v_auditor.status,
    'auditor_type', v_auditor.auditor_type,
    'organization_name', v_auditor.organization_name,
    'email', v_auditor.email,
    'purpose', v_auditor.purpose,
    'access_starts_at', v_auditor.access_starts_at,
    'access_expires_at', v_auditor.access_expires_at,
    'revoked_at', v_auditor.revoked_at,
    'revoke_reason', v_auditor.revoke_reason,
    'grants', v_grants,
    'exports', v_exports,
    'created_at', v_auditor.created_at,
    'updated_at', v_auditor.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_auditor',
    v_auditor.id,
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

grant execute on function hash_admin_security_auditor(uuid, jsonb)
to worker_role, admin_api_role;

alter function hash_admin_security_auditor(uuid, jsonb) security definer;
alter function hash_admin_security_auditor(uuid, jsonb) set search_path = public;

alter table scheduled_jobs drop constraint if exists scheduled_jobs_group_check;
alter table scheduled_jobs add constraint scheduled_jobs_group_check
check (
  job_group in (
    'reward',
    'accounting',
    'audit',
    'wallet',
    'attention',
    'maintenance',
    'system',
    'admin'
  )
);

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
  'admin_security_auditors_expire_hourly',
  'Expire admin security auditors',
  'admin',
  true,
  '53 * * * *',
  'expire_admin_security_auditors',
  '{"batch_size": 500}'::jsonb,
  120,
  300,
  '{"priority": "high"}'::jsonb
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

  select * into v_job
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

  elsif v_job.function_name = 'expire_admin_security_auditors' then
    v_uuid_result := expire_admin_security_auditors(
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

alter table admin_security_auditors enable row level security;
alter table admin_security_auditor_access_grants enable row level security;
alter table admin_security_auditor_sessions enable row level security;
alter table admin_security_auditor_access_events enable row level security;
alter table admin_security_auditor_export_requests enable row level security;

drop policy if exists admin_security_auditors_no_user_direct_access on admin_security_auditors;
create policy admin_security_auditors_no_user_direct_access
on admin_security_auditors
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_access_grants_no_user_direct_access on admin_security_auditor_access_grants;
create policy admin_security_auditor_access_grants_no_user_direct_access
on admin_security_auditor_access_grants
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_sessions_no_user_direct_access on admin_security_auditor_sessions;
create policy admin_security_auditor_sessions_no_user_direct_access
on admin_security_auditor_sessions
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_access_events_no_user_direct_access on admin_security_auditor_access_events;
create policy admin_security_auditor_access_events_no_user_direct_access
on admin_security_auditor_access_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_auditor_export_requests_no_user_direct_access on admin_security_auditor_export_requests;
create policy admin_security_auditor_export_requests_no_user_direct_access
on admin_security_auditor_export_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_auditors on admin_security_auditors;
create policy admin_api_all_admin_security_auditors
on admin_security_auditors
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_auditor_access_grants on admin_security_auditor_access_grants;
create policy admin_api_all_admin_security_auditor_access_grants
on admin_security_auditor_access_grants
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_read_admin_security_auditor_sessions on admin_security_auditor_sessions;
create policy admin_api_read_admin_security_auditor_sessions
on admin_security_auditor_sessions
for select
to admin_api_role
using (true);

drop policy if exists admin_api_read_admin_security_auditor_access_events on admin_security_auditor_access_events;
create policy admin_api_read_admin_security_auditor_access_events
on admin_security_auditor_access_events
for select
to admin_api_role
using (true);

drop policy if exists admin_api_all_admin_security_auditor_export_requests on admin_security_auditor_export_requests;
create policy admin_api_all_admin_security_auditor_export_requests
on admin_security_auditor_export_requests
for all
to admin_api_role
using (true)
with check (true);

grant execute on function get_active_admin_security_auditor(uuid)
to admin_api_role, worker_role;

grant execute on function record_admin_security_auditor_access_event(
  uuid, text, text, text, text, uuid, boolean, text, text, jsonb
) to admin_api_role, worker_role;

grant execute on function auditor_has_security_access_grant(
  uuid, uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean
) to admin_api_role, worker_role;

grant execute on function create_admin_security_auditor(
  uuid, uuid, text, text, text, text, text, timestamptz, timestamptz, text, jsonb
) to admin_api_role;

grant execute on function grant_admin_security_auditor_access(
  uuid, uuid, text, uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean, text, jsonb
) to admin_api_role;

grant execute on function revoke_admin_security_auditor(uuid, uuid, text, text, jsonb)
to admin_api_role;

grant execute on function expire_admin_security_auditors(integer, jsonb)
to worker_role;

grant execute on function list_auditor_control_coverage(uuid, text, integer, text)
to admin_api_role;

grant execute on function list_auditor_evidence(uuid, text, text, integer, text)
to admin_api_role;

grant execute on function list_auditor_policies(uuid, text, integer, text)
to admin_api_role;

grant execute on function request_admin_security_auditor_export(
  uuid, text, text, text, timestamptz, timestamptz, text, jsonb
) to admin_api_role;

grant execute on function approve_admin_security_auditor_export(uuid, uuid, text, text, jsonb)
to admin_api_role;

alter function get_active_admin_security_auditor(uuid) security definer;
alter function get_active_admin_security_auditor(uuid) set search_path = public;

alter function record_admin_security_auditor_access_event(
  uuid, text, text, text, text, uuid, boolean, text, text, jsonb
) security definer;
alter function record_admin_security_auditor_access_event(
  uuid, text, text, text, text, uuid, boolean, text, text, jsonb
) set search_path = public;

alter function auditor_has_security_access_grant(
  uuid, uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean
) security definer;
alter function auditor_has_security_access_grant(
  uuid, uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean
) set search_path = public;

alter function create_admin_security_auditor(
  uuid, uuid, text, text, text, text, text, timestamptz, timestamptz, text, jsonb
) security definer;
alter function create_admin_security_auditor(
  uuid, uuid, text, text, text, text, text, timestamptz, timestamptz, text, jsonb
) set search_path = public;

alter function grant_admin_security_auditor_access(
  uuid, uuid, text, uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean, text, jsonb
) security definer;
alter function grant_admin_security_auditor_access(
  uuid, uuid, text, uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean, text, jsonb
) set search_path = public;

alter function revoke_admin_security_auditor(uuid, uuid, text, text, jsonb) security definer;
alter function revoke_admin_security_auditor(uuid, uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_security_auditors(integer, jsonb) security definer;
alter function expire_admin_security_auditors(integer, jsonb) set search_path = public;

alter function list_auditor_control_coverage(uuid, text, integer, text) security definer;
alter function list_auditor_control_coverage(uuid, text, integer, text) set search_path = public;

alter function list_auditor_evidence(uuid, text, text, integer, text) security definer;
alter function list_auditor_evidence(uuid, text, text, integer, text) set search_path = public;

alter function list_auditor_policies(uuid, text, integer, text) security definer;
alter function list_auditor_policies(uuid, text, integer, text) set search_path = public;

alter function request_admin_security_auditor_export(
  uuid, text, text, text, timestamptz, timestamptz, text, jsonb
) security definer;
alter function request_admin_security_auditor_export(
  uuid, text, text, text, timestamptz, timestamptz, text, jsonb
) set search_path = public;

alter function approve_admin_security_auditor_export(uuid, uuid, text, text, jsonb) security definer;
alter function approve_admin_security_auditor_export(uuid, uuid, text, text, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_AUDITOR_NOT_FOUND',
    'permission',
    'high',
    403,
    false,
    true,
    'Auditor access not found or expired.',
    'Active security auditor access not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDITOR_EXPORT_DENIED',
    'permission',
    'high',
    403,
    false,
    true,
    'Auditor export is not allowed by access grant.',
    'Auditor export denied by grant scope.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDITOR_INVALID_STATE',
    'validation',
    'medium',
    409,
    false,
    true,
    'Auditor access cannot be changed from its current state.',
    'Auditor access invalid lifecycle state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDITOR_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Auditor access requires complete fields.',
    'Auditor access required fields missing.',
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
  ('active auditor access not found', 'ADMIN_SECURITY_AUDITOR_NOT_FOUND', 5, '{}'),
  ('auditor not found', 'ADMIN_SECURITY_AUDITOR_NOT_FOUND', 5, '{}'),
  ('auditor export not allowed by access grant', 'ADMIN_SECURITY_AUDITOR_EXPORT_DENIED', 5, '{}'),
  ('auditor access grant cannot be added to status', 'ADMIN_SECURITY_AUDITOR_INVALID_STATE', 5, '{}'),
  ('auditor access expiry must be after start', 'ADMIN_SECURITY_AUDITOR_REQUIRED_FIELDS', 5, '{}'),
  ('auditor auth user id is required', 'ADMIN_SECURITY_AUDITOR_REQUIRED_FIELDS', 5, '{}'),
  ('auditor revoke reason is required', 'ADMIN_SECURITY_AUDITOR_REQUIRED_FIELDS', 5, '{}'),
  ('auditor export approval note is required', 'ADMIN_SECURITY_AUDITOR_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
