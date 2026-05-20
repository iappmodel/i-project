-- Step 9.38 — Build deletion approval workflow for non-immutable archived records.
-- Runs after 152_admin_security_archive_restore_verification.sql.

create table if not exists admin_security_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  source_type text not null,
  status text not null default 'pending',
  reason text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  requested_by_auth_user_id uuid not null,
  requested_by_admin_user_id uuid references admin_users(id),
  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id),
  approved_at timestamptz,
  rejected_by_auth_user_id uuid,
  rejected_by_admin_user_id uuid references admin_users(id),
  rejected_at timestamptz,
  rejection_reason text,
  executed_by_auth_user_id uuid,
  executed_by_admin_user_id uuid references admin_users(id),
  executed_at timestamptz,
  deleted_record_count bigint not null default 0,
  archive_manifest_id uuid references admin_security_archive_manifests(id),
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_security_deletion_requests_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected',
      'executing',
      'executed',
      'failed',
      'cancelled'
    )
  ),
  constraint admin_security_deletion_requests_period_check
  check (period_end >= period_start)
);

create index if not exists admin_security_deletion_requests_status_idx
on admin_security_deletion_requests (status, created_at desc);

create index if not exists admin_security_deletion_requests_source_idx
on admin_security_deletion_requests (source_type, period_start desc, period_end desc);

drop trigger if exists admin_security_deletion_requests_set_updated_at
on admin_security_deletion_requests;

create trigger admin_security_deletion_requests_set_updated_at
before update on admin_security_deletion_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_deletion_request_items (
  id uuid primary key default gen_random_uuid(),
  admin_security_deletion_request_id uuid not null references admin_security_deletion_requests(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  status text not null default 'pending',
  deleted_at timestamptz,
  delete_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_security_deletion_request_id, source_type, source_id),
  constraint admin_security_deletion_request_items_status_check
  check (
    status in (
      'pending',
      'deleted',
      'failed',
      'skipped'
    )
  )
);

create index if not exists admin_security_deletion_request_items_request_idx
on admin_security_deletion_request_items (admin_security_deletion_request_id, status);

create index if not exists admin_security_deletion_request_items_source_idx
on admin_security_deletion_request_items (source_type, source_id);

drop trigger if exists admin_security_deletion_request_items_set_updated_at
on admin_security_deletion_request_items;

create trigger admin_security_deletion_request_items_set_updated_at
before update on admin_security_deletion_request_items
for each row
execute function set_updated_at();

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

create or replace function approve_admin_security_deletion_request(
  p_admin_auth_user_id uuid,
  p_deletion_request_id uuid,
  p_approval_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_deletion_requests%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_deletion_request_id is null then
    raise exception 'deletion request id is required';
  end if;

  if p_approval_reason is null or length(trim(p_approval_reason)) = 0 then
    raise exception 'approval reason is required';
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
      'approve_admin_security_deletion_request'
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

  if v_request.status <> 'pending' then
    raise exception 'deletion request cannot be approved from status: %', v_request.status;
  end if;

  if v_request.requested_by_auth_user_id = p_admin_auth_user_id then
    raise exception 'deletion request requires approval by a second admin';
  end if;

  perform require_admin_security_deletion_allowed(
    v_request.source_type,
    v_request.period_start,
    v_request.period_end
  );

  if not exists (
    select 1
    from admin_security_deletion_request_items
    where admin_security_deletion_request_id = v_request.id
      and status = 'pending'
  ) then
    raise exception 'deletion request has no pending items';
  end if;

  update admin_security_deletion_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_admin_auth_user_id,
    approved_by_admin_user_id = v_admin.id,
    approved_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'approval_reason',
      p_approval_reason,
      'approval_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_security_deletion_request',
    'admin.write',
    'admin_security_deletion_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_approval_reason,
    p_metadata
  );

  perform create_admin_security_alert(
    'admin_security_deletion_approved',
    'critical',
    p_admin_auth_user_id,
    v_request.requested_by_auth_user_id,
    'approve_admin_security_deletion_request',
    null,
    'Security record deletion request was approved.',
    p_metadata || jsonb_build_object(
      'admin_security_deletion_request_id',
      v_request.id,
      'source_type',
      v_request.source_type
    )
  );

  return v_request.id;
end;
$$;

create or replace function reject_admin_security_deletion_request(
  p_admin_auth_user_id uuid,
  p_deletion_request_id uuid,
  p_rejection_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_admin admin_users%rowtype;
  v_request admin_security_deletion_requests%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_deletion_request_id is null then
    raise exception 'deletion request id is required';
  end if;

  if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
    raise exception 'rejection reason is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    raise exception 'missing required permission: admin.write';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_request
  from admin_security_deletion_requests
  where id = p_deletion_request_id
  for update;

  if v_request.id is null then
    raise exception 'admin security deletion request not found: %', p_deletion_request_id;
  end if;

  if v_request.status not in ('pending', 'approved') then
    raise exception 'deletion request cannot be rejected from status: %', v_request.status;
  end if;

  update admin_security_deletion_requests
  set
    status = 'rejected',
    rejected_by_auth_user_id = p_admin_auth_user_id,
    rejected_by_admin_user_id = v_admin.id,
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'rejection_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = v_request.id;

  update admin_security_deletion_request_items
  set
    status = 'skipped',
    metadata = metadata || jsonb_build_object(
      'skipped_reason',
      'deletion request rejected'
    ),
    updated_at = now()
  where admin_security_deletion_request_id = v_request.id
    and status = 'pending';

  perform record_admin_action(
    p_admin_auth_user_id,
    'reject_admin_security_deletion_request',
    'admin.write',
    'admin_security_deletion_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_rejection_reason,
    p_metadata
  );

  return v_request.id;
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

create or replace view admin_security_deletion_request_dashboard as
select
  r.id as admin_security_deletion_request_id,
  r.request_key,
  r.source_type,
  r.status,
  r.reason,
  r.period_start,
  r.period_end,
  r.requested_by_auth_user_id,
  requester.email as requested_by_email,
  requester.display_name as requested_by_display_name,
  r.approved_by_auth_user_id,
  approver.email as approved_by_email,
  r.approved_at,
  r.rejected_by_auth_user_id,
  rejecter.email as rejected_by_email,
  r.rejected_at,
  r.rejection_reason,
  r.executed_by_auth_user_id,
  executor.email as executed_by_email,
  r.executed_at,
  r.deleted_record_count,
  r.archive_manifest_id,
  m.archive_key,
  m.status as archive_manifest_status,
  m.storage_uri as archive_storage_uri,
  (
    select count(*)
    from admin_security_deletion_request_items i
    where i.admin_security_deletion_request_id = r.id
  ) as item_count,
  (
    select count(*)
    from admin_security_deletion_request_items i
    where i.admin_security_deletion_request_id = r.id
      and i.status = 'deleted'
  ) as deleted_item_count,
  (
    select count(*)
    from admin_security_deletion_request_items i
    where i.admin_security_deletion_request_id = r.id
      and i.status = 'failed'
  ) as failed_item_count,
  r.created_at,
  r.updated_at,
  r.metadata
from admin_security_deletion_requests r
left join admin_users requester
  on requester.id = r.requested_by_admin_user_id
left join admin_users approver
  on approver.id = r.approved_by_admin_user_id
left join admin_users rejecter
  on rejecter.id = r.rejected_by_admin_user_id
left join admin_users executor
  on executor.id = r.executed_by_admin_user_id
left join admin_security_archive_manifests m
  on m.id = r.archive_manifest_id
order by r.created_at desc;

create or replace view admin_security_deletion_integrity as
select
  (
    select count(*)
    from admin_security_deletion_requests
    where status = 'pending'
  ) as pending_deletion_request_count,
  (
    select count(*)
    from admin_security_deletion_requests
    where status = 'approved'
  ) as approved_deletion_request_count,
  (
    select count(*)
    from admin_security_deletion_requests
    where status = 'failed'
  ) as failed_deletion_request_count,
  (
    select count(*)
    from admin_security_deletion_requests
    where status = 'executed'
      and executed_at >= now() - interval '30 days'
  ) as executed_deletion_request_count_30d,
  (
    select coalesce(sum(deleted_record_count), 0)
    from admin_security_deletion_requests
    where status = 'executed'
      and executed_at >= now() - interval '30 days'
  ) as deleted_record_count_30d,
  now() as checked_at;

grant select on admin_security_deletion_request_dashboard to admin_api_role;
grant select on admin_security_deletion_integrity to admin_api_role;

create or replace function hash_admin_security_deletion_request(
  p_admin_security_deletion_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_security_deletion_requests%rowtype;
  v_items jsonb;
  v_payload jsonb;
begin
  select *
  into v_request
  from admin_security_deletion_requests
  where id = p_admin_security_deletion_request_id;

  if v_request.id is null then
    raise exception 'admin security deletion request not found: %', p_admin_security_deletion_request_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at asc), '[]'::jsonb)
  into v_items
  from admin_security_deletion_request_items i
  where i.admin_security_deletion_request_id = v_request.id;

  v_payload := jsonb_build_object(
    'source_type', 'admin_security_deletion_request',
    'source_id', v_request.id,
    'request_key', v_request.request_key,
    'deletion_source_type', v_request.source_type,
    'status', v_request.status,
    'reason', v_request.reason,
    'period_start', v_request.period_start,
    'period_end', v_request.period_end,
    'requested_by_auth_user_id', v_request.requested_by_auth_user_id,
    'approved_by_auth_user_id', v_request.approved_by_auth_user_id,
    'rejected_by_auth_user_id', v_request.rejected_by_auth_user_id,
    'executed_by_auth_user_id', v_request.executed_by_auth_user_id,
    'deleted_record_count', v_request.deleted_record_count,
    'archive_manifest_id', v_request.archive_manifest_id,
    'items', v_items,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at
  );

  return append_audit_hash_chain_entry(
    'admin_security_deletion_request',
    v_request.id,
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

alter table admin_security_deletion_requests enable row level security;
alter table admin_security_deletion_request_items enable row level security;

create policy admin_security_deletion_requests_no_user_direct_access
on admin_security_deletion_requests
for all
to authenticated
using (false)
with check (false);

create policy admin_security_deletion_request_items_no_user_direct_access
on admin_security_deletion_request_items
for all
to authenticated
using (false)
with check (false);

create policy admin_api_all_admin_security_deletion_requests
on admin_security_deletion_requests
for all
to admin_api_role
using (true)
with check (true);

create policy admin_api_all_admin_security_deletion_request_items
on admin_security_deletion_request_items
for all
to admin_api_role
using (true)
with check (true);

grant execute on function require_admin_security_deletion_allowed(text, timestamptz, timestamptz)
to admin_api_role;

grant execute on function create_admin_security_deletion_request(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function approve_admin_security_deletion_request(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function reject_admin_security_deletion_request(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function execute_admin_security_deletion_request(
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function hash_admin_security_deletion_request(uuid, jsonb)
to worker_role, admin_api_role;

alter function require_admin_security_deletion_allowed(text, timestamptz, timestamptz) security definer;
alter function require_admin_security_deletion_allowed(text, timestamptz, timestamptz) set search_path = public;

alter function create_admin_security_deletion_request(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  jsonb
) security definer;

alter function create_admin_security_deletion_request(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  jsonb
) set search_path = public;

alter function approve_admin_security_deletion_request(uuid, uuid, text, text, jsonb) security definer;
alter function approve_admin_security_deletion_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function reject_admin_security_deletion_request(uuid, uuid, text, text, jsonb) security definer;
alter function reject_admin_security_deletion_request(uuid, uuid, text, text, jsonb) set search_path = public;

alter function execute_admin_security_deletion_request(uuid, uuid, text, jsonb) security definer;
alter function execute_admin_security_deletion_request(uuid, uuid, text, jsonb) set search_path = public;

alter function hash_admin_security_deletion_request(uuid, jsonb) security definer;
alter function hash_admin_security_deletion_request(uuid, jsonb) set search_path = public;

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
    'ADMIN_SECURITY_DELETION_NOT_ALLOWED',
    'permission',
    'critical',
    403,
    false,
    true,
    'Security deletion is not allowed for this source.',
    'Admin security deletion blocked by retention policy.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_DELETION_ARCHIVE_REQUIRED',
    'permission',
    'critical',
    409,
    false,
    true,
    'Verified archive is required before deletion.',
    'Admin security deletion blocked by missing verified archive.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_DELETION_REQUEST_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Security deletion request not found.',
    'Admin security deletion request not found.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_DELETION_SECOND_APPROVER_REQUIRED',
    'permission',
    'critical',
    409,
    false,
    true,
    'Deletion request requires approval by a second admin.',
    'Admin security deletion second approver required.',
    'platform'
  ),
  (
    'ADMIN_SECURITY_DELETION_INVALID_STATE',
    'validation',
    'high',
    409,
    false,
    true,
    'Deletion request cannot be updated from its current state.',
    'Admin security deletion request invalid lifecycle state.',
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
  ('source type is immutable and cannot be deleted', 'ADMIN_SECURITY_DELETION_NOT_ALLOWED', 5, '{}'),
  ('deletion is not allowed for source type', 'ADMIN_SECURITY_DELETION_NOT_ALLOWED', 5, '{}'),
  ('delete_after_days is not configured', 'ADMIN_SECURITY_DELETION_NOT_ALLOWED', 5, '{}'),
  ('records are not old enough for deletion', 'ADMIN_SECURITY_DELETION_NOT_ALLOWED', 5, '{}'),
  ('verified archive manifest is required before deletion', 'ADMIN_SECURITY_DELETION_ARCHIVE_REQUIRED', 5, '{}'),
  ('admin security deletion request not found', 'ADMIN_SECURITY_DELETION_REQUEST_NOT_FOUND', 5, '{}'),
  ('deletion request requires approval by a second admin', 'ADMIN_SECURITY_DELETION_SECOND_APPROVER_REQUIRED', 5, '{}'),
  ('deletion request cannot be approved from status', 'ADMIN_SECURITY_DELETION_INVALID_STATE', 5, '{}'),
  ('deletion request cannot be rejected from status', 'ADMIN_SECURITY_DELETION_INVALID_STATE', 5, '{}'),
  ('deletion request cannot be executed from status', 'ADMIN_SECURITY_DELETION_INVALID_STATE', 5, '{}'),
  ('unsupported deletion source type', 'ADMIN_SECURITY_DELETION_NOT_ALLOWED', 5, '{}')
on conflict do nothing;
