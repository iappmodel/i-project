-- Step 9.45 — Build auditor export generation worker.
-- Runs after 159_admin_security_auditor_access_mode.sql.

alter table admin_security_auditor_export_requests
add column if not exists claimed_by_worker_id text,
add column if not exists claimed_at timestamptz,
add column if not exists expires_at timestamptz,
add column if not exists export_format text not null default 'json',
add column if not exists item_count integer not null default 0,
add column if not exists last_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_security_auditor_export_requests_format_check'
  ) then
    alter table admin_security_auditor_export_requests
    add constraint admin_security_auditor_export_requests_format_check
    check (
      export_format in (
        'json',
        'csv',
        'pdf'
      )
    );
  end if;
end $$;

create index if not exists admin_security_auditor_export_requests_claim_idx
on admin_security_auditor_export_requests (status, created_at asc)
where status in ('approved', 'failed');

create index if not exists admin_security_auditor_export_requests_expiry_idx
on admin_security_auditor_export_requests (expires_at)
where status = 'ready';

create table if not exists admin_security_auditor_export_items (
  id uuid primary key default gen_random_uuid(),
  auditor_export_request_id uuid not null
    references admin_security_auditor_export_requests(id)
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
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_security_auditor_export_items_item_type_check
  check (
    item_type in (
      'control_coverage',
      'evidence',
      'policy',
      'mapping',
      'summary',
      'manifest'
    )
  ),
  constraint admin_security_auditor_export_items_status_check
  check (
    item_status in (
      'included',
      'redacted',
      'skipped',
      'error'
    )
  ),
  constraint admin_security_auditor_export_items_redaction_check
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

create index if not exists admin_security_auditor_export_items_request_idx
on admin_security_auditor_export_items (auditor_export_request_id, item_type);

create index if not exists admin_security_auditor_export_items_control_idx
on admin_security_auditor_export_items (framework_key, control_key);

create index if not exists admin_security_auditor_export_items_evidence_idx
on admin_security_auditor_export_items (evidence_key, source_type);

create or replace function claim_admin_security_auditor_exports(
  p_batch_size integer default 5,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  export_request_id uuid,
  export_key text,
  auditor_id uuid,
  auditor_auth_user_id uuid,
  export_type text,
  export_format text,
  framework_key text,
  control_key text,
  period_start timestamptz,
  period_end timestamptz,
  watermark text
)
language plpgsql
as $$
begin
  if p_batch_size <= 0 or p_batch_size > 25 then
    raise exception 'batch size must be between 1 and 25';
  end if;

  return query
  with candidates as (
    select er.id
    from admin_security_auditor_export_requests er
    join admin_security_auditors a
      on a.id = er.auditor_id
    where er.status in ('approved', 'failed')
      and a.status = 'active'
      and a.access_expires_at > now()
      and (
        er.status = 'approved'
        or (
          er.status = 'failed'
          and er.created_at >= now() - interval '7 days'
        )
      )
    order by er.approved_at asc nulls last, er.created_at asc
    limit p_batch_size
    for update skip locked
  ),
  updated as (
    update admin_security_auditor_export_requests er
    set
      status = 'generating',
      claimed_by_worker_id = p_worker_id,
      claimed_at = now(),
      last_error = null,
      metadata = er.metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
    from candidates
    where er.id = candidates.id
    returning er.*
  )
  select
    u.id as export_request_id,
    u.export_key,
    u.auditor_id,
    a.auditor_auth_user_id,
    u.export_type,
    u.export_format,
    f.framework_key,
    c.control_key,
    u.period_start,
    u.period_end,
    u.watermark
  from updated u
  join admin_security_auditors a
    on a.id = u.auditor_id
  left join admin_security_control_frameworks f
    on f.id = u.framework_id
  left join admin_security_controls c
    on c.id = u.control_id;
end;
$$;

create or replace function build_admin_security_auditor_export_items(
  p_export_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_export admin_security_auditor_export_requests%rowtype;
  v_auditor admin_security_auditors%rowtype;
  v_framework admin_security_control_frameworks%rowtype;
  v_control admin_security_controls%rowtype;
  v_item_count integer := 0;
begin
  if p_export_request_id is null then
    raise exception 'auditor export request id is required';
  end if;

  select *
  into v_export
  from admin_security_auditor_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'auditor export request not found: %', p_export_request_id;
  end if;

  select *
  into v_auditor
  from admin_security_auditors
  where id = v_export.auditor_id;

  if v_auditor.id is null or v_auditor.status <> 'active' then
    raise exception 'active auditor not found for export request';
  end if;

  if v_export.framework_id is not null then
    select *
    into v_framework
    from admin_security_control_frameworks
    where id = v_export.framework_id;
  end if;

  if v_export.control_id is not null then
    select *
    into v_control
    from admin_security_controls
    where id = v_export.control_id;
  end if;

  delete from admin_security_auditor_export_items
  where auditor_export_request_id = v_export.id;

  insert into admin_security_auditor_export_items (
    auditor_export_request_id,
    item_type,
    source_type,
    source_id,
    framework_key,
    control_key,
    item_status,
    redaction_level,
    payload,
    metadata
  )
  values (
    v_export.id,
    'manifest',
    'admin_security_auditor_export_request',
    v_export.id,
    v_framework.framework_key,
    v_control.control_key,
    'included',
    'auditor_safe',
    jsonb_build_object(
      'export_key', v_export.export_key,
      'export_type', v_export.export_type,
      'export_format', v_export.export_format,
      'auditor_email', v_auditor.email,
      'organization_name', v_auditor.organization_name,
      'purpose', v_auditor.purpose,
      'framework_key', v_framework.framework_key,
      'control_key', v_control.control_key,
      'period_start', v_export.period_start,
      'period_end', v_export.period_end,
      'watermark', v_export.watermark,
      'generated_at', now()
    ),
    coalesce(p_metadata, '{}'::jsonb)
  );

  if v_export.export_type = 'framework_evidence_bundle' then
    insert into admin_security_auditor_export_items (
      auditor_export_request_id,
      item_type,
      source_type,
      framework_key,
      control_key,
      item_status,
      redaction_level,
      payload,
      metadata
    )
    select
      v_export.id,
      'control_coverage',
      'admin_security_control_coverage',
      c.framework_key,
      c.control_key,
      'included',
      'auditor_safe',
      to_jsonb(c),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_auditor_control_coverage_public c
    join admin_security_control_frameworks f
      on f.framework_key = c.framework_key
    join admin_security_controls ctrl
      on ctrl.framework_id = f.id
     and ctrl.control_key = c.control_key
    where (v_framework.id is null or f.id = v_framework.id)
      and auditor_has_security_access_grant(
        v_auditor.auditor_auth_user_id,
        f.id,
        ctrl.id,
        null,
        null,
        null,
        v_export.period_start,
        v_export.period_end,
        true
      ) is true;

    insert into admin_security_auditor_export_items (
      auditor_export_request_id,
      item_type,
      source_type,
      framework_key,
      control_key,
      evidence_key,
      item_status,
      redaction_level,
      payload,
      metadata
    )
    select
      v_export.id,
      'evidence',
      e.source_type,
      e.framework_key,
      e.control_key,
      e.evidence_key,
      'included',
      'auditor_safe',
      to_jsonb(e),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_auditor_evidence_public e
    join admin_security_control_frameworks f
      on f.framework_key = e.framework_key
    join admin_security_controls ctrl
      on ctrl.framework_id = f.id
     and ctrl.control_key = e.control_key
    where (v_framework.id is null or f.id = v_framework.id)
      and auditor_has_security_access_grant(
        v_auditor.auditor_auth_user_id,
        f.id,
        ctrl.id,
        null,
        e.evidence_key,
        e.source_type,
        v_export.period_start,
        v_export.period_end,
        true
      ) is true;

  elsif v_export.export_type = 'control_evidence_bundle' then
    insert into admin_security_auditor_export_items (
      auditor_export_request_id,
      item_type,
      source_type,
      framework_key,
      control_key,
      item_status,
      redaction_level,
      payload,
      metadata
    )
    select
      v_export.id,
      'control_coverage',
      'admin_security_control_coverage',
      c.framework_key,
      c.control_key,
      'included',
      'auditor_safe',
      to_jsonb(c),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_auditor_control_coverage_public c
    join admin_security_control_frameworks f
      on f.framework_key = c.framework_key
    join admin_security_controls ctrl
      on ctrl.framework_id = f.id
     and ctrl.control_key = c.control_key
    where (v_control.id is null or ctrl.id = v_control.id)
      and (v_framework.id is null or f.id = v_framework.id)
      and auditor_has_security_access_grant(
        v_auditor.auditor_auth_user_id,
        f.id,
        ctrl.id,
        null,
        null,
        null,
        v_export.period_start,
        v_export.period_end,
        true
      ) is true;

    insert into admin_security_auditor_export_items (
      auditor_export_request_id,
      item_type,
      source_type,
      framework_key,
      control_key,
      evidence_key,
      item_status,
      redaction_level,
      payload,
      metadata
    )
    select
      v_export.id,
      'evidence',
      e.source_type,
      e.framework_key,
      e.control_key,
      e.evidence_key,
      'included',
      'auditor_safe',
      to_jsonb(e),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_auditor_evidence_public e
    join admin_security_control_frameworks f
      on f.framework_key = e.framework_key
    join admin_security_controls ctrl
      on ctrl.framework_id = f.id
     and ctrl.control_key = e.control_key
    where (v_control.id is null or ctrl.id = v_control.id)
      and (v_framework.id is null or f.id = v_framework.id)
      and auditor_has_security_access_grant(
        v_auditor.auditor_auth_user_id,
        f.id,
        ctrl.id,
        null,
        e.evidence_key,
        e.source_type,
        v_export.period_start,
        v_export.period_end,
        true
      ) is true;

  elsif v_export.export_type = 'policy_mapping_bundle' then
    insert into admin_security_auditor_export_items (
      auditor_export_request_id,
      item_type,
      source_type,
      framework_key,
      control_key,
      policy_key,
      item_status,
      redaction_level,
      payload,
      metadata
    )
    select
      v_export.id,
      'mapping',
      'admin_security_policy_control_mapping',
      m.framework_key,
      m.control_key,
      m.policy_key,
      'included',
      'auditor_safe',
      to_jsonb(m),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_policy_control_mapping_dashboard m
    join admin_security_control_frameworks f
      on f.framework_key = m.framework_key
    join admin_security_controls ctrl
      on ctrl.framework_id = f.id
     and ctrl.control_key = m.control_key
    join admin_security_governance_policies p
      on p.policy_key = m.policy_key
    where (v_framework.id is null or f.id = v_framework.id)
      and (v_control.id is null or ctrl.id = v_control.id)
      and auditor_has_security_access_grant(
        v_auditor.auditor_auth_user_id,
        f.id,
        ctrl.id,
        p.id,
        null,
        null,
        v_export.period_start,
        v_export.period_end,
        true
      ) is true;

    insert into admin_security_auditor_export_items (
      auditor_export_request_id,
      item_type,
      source_type,
      policy_key,
      item_status,
      redaction_level,
      payload,
      metadata
    )
    select
      v_export.id,
      'policy',
      'admin_security_governance_policy',
      p.policy_key,
      'included',
      'auditor_safe',
      to_jsonb(p),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_auditor_policy_public p
    join admin_security_governance_policies gp
      on gp.policy_key = p.policy_key
    where auditor_has_security_access_grant(
      v_auditor.auditor_auth_user_id,
      null,
      null,
      gp.id,
      null,
      null,
      v_export.period_start,
      v_export.period_end,
      true
    ) is true;

  elsif v_export.export_type = 'audit_summary_bundle' then
    insert into admin_security_auditor_export_items (
      auditor_export_request_id,
      item_type,
      source_type,
      item_status,
      redaction_level,
      payload,
      metadata
    )
    values (
      v_export.id,
      'summary',
      'admin_security_audit_summary',
      'included',
      'auditor_safe',
      jsonb_build_object(
        'control_integrity',
        (
          select to_jsonb(i)
          from admin_security_control_mapping_integrity i
          limit 1
        ),
        'governance_integrity',
        (
          select to_jsonb(i)
          from admin_security_governance_policy_integrity i
          limit 1
        ),
        'policy_change_integrity',
        (
          select to_jsonb(i)
          from admin_security_policy_change_integrity i
          limit 1
        ),
        'audit_hash_integrity',
        (
          select to_jsonb(i)
          from audit_hash_integrity i
          limit 1
        )
      ),
      coalesce(p_metadata, '{}'::jsonb)
    );

  else
    raise exception 'unsupported auditor export type: %', v_export.export_type;
  end if;

  select count(*)
  into v_item_count
  from admin_security_auditor_export_items
  where auditor_export_request_id = v_export.id;

  update admin_security_auditor_export_requests
  set
    item_count = v_item_count,
    metadata = metadata || jsonb_build_object(
      'items_built_at',
      now(),
      'item_count',
      v_item_count
    ),
    updated_at = now()
  where id = v_export.id;

  if v_item_count <= 1 then
    raise exception 'auditor export has no scoped evidence items';
  end if;

  return v_item_count;
end;
$$;

create or replace function complete_admin_security_auditor_export(
  p_export_request_id uuid,
  p_storage_uri text,
  p_checksum_sha256 text,
  p_payload_bytes bigint,
  p_item_count integer,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_export admin_security_auditor_export_requests%rowtype;
begin
  if p_export_request_id is null then
    raise exception 'auditor export request id is required';
  end if;

  if p_storage_uri is null or length(trim(p_storage_uri)) = 0 then
    raise exception 'auditor export storage uri is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'auditor export checksum is required';
  end if;

  select *
  into v_export
  from admin_security_auditor_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'auditor export request not found: %', p_export_request_id;
  end if;

  if v_export.status <> 'generating' then
    raise exception 'auditor export cannot be completed from status: %', v_export.status;
  end if;

  update admin_security_auditor_export_requests
  set
    status = 'ready',
    generated_at = now(),
    generated_by_worker_id = p_worker_id,
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    payload_bytes = p_payload_bytes,
    item_count = coalesce(p_item_count, item_count),
    expires_at = now() + interval '14 days',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'completed_by_worker_id',
      p_worker_id
    ),
    updated_at = now()
  where id = v_export.id;

  perform record_admin_security_auditor_access_event(
    v_export.requested_by_auth_user_id,
    'auditor_export_ready',
    'high',
    'complete_admin_security_auditor_export',
    'admin_security_auditor_export_request',
    v_export.id,
    true,
    'auditor export generated and ready',
    v_export.request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'storage_uri',
      p_storage_uri,
      'checksum_sha256',
      p_checksum_sha256,
      'payload_bytes',
      p_payload_bytes
    )
  );

  perform create_admin_security_alert(
    'admin_security_auditor_export_ready',
    'medium',
    null,
    v_export.requested_by_auth_user_id,
    'complete_admin_security_auditor_export',
    null,
    'Auditor evidence export is ready.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'admin_security_auditor_export_request_id',
      v_export.id,
      'export_key',
      v_export.export_key,
      'expires_at',
      now() + interval '14 days'
    )
  );

  return v_export.id;
end;
$$;

create or replace function fail_admin_security_auditor_export(
  p_export_request_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_export admin_security_auditor_export_requests%rowtype;
begin
  if p_export_request_id is null then
    raise exception 'auditor export request id is required';
  end if;

  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'auditor export error is required';
  end if;

  select *
  into v_export
  from admin_security_auditor_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'auditor export request not found: %', p_export_request_id;
  end if;

  update admin_security_auditor_export_requests
  set
    status = 'failed',
    last_error = p_error,
    generated_by_worker_id = p_worker_id,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'failed_by_worker_id',
      p_worker_id,
      'failed_at',
      now()
    ),
    updated_at = now()
  where id = v_export.id;

  perform record_admin_security_auditor_access_event(
    v_export.requested_by_auth_user_id,
    'auditor_export_failed',
    'high',
    'fail_admin_security_auditor_export',
    'admin_security_auditor_export_request',
    v_export.id,
    false,
    p_error,
    v_export.request_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  perform create_admin_security_alert(
    'admin_security_auditor_export_failed',
    'high',
    null,
    v_export.requested_by_auth_user_id,
    'fail_admin_security_auditor_export',
    null,
    'Auditor evidence export generation failed.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'admin_security_auditor_export_request_id',
      v_export.id,
      'error',
      p_error
    )
  );

  return v_export.id;
end;
$$;

create or replace function expire_admin_security_auditor_exports(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_export record;
begin
  for v_export in
    select *
    from admin_security_auditor_export_requests
    where status = 'ready'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_auditor_export_requests
    set
      status = 'expired',
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_at',
        now(),
        'expire_run_id',
        v_run_id
      ),
      updated_at = now()
    where id = v_export.id;

    perform record_admin_security_auditor_access_event(
      v_export.requested_by_auth_user_id,
      'auditor_export_expired',
      'medium',
      'expire_admin_security_auditor_exports',
      'admin_security_auditor_export_request',
      v_export.id,
      true,
      'auditor export expired',
      v_export.request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function register_admin_security_auditor_export_download(
  p_auditor_auth_user_id uuid,
  p_export_request_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  export_request_id uuid,
  export_key text,
  storage_uri text,
  checksum_sha256 text,
  payload_bytes bigint,
  watermark text,
  expires_at timestamptz
)
language plpgsql
as $$
declare
  v_auditor admin_security_auditors%rowtype;
  v_export admin_security_auditor_export_requests%rowtype;
begin
  v_auditor := get_active_admin_security_auditor(p_auditor_auth_user_id);

  select *
  into v_export
  from admin_security_auditor_export_requests
  where id = p_export_request_id
    and auditor_id = v_auditor.id
  for update;

  if v_export.id is null then
    perform record_admin_security_auditor_access_event(
      p_auditor_auth_user_id,
      'auditor_export_download_denied',
      'high',
      'register_admin_security_auditor_export_download',
      'admin_security_auditor_export_request',
      p_export_request_id,
      false,
      'export request not found for auditor',
      p_request_id,
      coalesce(p_metadata, '{}'::jsonb)
    );

    raise exception 'auditor export request not found';
  end if;

  if v_export.status <> 'ready' then
    raise exception 'auditor export is not ready: %', v_export.status;
  end if;

  if v_export.expires_at is not null and v_export.expires_at <= now() then
    raise exception 'auditor export has expired';
  end if;

  update admin_security_auditor_export_requests
  set
    download_count = download_count + 1,
    last_downloaded_at = now(),
    metadata = metadata || jsonb_build_object(
      'last_download_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_export.id;

  perform record_admin_security_auditor_access_event(
    p_auditor_auth_user_id,
    'auditor_export_downloaded',
    'high',
    'register_admin_security_auditor_export_download',
    'admin_security_auditor_export_request',
    v_export.id,
    true,
    'auditor export downloaded',
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'export_key',
      v_export.export_key,
      'checksum_sha256',
      v_export.checksum_sha256
    )
  );

  return query
  select
    v_export.id,
    v_export.export_key,
    v_export.storage_uri,
    v_export.checksum_sha256,
    v_export.payload_bytes,
    v_export.watermark,
    v_export.expires_at;
end;
$$;

create or replace view admin_security_auditor_export_dashboard as
select
  er.id as admin_security_auditor_export_request_id,
  er.export_key,
  er.auditor_id,
  a.email as auditor_email,
  a.organization_name,
  er.status,
  er.export_type,
  er.export_format,
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
  er.claimed_by_worker_id,
  er.claimed_at,
  er.generated_at,
  er.generated_by_worker_id,
  er.storage_uri,
  er.checksum_sha256,
  er.payload_bytes,
  er.item_count,
  er.expires_at,
  er.last_error,
  er.download_count,
  er.last_downloaded_at,
  er.watermark,
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

create or replace view admin_security_auditor_export_item_dashboard as
select
  i.id as admin_security_auditor_export_item_id,
  i.auditor_export_request_id,
  er.export_key,
  er.status as export_status,
  er.export_type,
  a.email as auditor_email,
  a.organization_name,
  i.item_type,
  i.source_type,
  i.source_id,
  i.framework_key,
  i.control_key,
  i.policy_key,
  i.evidence_key,
  i.item_status,
  i.redaction_level,
  i.created_at,
  i.metadata
from admin_security_auditor_export_items i
join admin_security_auditor_export_requests er
  on er.id = i.auditor_export_request_id
join admin_security_auditors a
  on a.id = er.auditor_id
order by i.created_at desc;

create or replace view admin_security_auditor_export_integrity as
select
  (
    select count(*)
    from admin_security_auditor_export_requests
    where status = 'approved'
  ) as approved_export_count,
  (
    select count(*)
    from admin_security_auditor_export_requests
    where status = 'generating'
  ) as generating_export_count,
  (
    select count(*)
    from admin_security_auditor_export_requests
    where status = 'ready'
  ) as ready_export_count,
  (
    select count(*)
    from admin_security_auditor_export_requests
    where status = 'failed'
  ) as failed_export_count,
  (
    select count(*)
    from admin_security_auditor_export_requests
    where status = 'ready'
      and expires_at <= now()
  ) as expired_unprocessed_export_count,
  (
    select coalesce(sum(download_count), 0)
    from admin_security_auditor_export_requests
    where created_at >= now() - interval '30 days'
  ) as export_download_count_30d,
  now() as checked_at;

grant select on admin_security_auditor_export_item_dashboard to admin_api_role;
grant select on admin_security_auditor_export_integrity to admin_api_role;

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
  'admin_security_auditor_exports_expire_hourly',
  'Expire admin security auditor exports',
  'admin',
  true,
  '59 * * * *',
  'expire_admin_security_auditor_exports',
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

alter table admin_security_auditor_export_items enable row level security;

drop policy if exists admin_security_auditor_export_items_no_user_direct_access
on admin_security_auditor_export_items;
create policy admin_security_auditor_export_items_no_user_direct_access
on admin_security_auditor_export_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_auditor_export_items
on admin_security_auditor_export_items;
create policy admin_api_all_admin_security_auditor_export_items
on admin_security_auditor_export_items
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_auditor_export_items
on admin_security_auditor_export_items;
create policy worker_all_admin_security_auditor_export_items
on admin_security_auditor_export_items
for all
to worker_role
using (true)
with check (true);

grant execute on function claim_admin_security_auditor_exports(integer, text, jsonb)
to worker_role;

grant execute on function build_admin_security_auditor_export_items(uuid, jsonb)
to worker_role, admin_api_role;

grant execute on function complete_admin_security_auditor_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  text,
  jsonb
) to worker_role;

grant execute on function fail_admin_security_auditor_export(uuid, text, text, jsonb)
to worker_role;

grant execute on function expire_admin_security_auditor_exports(integer, jsonb)
to worker_role;

grant execute on function register_admin_security_auditor_export_download(uuid, uuid, text, jsonb)
to admin_api_role;

alter function claim_admin_security_auditor_exports(integer, text, jsonb) security definer;
alter function claim_admin_security_auditor_exports(integer, text, jsonb) set search_path = public;

alter function build_admin_security_auditor_export_items(uuid, jsonb) security definer;
alter function build_admin_security_auditor_export_items(uuid, jsonb) set search_path = public;

alter function complete_admin_security_auditor_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  text,
  jsonb
) security definer;
alter function complete_admin_security_auditor_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  text,
  jsonb
) set search_path = public;

alter function fail_admin_security_auditor_export(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_auditor_export(uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_security_auditor_exports(integer, jsonb) security definer;
alter function expire_admin_security_auditor_exports(integer, jsonb) set search_path = public;

alter function register_admin_security_auditor_export_download(uuid, uuid, text, jsonb) security definer;
alter function register_admin_security_auditor_export_download(uuid, uuid, text, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_AUDITOR_EXPORT_NOT_READY',
    'validation',
    'medium',
    409,
    false,
    true,
    'Auditor export is not ready.',
    'Auditor export download attempted before ready state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDITOR_EXPORT_EXPIRED',
    'validation',
    'medium',
    410,
    false,
    true,
    'Auditor export has expired.',
    'Auditor export download attempted after expiry.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDITOR_EXPORT_GENERATION_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Auditor export generation failed.',
    'Auditor export worker failed.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDITOR_EXPORT_EMPTY',
    'validation',
    'high',
    409,
    false,
    true,
    'Auditor export has no scoped evidence items.',
    'Auditor export generated no scoped evidence items.',
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
  ('auditor export is not ready', 'ADMIN_SECURITY_AUDITOR_EXPORT_NOT_READY', 5, '{}'),
  ('auditor export has expired', 'ADMIN_SECURITY_AUDITOR_EXPORT_EXPIRED', 5, '{}'),
  ('auditor export cannot be completed from status', 'ADMIN_SECURITY_AUDITOR_EXPORT_GENERATION_FAILED', 5, '{}'),
  ('auditor export storage uri is required', 'ADMIN_SECURITY_AUDITOR_EXPORT_GENERATION_FAILED', 5, '{}'),
  ('auditor export checksum is required', 'ADMIN_SECURITY_AUDITOR_EXPORT_GENERATION_FAILED', 5, '{}'),
  ('auditor export has no scoped evidence items', 'ADMIN_SECURITY_AUDITOR_EXPORT_EMPTY', 5, '{}')
on conflict do nothing;
