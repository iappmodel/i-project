-- Step 9.39 — Build legal hold / compliance lock layer.
-- Runs after 153_admin_security_deletion_approval_workflow.sql.

create table if not exists admin_security_legal_holds (
  id uuid primary key default gen_random_uuid(),

  hold_key text not null unique,

  status text not null default 'active',
  hold_type text not null,

  title text not null,
  reason text not null,

  authority text,
  external_reference text,

  effective_at timestamptz not null default now(),
  expires_at timestamptz,

  created_by_auth_user_id uuid not null,
  created_by_admin_user_id uuid references admin_users(id),

  released_by_auth_user_id uuid,
  released_by_admin_user_id uuid references admin_users(id),
  released_at timestamptz,
  release_reason text,

  request_id text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_legal_holds_status_check
  check (
    status in (
      'active',
      'released',
      'expired',
      'cancelled'
    )
  ),

  constraint admin_security_legal_holds_type_check
  check (
    hold_type in (
      'legal',
      'compliance',
      'security',
      'investigation',
      'regulatory'
    )
  ),

  constraint admin_security_legal_holds_expiry_check
  check (
    expires_at is null
    or expires_at > effective_at
  ),

  constraint admin_security_legal_holds_title_check
  check (length(trim(title)) > 0),

  constraint admin_security_legal_holds_reason_check
  check (length(trim(reason)) > 0)
);

create index if not exists admin_security_legal_holds_status_idx
on admin_security_legal_holds (status, effective_at desc);

create index if not exists admin_security_legal_holds_type_idx
on admin_security_legal_holds (hold_type, status);

drop trigger if exists admin_security_legal_holds_set_updated_at
on admin_security_legal_holds;

create trigger admin_security_legal_holds_set_updated_at
before update on admin_security_legal_holds
for each row
execute function set_updated_at();

create table if not exists admin_security_legal_hold_targets (
  id uuid primary key default gen_random_uuid(),

  admin_security_legal_hold_id uuid not null
    references admin_security_legal_holds(id)
    on delete cascade,

  target_type text not null,

  source_type text,
  source_id uuid,

  period_start timestamptz,
  period_end timestamptz,

  admin_auth_user_id uuid,

  archive_manifest_id uuid references admin_security_archive_manifests(id),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_legal_hold_targets_type_check
  check (
    target_type in (
      'source_type',
      'source_record',
      'source_period',
      'admin_user',
      'archive_manifest',
      'global'
    )
  ),

  constraint admin_security_legal_hold_targets_period_check
  check (
    period_start is null
    or period_end is null
    or period_end >= period_start
  ),

  constraint admin_security_legal_hold_targets_shape_check
  check (
    (
      target_type = 'source_type'
      and source_type is not null
      and source_id is null
      and period_start is null
      and period_end is null
      and admin_auth_user_id is null
      and archive_manifest_id is null
    )
    or
    (
      target_type = 'source_record'
      and source_type is not null
      and source_id is not null
    )
    or
    (
      target_type = 'source_period'
      and source_type is not null
      and period_start is not null
      and period_end is not null
    )
    or
    (
      target_type = 'admin_user'
      and admin_auth_user_id is not null
    )
    or
    (
      target_type = 'archive_manifest'
      and archive_manifest_id is not null
    )
    or
    (
      target_type = 'global'
    )
  )
);

create index if not exists admin_security_legal_hold_targets_hold_idx
on admin_security_legal_hold_targets (admin_security_legal_hold_id);

create index if not exists admin_security_legal_hold_targets_source_idx
on admin_security_legal_hold_targets (source_type, source_id);

create index if not exists admin_security_legal_hold_targets_period_idx
on admin_security_legal_hold_targets (source_type, period_start, period_end);

create index if not exists admin_security_legal_hold_targets_admin_user_idx
on admin_security_legal_hold_targets (admin_auth_user_id);

create index if not exists admin_security_legal_hold_targets_manifest_idx
on admin_security_legal_hold_targets (archive_manifest_id);

drop trigger if exists admin_security_legal_hold_targets_set_updated_at
on admin_security_legal_hold_targets;

create trigger admin_security_legal_hold_targets_set_updated_at
before update on admin_security_legal_hold_targets
for each row
execute function set_updated_at();

create or replace function find_active_admin_security_legal_hold(
  p_source_type text default null,
  p_source_id uuid default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_admin_auth_user_id uuid default null,
  p_archive_manifest_id uuid default null
)
returns uuid
language plpgsql
stable
as $$
declare
  v_hold_id uuid;
begin
  select h.id
  into v_hold_id
  from admin_security_legal_holds h
  join admin_security_legal_hold_targets t
    on t.admin_security_legal_hold_id = h.id
  where h.status = 'active'
    and h.effective_at <= now()
    and (
      h.expires_at is null
      or h.expires_at > now()
    )
    and (
      t.target_type = 'global'
      or (
        t.target_type = 'source_type'
        and p_source_type is not null
        and t.source_type = p_source_type
      )
      or (
        t.target_type = 'source_record'
        and p_source_type is not null
        and p_source_id is not null
        and t.source_type = p_source_type
        and t.source_id = p_source_id
      )
      or (
        t.target_type = 'source_period'
        and p_source_type is not null
        and p_period_start is not null
        and p_period_end is not null
        and t.source_type = p_source_type
        and tstzrange(t.period_start, t.period_end, '[]')
          && tstzrange(p_period_start, p_period_end, '[]')
      )
      or (
        t.target_type = 'admin_user'
        and p_admin_auth_user_id is not null
        and t.admin_auth_user_id = p_admin_auth_user_id
      )
      or (
        t.target_type = 'archive_manifest'
        and p_archive_manifest_id is not null
        and t.archive_manifest_id = p_archive_manifest_id
      )
    )
  order by h.effective_at desc
  limit 1;

  return v_hold_id;
end;
$$;

create or replace function require_no_admin_security_legal_hold(
  p_source_type text default null,
  p_source_id uuid default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_admin_auth_user_id uuid default null,
  p_archive_manifest_id uuid default null
)
returns void
language plpgsql
stable
as $$
declare
  v_hold_id uuid;
begin
  v_hold_id := find_active_admin_security_legal_hold(
    p_source_type,
    p_source_id,
    p_period_start,
    p_period_end,
    p_admin_auth_user_id,
    p_archive_manifest_id
  );

  if v_hold_id is not null then
    raise exception 'active legal hold blocks this operation: %', v_hold_id;
  end if;
end;
$$;

create or replace function create_admin_security_legal_hold(
  p_admin_auth_user_id uuid,
  p_hold_key text,
  p_hold_type text,
  p_title text,
  p_reason text,
  p_authority text default null,
  p_external_reference text default null,
  p_effective_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_hold_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'create_admin_security_legal_hold'
    )
  );

  if p_hold_key is null or length(trim(p_hold_key)) = 0 then
    raise exception 'legal hold key is required';
  end if;

  if p_hold_type not in ('legal', 'compliance', 'security', 'investigation', 'regulatory') then
    raise exception 'invalid legal hold type: %', p_hold_type;
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'legal hold title is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'legal hold reason is required';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  insert into admin_security_legal_holds (
    hold_key,
    status,
    hold_type,
    title,
    reason,
    authority,
    external_reference,
    effective_at,
    expires_at,
    created_by_auth_user_id,
    created_by_admin_user_id,
    request_id,
    metadata
  )
  values (
    p_hold_key,
    'active',
    p_hold_type,
    p_title,
    p_reason,
    p_authority,
    p_external_reference,
    coalesce(p_effective_at, now()),
    p_expires_at,
    p_admin_auth_user_id,
    v_admin.id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (hold_key)
  do update set
    status = 'active',
    hold_type = excluded.hold_type,
    title = excluded.title,
    reason = excluded.reason,
    authority = excluded.authority,
    external_reference = excluded.external_reference,
    effective_at = excluded.effective_at,
    expires_at = excluded.expires_at,
    metadata = admin_security_legal_holds.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_hold_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_legal_hold',
    'admin.write',
    'admin_security_legal_hold',
    v_hold_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'hold_key',
      p_hold_key,
      'hold_type',
      p_hold_type
    )
  );

  perform create_admin_security_alert(
    'admin_security_legal_hold_created',
    'critical',
    p_admin_auth_user_id,
    null,
    'create_admin_security_legal_hold',
    null,
    'Admin security legal/compliance hold was created.',
    p_metadata || jsonb_build_object(
      'admin_security_legal_hold_id',
      v_hold_id,
      'hold_key',
      p_hold_key,
      'hold_type',
      p_hold_type,
      'reason',
      p_reason
    )
  );

  return v_hold_id;
end;
$$;

create or replace function add_admin_security_legal_hold_target(
  p_admin_auth_user_id uuid,
  p_legal_hold_id uuid,
  p_target_type text,
  p_source_type text default null,
  p_source_id uuid default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_target_admin_auth_user_id uuid default null,
  p_archive_manifest_id uuid default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_hold admin_security_legal_holds%rowtype;
  v_target_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_legal_hold_id is null then
    raise exception 'legal hold id is required';
  end if;

  select *
  into v_hold
  from admin_security_legal_holds
  where id = p_legal_hold_id
  for update;

  if v_hold.id is null then
    raise exception 'admin security legal hold not found: %', p_legal_hold_id;
  end if;

  if v_hold.status <> 'active' then
    raise exception 'legal hold target cannot be added to status: %', v_hold.status;
  end if;

  insert into admin_security_legal_hold_targets (
    admin_security_legal_hold_id,
    target_type,
    source_type,
    source_id,
    period_start,
    period_end,
    admin_auth_user_id,
    archive_manifest_id,
    metadata
  )
  values (
    p_legal_hold_id,
    p_target_type,
    p_source_type,
    p_source_id,
    p_period_start,
    p_period_end,
    p_target_admin_auth_user_id,
    p_archive_manifest_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_target_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'add_admin_security_legal_hold_target',
    'admin.write',
    'admin_security_legal_hold_target',
    v_target_id,
    p_request_id,
    null,
    null,
    'allowed',
    'legal hold target added',
    p_metadata || jsonb_build_object(
      'admin_security_legal_hold_id',
      p_legal_hold_id,
      'target_type',
      p_target_type,
      'source_type',
      p_source_type,
      'source_id',
      p_source_id,
      'archive_manifest_id',
      p_archive_manifest_id
    )
  );

  return v_target_id;
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
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_legal_hold_id is null then
    raise exception 'legal hold id is required';
  end if;

  if p_release_reason is null or length(trim(p_release_reason)) = 0 then
    raise exception 'legal hold release reason is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'release_admin_security_legal_hold'
    )
  );

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_hold
  from admin_security_legal_holds
  where id = p_legal_hold_id
  for update;

  if v_hold.id is null then
    raise exception 'admin security legal hold not found: %', p_legal_hold_id;
  end if;

  if v_hold.status <> 'active' then
    raise exception 'legal hold cannot be released from status: %', v_hold.status;
  end if;

  update admin_security_legal_holds
  set
    status = 'released',
    released_by_auth_user_id = p_admin_auth_user_id,
    released_by_admin_user_id = v_admin.id,
    released_at = now(),
    release_reason = p_release_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'release_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_hold.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'release_admin_security_legal_hold',
    'admin.write',
    'admin_security_legal_hold',
    v_hold.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_release_reason,
    p_metadata
  );

  perform create_admin_security_alert(
    'admin_security_legal_hold_released',
    'critical',
    p_admin_auth_user_id,
    v_hold.created_by_auth_user_id,
    'release_admin_security_legal_hold',
    null,
    'Admin security legal/compliance hold was released.',
    p_metadata || jsonb_build_object(
      'admin_security_legal_hold_id',
      v_hold.id,
      'hold_key',
      v_hold.hold_key,
      'release_reason',
      p_release_reason
    )
  );

  return v_hold.id;
end;
$$;

create or replace function expire_admin_security_legal_holds(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_hold record;
begin
  for v_hold in
    select *
    from admin_security_legal_holds
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_security_legal_holds
    set
      status = 'expired',
      metadata = metadata || p_metadata || jsonb_build_object(
        'expire_run_id',
        v_run_id,
        'expired_at',
        now()
      ),
      updated_at = now()
    where id = v_hold.id;

    perform create_admin_security_alert(
      'admin_security_legal_hold_expired',
      'high',
      null,
      v_hold.created_by_auth_user_id,
      'expire_admin_security_legal_holds',
      null,
      'Admin security legal/compliance hold expired.',
      p_metadata || jsonb_build_object(
        'admin_security_legal_hold_id',
        v_hold.id,
        'hold_key',
        v_hold.hold_key
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function require_admin_security_deletion_allowed(
  p_source_type text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns uuid
language plpgsql
as $$
declare
  v_policy admin_security_retention_policies%rowtype;
  v_manifest_id uuid;
begin
  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'deletion source type is required';
  end if;

  if p_period_start is null or p_period_end is null then
    raise exception 'deletion period is required';
  end if;

  if p_period_end < p_period_start then
    raise exception 'deletion period end cannot be before start';
  end if;

  select *
  into v_policy
  from admin_security_retention_policies
  where source_type = p_source_type
    and status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active retention policy for source type: %', p_source_type;
  end if;

  if v_policy.immutable is true then
    raise exception 'source type is immutable and cannot be deleted: %', p_source_type;
  end if;

  if v_policy.deletion_allowed is not true then
    raise exception 'deletion is not allowed for source type: %', p_source_type;
  end if;

  if v_policy.delete_after_days is null then
    raise exception 'delete_after_days is not configured for source type: %', p_source_type;
  end if;

  if p_period_end > now() - make_interval(days => v_policy.delete_after_days) then
    raise exception 'records are not old enough for deletion';
  end if;

  select m.id
  into v_manifest_id
  from admin_security_archive_manifests m
  where m.source_type = p_source_type
    and m.status = 'verified'
    and p_period_start >= m.period_start
    and p_period_end <= m.period_end
  order by m.verified_at desc nulls last
  limit 1;

  if v_manifest_id is null then
    raise exception 'verified archive manifest is required before deletion';
  end if;

  perform require_no_admin_security_legal_hold(
    p_source_type,
    null,
    p_period_start,
    p_period_end,
    null,
    v_manifest_id
  );

  return v_manifest_id;
end;
$$;

create or replace function create_admin_security_deletion_request(
  p_admin_auth_user_id uuid,
  p_source_type text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_archive_manifest_id uuid;
  v_request_id uuid;
  v_request_key text;
  v_item_count bigint := 0;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'deletion reason is required';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'create_admin_security_deletion_request'
    )
  );

  v_archive_manifest_id := require_admin_security_deletion_allowed(
    p_source_type,
    p_period_start,
    p_period_end
  );

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  v_request_key :=
    p_source_type || ':' ||
    to_char(p_period_start, 'YYYYMMDDHH24MISS') || ':' ||
    to_char(p_period_end, 'YYYYMMDDHH24MISS');

  insert into admin_security_deletion_requests (
    request_key,
    source_type,
    status,
    reason,
    period_start,
    period_end,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    archive_manifest_id,
    request_id,
    metadata
  )
  values (
    v_request_key,
    p_source_type,
    'pending',
    p_reason,
    p_period_start,
    p_period_end,
    p_admin_auth_user_id,
    v_admin.id,
    v_archive_manifest_id,
    p_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (request_key)
  do update set
    reason = excluded.reason,
    archive_manifest_id = excluded.archive_manifest_id,
    metadata = admin_security_deletion_requests.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_request_id;

  insert into admin_security_deletion_request_items (
    admin_security_deletion_request_id,
    source_type,
    source_id,
    status,
    metadata
  )
  select
    v_request_id,
    c.source_type,
    c.source_id,
    'pending',
    jsonb_build_object(
      'candidate_created_at',
      c.created_at
    )
  from admin_security_deletion_candidates c
  where c.source_type = p_source_type
    and c.created_at between p_period_start and p_period_end
    and find_active_admin_security_legal_hold(
      c.source_type,
      c.source_id,
      null,
      null,
      null,
      null
    ) is null
  on conflict do nothing;

  get diagnostics v_item_count = row_count;

  update admin_security_deletion_requests
  set metadata = metadata || jsonb_build_object(
    'candidate_item_count',
    (
      select count(*)
      from admin_security_deletion_request_items
      where admin_security_deletion_request_id = v_request_id
    )
  )
  where id = v_request_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'create_admin_security_deletion_request',
    'admin.write',
    'admin_security_deletion_request',
    v_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'source_type',
      p_source_type,
      'period_start',
      p_period_start,
      'period_end',
      p_period_end,
      'archive_manifest_id',
      v_archive_manifest_id,
      'inserted_item_count',
      v_item_count
    )
  );

  perform create_admin_security_alert(
    'admin_security_deletion_requested',
    'critical',
    p_admin_auth_user_id,
    null,
    'create_admin_security_deletion_request',
    null,
    'Security record deletion was requested.',
    p_metadata || jsonb_build_object(
      'admin_security_deletion_request_id',
      v_request_id,
      'source_type',
      p_source_type,
      'period_start',
      p_period_start,
      'period_end',
      p_period_end,
      'reason',
      p_reason
    )
  );

  return v_request_id;
end;
$$;

create or replace function execute_admin_security_deletion_request(
  p_admin_auth_user_id uuid,
  p_deletion_request_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_deletion_requests%rowtype;
  v_item record;
  v_deleted_count bigint := 0;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_deletion_request_id is null then
    raise exception 'deletion request id is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'privileged_action',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'execute_admin_security_deletion_request'
    )
  );

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_deletion_requests
  where id = p_deletion_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security deletion request not found: %', p_deletion_request_id;
  end if;

  if v_request.status <> 'approved' then
    raise exception 'deletion request cannot be executed from status: %', v_request.status;
  end if;

  perform require_admin_security_deletion_allowed(
    v_request.source_type,
    v_request.period_start,
    v_request.period_end
  );

  update admin_security_deletion_requests
  set
    status = 'executing',
    executed_by_auth_user_id = p_admin_auth_user_id,
    executed_by_admin_user_id = v_admin.id,
    metadata = metadata || p_metadata || jsonb_build_object(
      'execution_request_id',
      p_request_id,
      'execution_started_at',
      now()
    ),
    updated_at = now()
  where id = v_request.id;

  for v_item in
    select *
    from admin_security_deletion_request_items
    where admin_security_deletion_request_id = v_request.id
      and status = 'pending'
    order by created_at asc
    for update skip locked
  loop
    begin
      perform require_no_admin_security_legal_hold(
        v_item.source_type,
        v_item.source_id,
        null,
        null,
        null,
        v_request.archive_manifest_id
      );

      if v_item.source_type = 'admin_security_notification_delivery' then
        delete from admin_security_notification_deliveries
        where id = v_item.source_id;
      elsif v_item.source_type = 'admin_session_control' then
        delete from admin_session_controls
        where id = v_item.source_id;
      elsif v_item.source_type = 'admin_action_risk_evaluation' then
        delete from admin_action_risk_evaluations
        where id = v_item.source_id;
      else
        raise exception 'unsupported deletion source type: %', v_item.source_type;
      end if;

      update admin_security_deletion_request_items
      set
        status = 'deleted',
        deleted_at = now(),
        metadata = metadata || jsonb_build_object(
          'deleted_by_auth_user_id',
          p_admin_auth_user_id,
          'deletion_request_id',
          p_request_id
        ),
        updated_at = now()
      where id = v_item.id;

      v_deleted_count := v_deleted_count + 1;
    exception
      when others then
        update admin_security_deletion_request_items
        set
          status = 'failed',
          delete_error = sqlerrm,
          updated_at = now()
        where id = v_item.id;
    end;
  end loop;

  if exists (
    select 1
    from admin_security_deletion_request_items
    where admin_security_deletion_request_id = v_request.id
      and status = 'failed'
  ) then
    update admin_security_deletion_requests
    set
      status = 'failed',
      deleted_record_count = v_deleted_count,
      executed_at = now(),
      metadata = metadata || jsonb_build_object(
        'execution_completed_at',
        now(),
        'failed_item_count',
        (
          select count(*)
          from admin_security_deletion_request_items
          where admin_security_deletion_request_id = v_request.id
            and status = 'failed'
        )
      ),
      updated_at = now()
    where id = v_request.id;

    perform create_admin_security_alert(
      'admin_security_deletion_failed',
      'critical',
      p_admin_auth_user_id,
      v_request.requested_by_auth_user_id,
      'execute_admin_security_deletion_request',
      null,
      'Security record deletion request failed partially or fully.',
      p_metadata || jsonb_build_object(
        'admin_security_deletion_request_id',
        v_request.id,
        'deleted_record_count',
        v_deleted_count
      )
    );
  else
    update admin_security_deletion_requests
    set
      status = 'executed',
      deleted_record_count = v_deleted_count,
      executed_at = now(),
      metadata = metadata || jsonb_build_object(
        'execution_completed_at',
        now()
      ),
      updated_at = now()
    where id = v_request.id;

    perform create_admin_security_alert(
      'admin_security_deletion_executed',
      'critical',
      p_admin_auth_user_id,
      v_request.requested_by_auth_user_id,
      'execute_admin_security_deletion_request',
      null,
      'Security record deletion request was executed.',
      p_metadata || jsonb_build_object(
        'admin_security_deletion_request_id',
        v_request.id,
        'deleted_record_count',
        v_deleted_count,
        'source_type',
        v_request.source_type
      )
    );
  end if;

  perform record_admin_action(
    p_admin_auth_user_id,
    'execute_admin_security_deletion_request',
    'admin.write',
    'admin_security_deletion_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    'security deletion request executed',
    p_metadata || jsonb_build_object(
      'deleted_record_count',
      v_deleted_count
    )
  );

  return v_request.id;
end;
$$;

create or replace view admin_security_deletion_candidates as
select
  c.*
from admin_security_archive_candidates c
where c.deletion_allowed is true
  and c.immutable is false
  and c.delete_after_days is not null
  and c.created_at <= now() - make_interval(days => c.delete_after_days)
  and find_active_admin_security_legal_hold(
    c.source_type,
    c.source_id,
    null,
    null,
    null,
    null
  ) is null
  and find_active_admin_security_legal_hold(
    c.source_type,
    null,
    c.created_at,
    c.created_at,
    null,
    null
  ) is null
  and exists (
    select 1
    from admin_security_archive_manifests m
    where m.source_type = c.source_type
      and m.status = 'verified'
      and c.created_at between m.period_start and m.period_end
      and find_active_admin_security_legal_hold(
        null,
        null,
        null,
        null,
        null,
        m.id
      ) is null
  );

create or replace view admin_security_legal_hold_dashboard as
select
  h.id as admin_security_legal_hold_id,
  h.hold_key,
  h.status,
  h.hold_type,
  h.title,
  h.reason,
  h.authority,
  h.external_reference,
  h.effective_at,
  h.expires_at,
  h.created_by_auth_user_id,
  creator.email as created_by_email,
  creator.display_name as created_by_display_name,
  h.released_by_auth_user_id,
  releaser.email as released_by_email,
  h.released_at,
  h.release_reason,
  (
    select count(*)
    from admin_security_legal_hold_targets t
    where t.admin_security_legal_hold_id = h.id
  ) as target_count,
  h.created_at,
  h.updated_at,
  h.metadata
from admin_security_legal_holds h
left join admin_users creator
  on creator.id = h.created_by_admin_user_id
left join admin_users releaser
  on releaser.id = h.released_by_admin_user_id
order by
  case h.status
    when 'active' then 0
    else 1
  end,
  h.effective_at desc;

create or replace view admin_security_legal_hold_target_dashboard as
select
  t.id as admin_security_legal_hold_target_id,
  t.admin_security_legal_hold_id,
  h.hold_key,
  h.status as hold_status,
  h.hold_type,
  h.title as hold_title,
  t.target_type,
  t.source_type,
  t.source_id,
  t.period_start,
  t.period_end,
  t.admin_auth_user_id,
  au.email as admin_user_email,
  au.display_name as admin_user_display_name,
  t.archive_manifest_id,
  m.archive_key,
  m.status as archive_manifest_status,
  t.created_at,
  t.updated_at,
  t.metadata
from admin_security_legal_hold_targets t
join admin_security_legal_holds h
  on h.id = t.admin_security_legal_hold_id
left join admin_users au
  on au.user_id = t.admin_auth_user_id
left join admin_security_archive_manifests m
  on m.id = t.archive_manifest_id
order by t.created_at desc;

create or replace view admin_security_legal_hold_integrity as
select
  (
    select count(*)
    from admin_security_legal_holds
    where status = 'active'
      and effective_at <= now()
      and (
        expires_at is null
        or expires_at > now()
      )
  ) as active_legal_hold_count,
  (
    select count(*)
    from admin_security_legal_holds
    where status = 'active'
      and expires_at is not null
      and expires_at <= now()
  ) as expired_unprocessed_legal_hold_count,
  (
    select count(*)
    from admin_security_legal_hold_targets t
    join admin_security_legal_holds h
      on h.id = t.admin_security_legal_hold_id
    where h.status = 'active'
  ) as active_legal_hold_target_count,
  (
    select count(*)
    from admin_security_legal_holds
    where released_at >= now() - interval '30 days'
  ) as released_legal_hold_count_30d,
  now() as checked_at;

grant select on admin_security_legal_hold_dashboard to admin_api_role;
grant select on admin_security_legal_hold_target_dashboard to admin_api_role;
grant select on admin_security_legal_hold_integrity to admin_api_role;

create or replace function hash_admin_security_legal_hold(
  p_admin_security_legal_hold_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_hold admin_security_legal_holds%rowtype;
  v_targets jsonb;
  v_payload jsonb;
begin
  select *
  into v_hold
  from admin_security_legal_holds
  where id = p_admin_security_legal_hold_id;

  if v_hold.id is null then
    raise exception 'admin security legal hold not found: %', p_admin_security_legal_hold_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at asc), '[]'::jsonb)
  into v_targets
  from admin_security_legal_hold_targets t
  where t.admin_security_legal_hold_id = v_hold.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_legal_hold',
    'source_id', v_hold.id,
    'hold_key', v_hold.hold_key,
    'status', v_hold.status,
    'hold_type', v_hold.hold_type,
    'title', v_hold.title,
    'reason', v_hold.reason,
    'authority', v_hold.authority,
    'external_reference', v_hold.external_reference,
    'effective_at', v_hold.effective_at,
    'expires_at', v_hold.expires_at,
    'created_by_auth_user_id', v_hold.created_by_auth_user_id,
    'released_by_auth_user_id', v_hold.released_by_auth_user_id,
    'released_at', v_hold.released_at,
    'release_reason', v_hold.release_reason,
    'targets', v_targets,
    'created_at', v_hold.created_at,
    'updated_at', v_hold.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_legal_hold',
    v_hold.id,
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
  'admin_security_archive_manifest'::text as source_type,
  m.id as source_id,
  m.created_at
from admin_security_archive_manifests m
where m.status in ('sealed', 'verified')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_archive_manifest'
      and ahc.source_id = m.id
  )
union all
select
  'admin_security_deletion_request'::text as source_type,
  r.id as source_id,
  r.created_at
from admin_security_deletion_requests r
where r.status in ('rejected', 'executed', 'failed', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_deletion_request'
      and ahc.source_id = r.id
  )
union all
select
  'admin_security_legal_hold'::text as source_type,
  h.id as source_id,
  h.created_at
from admin_security_legal_holds h
where h.status in ('released', 'expired', 'cancelled')
  and not exists (
    select 1
    from audit_hash_chain_entries ahc
    where ahc.source_type = 'admin_security_legal_hold'
      and ahc.source_id = h.id
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
      elsif v_row.source_type = 'admin_security_archive_manifest' then
        perform hash_admin_security_archive_manifest(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_deletion_request' then
        perform hash_admin_security_deletion_request(
          v_row.source_id,
          p_metadata || jsonb_build_object('audit_hash_backfill_run_id', v_run_id)
        );
      elsif v_row.source_type = 'admin_security_legal_hold' then
        perform hash_admin_security_legal_hold(
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
  'admin_security_legal_holds_expire_hourly',
  'Expire admin security legal holds',
  'admin',
  true,
  '37 * * * *',
  'expire_admin_security_legal_holds',
  '{"batch_size": 500}'::jsonb,
  180,
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
  elsif v_job.function_name = 'enqueue_pending_admin_security_archive_exports' then
    v_uuid_result := enqueue_pending_admin_security_archive_exports(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'enqueue_pending_admin_security_archive_verifications' then
    v_uuid_result := enqueue_pending_admin_security_archive_verifications(
      coalesce((v_job.function_args->>'batch_size')::integer, 100),
      p_metadata || jsonb_build_object('scheduled_job_run_id', v_run_id)
    );
    v_result := jsonb_build_object('run_id', v_uuid_result);
  elsif v_job.function_name = 'expire_admin_security_legal_holds' then
    v_uuid_result := expire_admin_security_legal_holds(
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

alter table admin_security_legal_holds enable row level security;
alter table admin_security_legal_hold_targets enable row level security;

create policy admin_security_legal_holds_no_user_direct_access
on admin_security_legal_holds
for all
to authenticated
using (false)
with check (false);

create policy admin_security_legal_hold_targets_no_user_direct_access
on admin_security_legal_hold_targets
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_legal_holds
on admin_security_legal_holds
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_legal_hold_targets
on admin_security_legal_hold_targets
for all
to admin_api_role
using (true)
with check (true);

create policy worker_read_admin_security_legal_holds
on admin_security_legal_holds
for select
to worker_role
using (true);

create policy worker_read_admin_security_legal_hold_targets
on admin_security_legal_hold_targets
for select
to worker_role
using (true);

grant execute on function find_active_admin_security_legal_hold(
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid,
  uuid
) to admin_api_role, worker_role;

grant execute on function require_no_admin_security_legal_hold(
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid,
  uuid
) to admin_api_role, worker_role;

grant execute on function create_admin_security_legal_hold(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
) to admin_api_role;

grant execute on function add_admin_security_legal_hold_target(
  uuid,
  uuid,
  text,
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function release_admin_security_legal_hold(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function expire_admin_security_legal_holds(integer, jsonb)
to worker_role;

grant execute on function hash_admin_security_legal_hold(uuid, jsonb)
to worker_role, admin_api_role;

alter function find_active_admin_security_legal_hold(text, uuid, timestamptz, timestamptz, uuid, uuid) security definer;
alter function find_active_admin_security_legal_hold(text, uuid, timestamptz, timestamptz, uuid, uuid) set search_path = public;

alter function require_no_admin_security_legal_hold(text, uuid, timestamptz, timestamptz, uuid, uuid) security definer;
alter function require_no_admin_security_legal_hold(text, uuid, timestamptz, timestamptz, uuid, uuid) set search_path = public;

alter function create_admin_security_legal_hold(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
) security definer;

alter function create_admin_security_legal_hold(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
) set search_path = public;

alter function add_admin_security_legal_hold_target(
  uuid,
  uuid,
  text,
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid,
  uuid,
  text,
  jsonb
) security definer;

alter function add_admin_security_legal_hold_target(
  uuid,
  uuid,
  text,
  text,
  uuid,
  timestamptz,
  timestamptz,
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function release_admin_security_legal_hold(uuid, uuid, text, text, jsonb) security definer;
alter function release_admin_security_legal_hold(uuid, uuid, text, text, jsonb) set search_path = public;

alter function expire_admin_security_legal_holds(integer, jsonb) security definer;
alter function expire_admin_security_legal_holds(integer, jsonb) set search_path = public;

alter function hash_admin_security_legal_hold(uuid, jsonb) security definer;
alter function hash_admin_security_legal_hold(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_LEGAL_HOLD_ACTIVE',
    'permission',
    'critical',
    423,
    false,
    true,
    'Active legal hold blocks this operation.',
    'Admin security operation blocked by active legal hold.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_LEGAL_HOLD_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Legal hold not found.',
    'Admin security legal hold not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_LEGAL_HOLD_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Legal hold cannot be changed from its current state.',
    'Admin security legal hold invalid lifecycle state.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_LEGAL_HOLD_REQUIRED_FIELDS',
    'validation',
    'medium',
    400,
    false,
    true,
    'Legal hold requires title, reason, and valid targets.',
    'Admin security legal hold required fields missing.',
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
  ('active legal hold blocks this operation', 'ADMIN_SECURITY_LEGAL_HOLD_ACTIVE', 5, '{}'),
  ('admin security legal hold not found', 'ADMIN_SECURITY_LEGAL_HOLD_NOT_FOUND', 5, '{}'),
  ('legal hold target cannot be added to status', 'ADMIN_SECURITY_LEGAL_HOLD_INVALID_STATE', 5, '{}'),
  ('legal hold cannot be released from status', 'ADMIN_SECURITY_LEGAL_HOLD_INVALID_STATE', 5, '{}'),
  ('legal hold key is required', 'ADMIN_SECURITY_LEGAL_HOLD_REQUIRED_FIELDS', 5, '{}'),
  ('legal hold title is required', 'ADMIN_SECURITY_LEGAL_HOLD_REQUIRED_FIELDS', 5, '{}'),
  ('legal hold reason is required', 'ADMIN_SECURITY_LEGAL_HOLD_REQUIRED_FIELDS', 5, '{}'),
  ('legal hold release reason is required', 'ADMIN_SECURITY_LEGAL_HOLD_REQUIRED_FIELDS', 5, '{}')
on conflict do nothing;
