-- Step 9.47 — Build sealed audit-period export bundle.
-- Runs after 161_admin_security_audit_period_snapshots.sql.

create table if not exists admin_security_audit_period_export_requests (
  id uuid primary key default gen_random_uuid(),

  export_key text not null unique,

  audit_period_id uuid not null
    references admin_security_audit_periods(id)
    on delete cascade,

  status text not null default 'pending',

  export_type text not null default 'full_period_bundle',
  export_format text not null default 'json',

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
  item_count integer not null default 0,

  watermark text not null,

  expires_at timestamptz,

  download_count integer not null default 0,
  last_downloaded_at timestamptz,

  last_error text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_audit_period_export_requests_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected',
      'generating',
      'ready',
      'failed',
      'expired',
      'revoked'
    )
  ),

  constraint admin_security_audit_period_export_requests_type_check
  check (
    export_type in (
      'full_period_bundle',
      'snapshot_bundle',
      'evidence_bundle',
      'executive_summary_bundle',
      'auditor_safe_bundle'
    )
  ),

  constraint admin_security_audit_period_export_requests_format_check
  check (
    export_format in (
      'json',
      'csv',
      'pdf'
    )
  )
);

create index if not exists admin_security_audit_period_export_requests_period_idx
on admin_security_audit_period_export_requests (audit_period_id, created_at desc);

create index if not exists admin_security_audit_period_export_requests_status_idx
on admin_security_audit_period_export_requests (status, created_at asc);

create index if not exists admin_security_audit_period_export_requests_auditor_idx
on admin_security_audit_period_export_requests (requested_for_auditor_id, created_at desc);

drop trigger if exists admin_security_audit_period_export_requests_set_updated_at
on admin_security_audit_period_export_requests;

create trigger admin_security_audit_period_export_requests_set_updated_at
before update on admin_security_audit_period_export_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_audit_period_export_items (
  id uuid primary key default gen_random_uuid(),

  audit_period_export_request_id uuid not null
    references admin_security_audit_period_export_requests(id)
    on delete cascade,

  audit_period_id uuid not null
    references admin_security_audit_periods(id)
    on delete cascade,

  audit_period_snapshot_id uuid
    references admin_security_audit_period_snapshots(id)
    on delete set null,

  audit_period_snapshot_item_id uuid
    references admin_security_audit_period_snapshot_items(id)
    on delete set null,

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
  payload_checksum_sha256 text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint admin_security_audit_period_export_items_type_check
  check (
    item_type in (
      'manifest',
      'audit_period',
      'snapshot',
      'snapshot_item',
      'summary',
      'hash_reference'
    )
  ),

  constraint admin_security_audit_period_export_items_status_check
  check (
    item_status in (
      'included',
      'redacted',
      'skipped',
      'error'
    )
  ),

  constraint admin_security_audit_period_export_items_redaction_check
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

create index if not exists admin_security_audit_period_export_items_request_idx
on admin_security_audit_period_export_items (
  audit_period_export_request_id,
  item_type
);

create index if not exists admin_security_audit_period_export_items_period_idx
on admin_security_audit_period_export_items (
  audit_period_id,
  item_type
);

create index if not exists admin_security_audit_period_export_items_snapshot_idx
on admin_security_audit_period_export_items (
  audit_period_snapshot_id,
  audit_period_snapshot_item_id
);

create or replace function request_admin_security_audit_period_export(
  p_admin_auth_user_id uuid,
  p_audit_period_id uuid,
  p_export_type text default 'full_period_bundle',
  p_export_format text default 'json',
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
  v_auditor admin_security_auditors%rowtype;
  v_export_id uuid;
  v_export_key text;
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
    raise exception 'audit period export requires sealed period';
  end if;

  if p_export_type not in (
    'full_period_bundle',
    'snapshot_bundle',
    'evidence_bundle',
    'executive_summary_bundle',
    'auditor_safe_bundle'
  ) then
    raise exception 'invalid audit period export type: %', p_export_type;
  end if;

  if p_export_format not in ('json', 'csv', 'pdf') then
    raise exception 'invalid audit period export format: %', p_export_format;
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

  v_export_key :=
    'audit_period_export:' ||
    v_period.period_key || ':' ||
    p_export_type || ':' ||
    extract(epoch from now())::bigint::text;

  v_watermark :=
    'AUDIT_PERIOD=' || v_period.period_key ||
    ';EXPORT_KEY=' || v_export_key ||
    ';SEALED_CHECKSUM=' || coalesce(v_period.seal_checksum_sha256, 'none') ||
    case
      when v_auditor.id is not null then
        ';AUDITOR=' || v_auditor.email || ';ORG=' || v_auditor.organization_name
      else
        ';REQUESTED_BY_ADMIN=' || p_admin_auth_user_id::text
    end;

  insert into admin_security_audit_period_export_requests (
    export_key,
    audit_period_id,
    status,
    export_type,
    export_format,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    requested_for_auditor_id,
    watermark,
    request_id,
    metadata
  )
  values (
    v_export_key,
    v_period.id,
    'pending',
    p_export_type,
    p_export_format,
    p_admin_auth_user_id,
    v_admin.id,
    p_requested_for_auditor_id,
    v_watermark,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_export_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'request_admin_security_audit_period_export',
    'admin.read',
    'admin_security_audit_period_export_request',
    v_export_id,
    p_request_id,
    null,
    null,
    'allowed',
    'audit period export requested',
    p_metadata || jsonb_build_object(
      'audit_period_id',
      v_period.id,
      'period_key',
      v_period.period_key,
      'export_type',
      p_export_type,
      'export_format',
      p_export_format
    )
  );

  return v_export_id;
end;
$$;

create or replace function approve_admin_security_audit_period_export(
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
  v_export admin_security_audit_period_export_requests%rowtype;
begin
  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_approval_note is null or length(trim(p_approval_note)) = 0 then
    raise exception 'audit period export approval note is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_export
  from admin_security_audit_period_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'audit period export request not found: %', p_export_request_id;
  end if;

  if v_export.status <> 'pending' then
    raise exception 'audit period export cannot be approved from status: %', v_export.status;
  end if;

  update admin_security_audit_period_export_requests
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
  where id = v_export.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_security_audit_period_export',
    'admin.write',
    'admin_security_audit_period_export_request',
    v_export.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_approval_note,
    p_metadata
  );

  return v_export.id;
end;
$$;

create or replace function claim_admin_security_audit_period_exports(
  p_batch_size integer default 5,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  export_request_id uuid,
  export_key text,
  audit_period_id uuid,
  period_key text,
  period_name text,
  audit_type text,
  period_start timestamptz,
  period_end timestamptz,
  seal_checksum_sha256 text,
  export_type text,
  export_format text,
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
    from admin_security_audit_period_export_requests er
    join admin_security_audit_periods p
      on p.id = er.audit_period_id
    where er.status in ('approved', 'failed')
      and p.status = 'sealed'
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
    update admin_security_audit_period_export_requests er
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
    u.id,
    u.export_key,
    p.id,
    p.period_key,
    p.period_name,
    p.audit_type,
    p.period_start,
    p.period_end,
    p.seal_checksum_sha256,
    u.export_type,
    u.export_format,
    u.watermark
  from updated u
  join admin_security_audit_periods p
    on p.id = u.audit_period_id;
end;
$$;

create or replace function build_admin_security_audit_period_export_items(
  p_export_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_export admin_security_audit_period_export_requests%rowtype;
  v_period admin_security_audit_periods%rowtype;
  v_item_count integer := 0;
begin
  select *
  into v_export
  from admin_security_audit_period_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'audit period export request not found: %', p_export_request_id;
  end if;

  select *
  into v_period
  from admin_security_audit_periods
  where id = v_export.audit_period_id;

  if v_period.id is null then
    raise exception 'audit period not found: %', v_export.audit_period_id;
  end if;

  if v_period.status <> 'sealed' then
    raise exception 'audit period export requires sealed period';
  end if;

  delete from admin_security_audit_period_export_items
  where audit_period_export_request_id = v_export.id;

  insert into admin_security_audit_period_export_items (
    audit_period_export_request_id,
    audit_period_id,
    item_type,
    source_type,
    source_id,
    item_status,
    redaction_level,
    payload,
    payload_checksum_sha256,
    metadata
  )
  values (
    v_export.id,
    v_period.id,
    'manifest',
    'admin_security_audit_period_export_request',
    v_export.id,
    'included',
    'auditor_safe',
    jsonb_build_object(
      'export_key', v_export.export_key,
      'export_type', v_export.export_type,
      'export_format', v_export.export_format,
      'period_key', v_period.period_key,
      'period_name', v_period.period_name,
      'audit_type', v_period.audit_type,
      'period_start', v_period.period_start,
      'period_end', v_period.period_end,
      'sealed_at', v_period.sealed_at,
      'seal_checksum_sha256', v_period.seal_checksum_sha256,
      'snapshot_count', v_period.snapshot_count,
      'item_count', v_period.item_count,
      'watermark', v_export.watermark,
      'generated_scope', v_export.export_type
    ),
    checksum_jsonb_sha256(
      jsonb_build_object(
        'export_key', v_export.export_key,
        'period_key', v_period.period_key,
        'seal_checksum_sha256', v_period.seal_checksum_sha256
      )
    ),
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into admin_security_audit_period_export_items (
    audit_period_export_request_id,
    audit_period_id,
    item_type,
    source_type,
    source_id,
    item_status,
    redaction_level,
    payload,
    payload_checksum_sha256,
    metadata
  )
  values (
    v_export.id,
    v_period.id,
    'audit_period',
    'admin_security_audit_period',
    v_period.id,
    'included',
    'auditor_safe',
    to_jsonb(v_period),
    checksum_jsonb_sha256(to_jsonb(v_period)),
    coalesce(p_metadata, '{}'::jsonb)
  );

  if v_export.export_type in (
    'full_period_bundle',
    'snapshot_bundle',
    'executive_summary_bundle',
    'auditor_safe_bundle'
  ) then
    insert into admin_security_audit_period_export_items (
      audit_period_export_request_id,
      audit_period_id,
      audit_period_snapshot_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      metadata
    )
    select
      v_export.id,
      v_period.id,
      s.id,
      'snapshot',
      'admin_security_audit_period_snapshot',
      s.id,
      'included',
      'auditor_safe',
      to_jsonb(s),
      checksum_jsonb_sha256(to_jsonb(s)),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_audit_period_snapshots s
    where s.audit_period_id = v_period.id
      and s.status = 'sealed'
    order by s.created_at asc;
  end if;

  if v_export.export_type in (
    'full_period_bundle',
    'evidence_bundle',
    'auditor_safe_bundle'
  ) then
    insert into admin_security_audit_period_export_items (
      audit_period_export_request_id,
      audit_period_id,
      audit_period_snapshot_id,
      audit_period_snapshot_item_id,
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
      metadata
    )
    select
      v_export.id,
      v_period.id,
      i.audit_period_snapshot_id,
      i.id,
      'snapshot_item',
      i.source_type,
      i.source_id,
      i.framework_key,
      i.control_key,
      i.policy_key,
      i.evidence_key,
      'included',
      case
        when v_export.export_type = 'auditor_safe_bundle'
          and i.redaction_level = 'none'
        then 'auditor_safe'
        else i.redaction_level
      end,
      case
        when v_export.export_type = 'auditor_safe_bundle'
        then i.payload - 'metadata' - 'secret_ciphertext' - 'storage_uri'
        else i.payload
      end,
      checksum_jsonb_sha256(
        case
          when v_export.export_type = 'auditor_safe_bundle'
          then i.payload - 'metadata' - 'secret_ciphertext' - 'storage_uri'
          else i.payload
        end
      ),
      coalesce(p_metadata, '{}'::jsonb)
    from admin_security_audit_period_snapshot_items i
    join admin_security_audit_period_snapshots s
      on s.id = i.audit_period_snapshot_id
    where i.audit_period_id = v_period.id
      and s.status = 'sealed'
    order by i.created_at asc;
  end if;

  if v_export.export_type = 'executive_summary_bundle' then
    insert into admin_security_audit_period_export_items (
      audit_period_export_request_id,
      audit_period_id,
      item_type,
      source_type,
      source_id,
      item_status,
      redaction_level,
      payload,
      payload_checksum_sha256,
      metadata
    )
    values (
      v_export.id,
      v_period.id,
      'summary',
      'admin_security_audit_period_summary',
      v_period.id,
      'included',
      'auditor_safe',
      jsonb_build_object(
        'period_key', v_period.period_key,
        'audit_type', v_period.audit_type,
        'snapshot_count', v_period.snapshot_count,
        'item_count', v_period.item_count,
        'seal_checksum_sha256', v_period.seal_checksum_sha256,
        'snapshot_type_counts',
        (
          select jsonb_object_agg(snapshot_type, count_value)
          from (
            select snapshot_type, count(*) as count_value
            from admin_security_audit_period_snapshots
            where audit_period_id = v_period.id
            group by snapshot_type
          ) x
        ),
        'item_type_counts',
        (
          select jsonb_object_agg(item_type, count_value)
          from (
            select item_type, count(*) as count_value
            from admin_security_audit_period_snapshot_items
            where audit_period_id = v_period.id
            group by item_type
          ) y
        )
      ),
      checksum_jsonb_sha256(
        jsonb_build_object(
          'period_key', v_period.period_key,
          'seal_checksum_sha256', v_period.seal_checksum_sha256,
          'snapshot_count', v_period.snapshot_count,
          'item_count', v_period.item_count
        )
      ),
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  insert into admin_security_audit_period_export_items (
    audit_period_export_request_id,
    audit_period_id,
    item_type,
    source_type,
    source_id,
    item_status,
    redaction_level,
    payload,
    payload_checksum_sha256,
    metadata
  )
  select
    v_export.id,
    v_period.id,
    'hash_reference',
    'audit_hash_chain_entry',
    ahc.id,
    'included',
    'auditor_safe',
    to_jsonb(ahc),
    checksum_jsonb_sha256(to_jsonb(ahc)),
    coalesce(p_metadata, '{}'::jsonb)
  from audit_hash_chain_entries ahc
  where ahc.source_type = 'admin_security_audit_period'
    and ahc.source_id = v_period.id;

  select count(*)
  into v_item_count
  from admin_security_audit_period_export_items
  where audit_period_export_request_id = v_export.id;

  update admin_security_audit_period_export_requests
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

  if v_item_count <= 2 then
    raise exception 'audit period export has no snapshot evidence items';
  end if;

  return v_item_count;
end;
$$;

create or replace function complete_admin_security_audit_period_export(
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
  v_export admin_security_audit_period_export_requests%rowtype;
begin
  if p_storage_uri is null or length(trim(p_storage_uri)) = 0 then
    raise exception 'audit period export storage uri is required';
  end if;

  if p_checksum_sha256 is null or length(trim(p_checksum_sha256)) = 0 then
    raise exception 'audit period export checksum is required';
  end if;

  select *
  into v_export
  from admin_security_audit_period_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'audit period export request not found: %', p_export_request_id;
  end if;

  if v_export.status <> 'generating' then
    raise exception 'audit period export cannot be completed from status: %', v_export.status;
  end if;

  update admin_security_audit_period_export_requests
  set
    status = 'ready',
    generated_at = now(),
    generated_by_worker_id = p_worker_id,
    storage_uri = p_storage_uri,
    checksum_sha256 = p_checksum_sha256,
    payload_bytes = p_payload_bytes,
    item_count = coalesce(p_item_count, item_count),
    expires_at = now() + interval '30 days',
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = v_export.id;

  perform create_admin_security_alert(
    'admin_security_audit_period_export_ready',
    'medium',
    null,
    v_export.requested_by_auth_user_id,
    'complete_admin_security_audit_period_export',
    null,
    'Audit period export is ready.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'audit_period_export_request_id',
      v_export.id,
      'export_key',
      v_export.export_key,
      'expires_at',
      now() + interval '30 days'
    )
  );

  return v_export.id;
end;
$$;

create or replace function fail_admin_security_audit_period_export(
  p_export_request_id uuid,
  p_error text,
  p_worker_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_export admin_security_audit_period_export_requests%rowtype;
begin
  if p_error is null or length(trim(p_error)) = 0 then
    raise exception 'audit period export error is required';
  end if;

  select *
  into v_export
  from admin_security_audit_period_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'audit period export request not found: %', p_export_request_id;
  end if;

  update admin_security_audit_period_export_requests
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
  where id = v_export.id;

  perform create_admin_security_alert(
    'admin_security_audit_period_export_failed',
    'high',
    null,
    v_export.requested_by_auth_user_id,
    'fail_admin_security_audit_period_export',
    null,
    'Audit period export generation failed.',
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'audit_period_export_request_id',
      v_export.id,
      'error',
      p_error
    )
  );

  return v_export.id;
end;
$$;

create or replace function register_admin_security_audit_period_export_download(
  p_auth_user_id uuid,
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
  v_export admin_security_audit_period_export_requests%rowtype;
  v_is_admin boolean := false;
  v_is_auditor_allowed boolean := false;
  v_auditor admin_security_auditors%rowtype;
begin
  select *
  into v_export
  from admin_security_audit_period_export_requests
  where id = p_export_request_id
  for update;

  if v_export.id is null then
    raise exception 'audit period export request not found: %', p_export_request_id;
  end if;

  v_is_admin := admin_has_permission(p_auth_user_id, 'admin.read') is true;

  begin
    v_auditor := get_active_admin_security_auditor(p_auth_user_id);
    v_is_auditor_allowed := v_export.requested_for_auditor_id = v_auditor.id;
  exception
    when others then
      v_is_auditor_allowed := false;
  end;

  if v_is_admin is not true and v_is_auditor_allowed is not true then
    raise exception 'audit period export download not allowed';
  end if;

  if v_export.status <> 'ready' then
    raise exception 'audit period export is not ready: %', v_export.status;
  end if;

  if v_export.expires_at is not null and v_export.expires_at <= now() then
    raise exception 'audit period export has expired';
  end if;

  update admin_security_audit_period_export_requests
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
  where id = v_export.id;

  perform record_admin_action(
    case when v_is_admin then p_auth_user_id else null end,
    'register_admin_security_audit_period_export_download',
    'admin.read',
    'admin_security_audit_period_export_request',
    v_export.id,
    p_request_id,
    null,
    null,
    'allowed',
    'audit period export downloaded',
    p_metadata || jsonb_build_object(
      'downloaded_by_auth_user_id',
      p_auth_user_id,
      'is_auditor_allowed',
      v_is_auditor_allowed
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

create or replace function expire_admin_security_audit_period_exports(
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
    from admin_security_audit_period_export_requests
    where status = 'ready'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_audit_period_export_requests
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
  end loop;

  return v_run_id;
end;
$$;

create or replace view admin_security_audit_period_export_dashboard as
select
  er.id as admin_security_audit_period_export_request_id,
  er.export_key,

  er.audit_period_id,
  p.period_key,
  p.period_name,
  p.audit_type,
  p.status as audit_period_status,
  p.seal_checksum_sha256,

  er.status,
  er.export_type,
  er.export_format,

  er.requested_by_auth_user_id,
  requester.email as requested_by_email,

  er.requested_for_auditor_id,
  auditor.email as auditor_email,
  auditor.organization_name as auditor_organization_name,

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

  er.watermark,
  er.expires_at,

  er.download_count,
  er.last_downloaded_at,

  er.last_error,

  er.created_at,
  er.updated_at,
  er.metadata
from admin_security_audit_period_export_requests er
join admin_security_audit_periods p
  on p.id = er.audit_period_id
left join admin_users requester
  on requester.id = er.requested_by_admin_user_id
left join admin_users approver
  on approver.id = er.approved_by_admin_user_id
left join admin_security_auditors auditor
  on auditor.id = er.requested_for_auditor_id
order by er.created_at desc;

create or replace view admin_security_audit_period_export_item_dashboard as
select
  i.id as admin_security_audit_period_export_item_id,

  i.audit_period_export_request_id,
  er.export_key,
  er.status as export_status,
  er.export_type,
  er.export_format,

  i.audit_period_id,
  p.period_key,

  i.audit_period_snapshot_id,
  s.snapshot_key,
  s.snapshot_type,

  i.audit_period_snapshot_item_id,

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

  i.created_at,
  i.metadata
from admin_security_audit_period_export_items i
join admin_security_audit_period_export_requests er
  on er.id = i.audit_period_export_request_id
join admin_security_audit_periods p
  on p.id = i.audit_period_id
left join admin_security_audit_period_snapshots s
  on s.id = i.audit_period_snapshot_id
order by i.created_at desc;

create or replace view admin_security_audit_period_export_integrity as
select
  (
    select count(*)
    from admin_security_audit_period_export_requests
    where status = 'pending'
  ) as pending_export_count,

  (
    select count(*)
    from admin_security_audit_period_export_requests
    where status = 'approved'
  ) as approved_export_count,

  (
    select count(*)
    from admin_security_audit_period_export_requests
    where status = 'generating'
  ) as generating_export_count,

  (
    select count(*)
    from admin_security_audit_period_export_requests
    where status = 'ready'
  ) as ready_export_count,

  (
    select count(*)
    from admin_security_audit_period_export_requests
    where status = 'failed'
  ) as failed_export_count,

  (
    select count(*)
    from admin_security_audit_period_export_requests
    where status = 'ready'
      and expires_at <= now()
  ) as expired_unprocessed_export_count,

  (
    select coalesce(sum(download_count), 0)
    from admin_security_audit_period_export_requests
    where created_at >= now() - interval '30 days'
  ) as export_download_count_30d,

  now() as checked_at;

grant select on admin_security_audit_period_export_dashboard to admin_api_role;
grant select on admin_security_audit_period_export_item_dashboard to admin_api_role;
grant select on admin_security_audit_period_export_integrity to admin_api_role;

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
  'admin_security_audit_period_exports_expire_hourly',
  'Expire admin security audit period exports',
  'admin',
  true,
  '7 * * * *',
  'expire_admin_security_audit_period_exports',
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

alter table admin_security_audit_period_export_requests enable row level security;
alter table admin_security_audit_period_export_items enable row level security;

drop policy if exists admin_security_audit_period_export_requests_no_user_direct_access
on admin_security_audit_period_export_requests;
create policy admin_security_audit_period_export_requests_no_user_direct_access
on admin_security_audit_period_export_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_audit_period_export_items_no_user_direct_access
on admin_security_audit_period_export_items;
create policy admin_security_audit_period_export_items_no_user_direct_access
on admin_security_audit_period_export_items
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_security_audit_period_export_requests
on admin_security_audit_period_export_requests;
create policy admin_api_all_admin_security_audit_period_export_requests
on admin_security_audit_period_export_requests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_audit_period_export_items
on admin_security_audit_period_export_items;
create policy admin_api_all_admin_security_audit_period_export_items
on admin_security_audit_period_export_items
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_audit_period_export_requests
on admin_security_audit_period_export_requests;
create policy worker_all_admin_security_audit_period_export_requests
on admin_security_audit_period_export_requests
for all
to worker_role
using (true)
with check (true);

drop policy if exists worker_all_admin_security_audit_period_export_items
on admin_security_audit_period_export_items;
create policy worker_all_admin_security_audit_period_export_items
on admin_security_audit_period_export_items
for all
to worker_role
using (true)
with check (true);

grant execute on function request_admin_security_audit_period_export(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function approve_admin_security_audit_period_export(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function claim_admin_security_audit_period_exports(integer, text, jsonb)
to worker_role;

grant execute on function build_admin_security_audit_period_export_items(uuid, jsonb)
to worker_role, admin_api_role;

grant execute on function complete_admin_security_audit_period_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  text,
  jsonb
) to worker_role;

grant execute on function fail_admin_security_audit_period_export(uuid, text, text, jsonb)
to worker_role;

grant execute on function expire_admin_security_audit_period_exports(integer, jsonb)
to worker_role;

grant execute on function register_admin_security_audit_period_export_download(
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

alter function request_admin_security_audit_period_export(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  jsonb
) security definer;
alter function request_admin_security_audit_period_export(
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function approve_admin_security_audit_period_export(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;
alter function approve_admin_security_audit_period_export(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function claim_admin_security_audit_period_exports(integer, text, jsonb) security definer;
alter function claim_admin_security_audit_period_exports(integer, text, jsonb) set search_path = public;

alter function build_admin_security_audit_period_export_items(uuid, jsonb) security definer;
alter function build_admin_security_audit_period_export_items(uuid, jsonb) set search_path = public;

alter function complete_admin_security_audit_period_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  text,
  jsonb
) security definer;
alter function complete_admin_security_audit_period_export(
  uuid,
  text,
  text,
  bigint,
  integer,
  text,
  jsonb
) set search_path = public;

alter function fail_admin_security_audit_period_export(uuid, text, text, jsonb) security definer;
alter function fail_admin_security_audit_period_export(uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_security_audit_period_exports(integer, jsonb) security definer;
alter function expire_admin_security_audit_period_exports(integer, jsonb) set search_path = public;

alter function register_admin_security_audit_period_export_download(
  uuid,
  uuid,
  text,
  jsonb
) security definer;
alter function register_admin_security_audit_period_export_download(
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

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
    'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Audit period export not found.',
    'Admin security audit period export request not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Audit period export cannot move from its current state.',
    'Admin security audit period export invalid lifecycle state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_NOT_READY',
    'validation',
    'medium',
    409,
    false,
    true,
    'Audit period export is not ready.',
    'Audit period export download attempted before ready state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_EXPIRED',
    'validation',
    'medium',
    410,
    false,
    true,
    'Audit period export has expired.',
    'Audit period export download attempted after expiry.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_EMPTY',
    'validation',
    'high',
    409,
    false,
    true,
    'Audit period export has no snapshot evidence items.',
    'Audit period export generated no snapshot evidence items.',
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
  ('audit period export request not found', 'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_NOT_FOUND', 5, '{}'),
  ('audit period export requires sealed period', 'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_INVALID_STATE', 5, '{}'),
  ('audit period export cannot be approved from status', 'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_INVALID_STATE', 5, '{}'),
  ('audit period export cannot be completed from status', 'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_INVALID_STATE', 5, '{}'),
  ('audit period export is not ready', 'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_NOT_READY', 5, '{}'),
  ('audit period export has expired', 'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_EXPIRED', 5, '{}'),
  ('audit period export has no snapshot evidence items', 'ADMIN_SECURITY_AUDIT_PERIOD_EXPORT_EMPTY', 5, '{}'),
  ('audit period export approval note is required', 'ADMIN_SECURITY_AUDIT_PERIOD_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
