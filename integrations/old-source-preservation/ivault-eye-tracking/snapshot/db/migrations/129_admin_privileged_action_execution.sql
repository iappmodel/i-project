-- Step 9.11 — Privileged admin action approval / rejection / execution flow.
-- Runs after 128_admin_super_admin_safety.sql.

create or replace function reject_admin_privileged_action(
  p_admin_auth_user_id uuid,
  p_privileged_action_request_id uuid,
  p_rejection_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_privileged_action_requests%rowtype;
  v_admin admin_users%rowtype;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_privileged_action_request_id is null then
    raise exception 'privileged action request id is required';
  end if;

  if p_rejection_reason is null or length(trim(p_rejection_reason)) = 0 then
    raise exception 'rejection reason is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'reject_admin_privileged_action',
      'admin.write',
      'admin_privileged_action_request',
      p_privileged_action_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is not true then
    raise exception 'only super_admin can reject privileged admin action';
  end if;

  select *
  into v_request
  from admin_privileged_action_requests
  where id = p_privileged_action_request_id
  for update;

  if v_request.id is null then
    raise exception 'privileged action request not found: %', p_privileged_action_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'privileged action request is not pending';
  end if;

  if v_request.expires_at <= now() then
    update admin_privileged_action_requests
    set
      status = 'expired',
      updated_at = now()
    where id = v_request.id;

    raise exception 'privileged action request expired';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_privileged_action_requests
  set
    status = 'rejected',
    rejected_by_auth_user_id = p_admin_auth_user_id,
    rejected_by_admin_user_id = v_admin.id,
    rejected_at = now(),
    rejection_reason = p_rejection_reason,
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'reject_admin_privileged_action',
    'admin.write',
    'admin_privileged_action_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_rejection_reason,
    p_metadata || jsonb_build_object(
      'action_key',
      v_request.action_key,
      'target_auth_user_id',
      v_request.target_auth_user_id
    )
  );

  perform create_admin_security_alert(
    'privileged_admin_action_rejected',
    'high',
    p_admin_auth_user_id,
    v_request.target_auth_user_id,
    v_request.action_key,
    v_request.id,
    'Privileged admin action rejected: ' || v_request.action_key,
    p_metadata || jsonb_build_object(
      'rejection_reason',
      p_rejection_reason
    )
  );

  return v_request.id;
end;
$$;

create or replace function execute_admin_privileged_action_internal(
  p_privileged_action_request_id uuid,
  p_executor_auth_user_id uuid,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_privileged_action_requests%rowtype;

  v_target_admin admin_users%rowtype;
  v_role admin_roles%rowtype;
  v_assignment admin_user_roles%rowtype;

  v_result_id uuid;
  v_super_admin_count integer;
begin
  select *
  into v_request
  from admin_privileged_action_requests
  where id = p_privileged_action_request_id
  for update;

  if v_request.id is null then
    raise exception 'privileged action request not found: %', p_privileged_action_request_id;
  end if;

  if v_request.status <> 'approved' then
    raise exception 'privileged action request must be approved before execution';
  end if;

  if v_request.executed_at is not null then
    return v_request.id;
  end if;

  if v_request.target_auth_user_id is null then
    raise exception 'target auth user id is required for privileged action execution';
  end if;

  select *
  into v_target_admin
  from admin_users
  where user_id = v_request.target_auth_user_id
  order by created_at desc
  limit 1;

  if v_request.action_key = 'assign_super_admin' then
    if v_target_admin.id is null or v_target_admin.status <> 'active' then
      raise exception 'target admin user not found or inactive';
    end if;

    v_result_id := assign_admin_role(
      v_request.target_auth_user_id,
      'super_admin',
      p_executor_auth_user_id,
      v_request.reason
    );

  elsif v_request.action_key = 'revoke_super_admin' then
    if v_target_admin.id is null then
      raise exception 'target admin user not found';
    end if;

    v_super_admin_count := count_active_super_admins();

    if v_super_admin_count <= 1 then
      raise exception 'cannot revoke last active super_admin';
    end if;

    if p_executor_auth_user_id = v_request.target_auth_user_id then
      raise exception 'executor cannot revoke own super_admin role';
    end if;

    select *
    into v_role
    from admin_roles
    where role_key = 'super_admin';

    select *
    into v_assignment
    from admin_user_roles
    where admin_user_id = v_target_admin.id
      and admin_role_id = v_role.id
      and status = 'active'
    for update;

    if v_assignment.id is null then
      raise exception 'active super_admin assignment not found';
    end if;

    update admin_user_roles
    set
      status = 'revoked',
      assigned_by = p_executor_auth_user_id,
      assigned_reason = v_request.reason,
      updated_at = now()
    where id = v_assignment.id;

    v_result_id := v_assignment.id;

  elsif v_request.action_key = 'suspend_super_admin' then
    v_super_admin_count := count_active_super_admins();

    if v_super_admin_count <= 1 then
      raise exception 'cannot suspend or revoke last active super_admin';
    end if;

    if p_executor_auth_user_id = v_request.target_auth_user_id then
      raise exception 'executor cannot suspend own super_admin account';
    end if;

    update admin_users
    set
      status = 'suspended',
      metadata = metadata || p_metadata || jsonb_build_object(
        'suspended_by_auth_user_id',
        p_executor_auth_user_id,
        'suspended_reason',
        v_request.reason,
        'privileged_action_request_id',
        v_request.id
      ),
      updated_at = now()
    where user_id = v_request.target_auth_user_id
    returning id into v_result_id;

  elsif v_request.action_key = 'revoke_admin_user' then
    v_super_admin_count := count_active_super_admins();

    if is_active_super_admin(v_request.target_auth_user_id) is true
      and v_super_admin_count <= 1 then
      raise exception 'cannot suspend or revoke last active super_admin';
    end if;

    if p_executor_auth_user_id = v_request.target_auth_user_id
      and is_active_super_admin(v_request.target_auth_user_id) is true then
      raise exception 'executor cannot revoke own super_admin account';
    end if;

    update admin_users
    set
      status = 'revoked',
      metadata = metadata || p_metadata || jsonb_build_object(
        'revoked_by_auth_user_id',
        p_executor_auth_user_id,
        'revoked_reason',
        v_request.reason,
        'privileged_action_request_id',
        v_request.id
      ),
      updated_at = now()
    where user_id = v_request.target_auth_user_id
    returning id into v_result_id;

  else
    raise exception 'unsupported privileged action: %', v_request.action_key;
  end if;

  update admin_privileged_action_requests
  set
    status = 'executed',
    executed_at = now(),
    execution_result = jsonb_build_object(
      'result_id',
      v_result_id,
      'executed_by_auth_user_id',
      p_executor_auth_user_id,
      'executed_at',
      now()
    ),
    metadata = metadata || p_metadata,
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_executor_auth_user_id,
    'execute_admin_privileged_action',
    'admin.write',
    'admin_privileged_action_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    v_request.reason,
    p_metadata || jsonb_build_object(
      'action_key',
      v_request.action_key,
      'target_auth_user_id',
      v_request.target_auth_user_id,
      'result_id',
      v_result_id
    )
  );

  perform create_admin_security_alert(
    'privileged_admin_action_executed',
    case
      when v_request.action_key in ('assign_super_admin', 'revoke_super_admin', 'suspend_super_admin')
      then 'critical'
      else 'high'
    end,
    p_executor_auth_user_id,
    v_request.target_auth_user_id,
    v_request.action_key,
    v_request.id,
    'Privileged admin action executed: ' || v_request.action_key,
    p_metadata || jsonb_build_object(
      'result_id',
      v_result_id
    )
  );

  return v_request.id;
end;
$$;

create or replace function approve_admin_privileged_action(
  p_admin_auth_user_id uuid,
  p_privileged_action_request_id uuid,
  p_approval_note text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_request admin_privileged_action_requests%rowtype;
  v_admin admin_users%rowtype;
  v_executed_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_privileged_action_request_id is null then
    raise exception 'privileged action request id is required';
  end if;

  if p_approval_note is null or length(trim(p_approval_note)) = 0 then
    raise exception 'approval note is required';
  end if;

  if admin_has_permission(p_admin_auth_user_id, 'admin.write') is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'approve_admin_privileged_action',
      'admin.write',
      'admin_privileged_action_request',
      p_privileged_action_request_id,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is not true then
    raise exception 'only super_admin can approve privileged admin action';
  end if;

  select *
  into v_request
  from admin_privileged_action_requests
  where id = p_privileged_action_request_id
  for update;

  if v_request.id is null then
    raise exception 'privileged action request not found: %', p_privileged_action_request_id;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'privileged action request is not pending';
  end if;

  if v_request.expires_at <= now() then
    update admin_privileged_action_requests
    set
      status = 'expired',
      updated_at = now()
    where id = v_request.id;

    raise exception 'privileged action request expired';
  end if;

  if v_request.requested_by_auth_user_id = p_admin_auth_user_id then
    perform record_admin_action(
      p_admin_auth_user_id,
      'approve_admin_privileged_action',
      'admin.write',
      'admin_privileged_action_request',
      v_request.id,
      p_request_id,
      null,
      null,
      'denied',
      'requester cannot approve own privileged action',
      p_metadata
    );

    raise exception 'requester cannot approve own privileged action';
  end if;

  v_admin := get_active_admin_user(p_admin_auth_user_id);

  update admin_privileged_action_requests
  set
    status = 'approved',
    approved_by_auth_user_id = p_admin_auth_user_id,
    approved_by_admin_user_id = v_admin.id,
    approved_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'approval_note',
      p_approval_note
    ),
    updated_at = now()
  where id = v_request.id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'approve_admin_privileged_action',
    'admin.write',
    'admin_privileged_action_request',
    v_request.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_approval_note,
    p_metadata || jsonb_build_object(
      'action_key',
      v_request.action_key,
      'target_auth_user_id',
      v_request.target_auth_user_id
    )
  );

  perform create_admin_security_alert(
    'privileged_admin_action_approved',
    case
      when v_request.action_key in ('assign_super_admin', 'revoke_super_admin', 'suspend_super_admin')
      then 'critical'
      else 'high'
    end,
    p_admin_auth_user_id,
    v_request.target_auth_user_id,
    v_request.action_key,
    v_request.id,
    'Privileged admin action approved: ' || v_request.action_key,
    p_metadata
  );

  v_executed_id := execute_admin_privileged_action_internal(
    v_request.id,
    p_admin_auth_user_id,
    p_request_id,
    p_metadata || jsonb_build_object(
      'approval_note',
      p_approval_note
    )
  );

  return v_executed_id;
end;
$$;

create or replace function expire_admin_privileged_action_requests(
  p_batch_size integer default 500,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_row record;
begin
  for v_row in
    select id, requested_by_auth_user_id, target_auth_user_id, action_key
    from admin_privileged_action_requests
    where status = 'pending'
      and expires_at <= now()
    order by expires_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_privileged_action_requests
    set
      status = 'expired',
      updated_at = now(),
      metadata = metadata || p_metadata || jsonb_build_object(
        'expired_by_run_id',
        v_run_id
      )
    where id = v_row.id;

    perform create_admin_security_alert(
      'privileged_admin_action_expired',
      'medium',
      null,
      v_row.target_auth_user_id,
      v_row.action_key,
      v_row.id,
      'Privileged admin action expired: ' || v_row.action_key,
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

alter table scheduled_jobs
drop constraint if exists scheduled_jobs_group_check;

alter table scheduled_jobs
add constraint scheduled_jobs_group_check
check (
  job_group in (
    'wallet',
    'reward',
    'trust',
    'identity_graph',
    'attention',
    'accounting',
    'audit',
    'payout',
    'withdrawal',
    'campaign',
    'model',
    'admin',
    'maintenance',
    'system'
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
  'admin_privileged_requests_expire_every_hour',
  'Expire privileged admin action requests',
  'admin',
  true,
  '0 * * * *',
  'expire_admin_privileged_action_requests',
  '{"batch_size": 500}'::jsonb,
  120,
  180,
  '{"priority": "medium"}'::jsonb
)
on conflict (job_key)
do update set
  enabled = excluded.enabled,
  schedule_cron = excluded.schedule_cron,
  function_name = excluded.function_name,
  function_args = excluded.function_args,
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

  elsif v_job.function_name = 'expire_admin_privileged_action_requests' then
    v_uuid_result := expire_admin_privileged_action_requests(
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

grant execute on function reject_admin_privileged_action(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function approve_admin_privileged_action(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function execute_admin_privileged_action_internal(
  uuid,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function expire_admin_privileged_action_requests(
  integer,
  jsonb
) to worker_role;

alter function reject_admin_privileged_action(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function reject_admin_privileged_action(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function approve_admin_privileged_action(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;

alter function approve_admin_privileged_action(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function execute_admin_privileged_action_internal(
  uuid,
  uuid,
  text,
  jsonb
) security definer;

alter function execute_admin_privileged_action_internal(
  uuid,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function expire_admin_privileged_action_requests(
  integer,
  jsonb
) security definer;

alter function expire_admin_privileged_action_requests(
  integer,
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
    'ADMIN_PRIVILEGED_ACTION_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Privileged action request not found.',
    'Privileged action request not found.',
    'platform'
  ),
  (
    'ADMIN_PRIVILEGED_ACTION_INVALID_STATE',
    'validation',
    'medium',
    409,
    false,
    true,
    'Privileged action request is not in a valid state.',
    'Privileged action request invalid state.',
    'platform'
  ),
  (
    'ADMIN_PRIVILEGED_ACTION_EXPIRED',
    'validation',
    'medium',
    409,
    false,
    true,
    'Privileged action request has expired.',
    'Privileged action request expired.',
    'platform'
  ),
  (
    'ADMIN_PRIVILEGED_ACTION_SELF_APPROVAL_BLOCKED',
    'permission',
    'high',
    409,
    false,
    true,
    'You cannot approve your own privileged action request.',
    'Requester attempted to approve own privileged action.',
    'platform'
  )
on conflict (error_code)
do update set
  category = excluded.category,
  severity = excluded.severity,
  http_status = excluded.http_status,
  retryable = excluded.retryable,
  user_visible = excluded.user_visible,
  user_message = excluded.user_message,
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
  ('privileged action request not found', 'ADMIN_PRIVILEGED_ACTION_NOT_FOUND', 5, '{}'),
  ('privileged action request is not pending', 'ADMIN_PRIVILEGED_ACTION_INVALID_STATE', 5, '{}'),
  ('privileged action request must be approved before execution', 'ADMIN_PRIVILEGED_ACTION_INVALID_STATE', 5, '{}'),
  ('privileged action request expired', 'ADMIN_PRIVILEGED_ACTION_EXPIRED', 5, '{}'),
  ('requester cannot approve own privileged action', 'ADMIN_PRIVILEGED_ACTION_SELF_APPROVAL_BLOCKED', 5, '{}'),
  ('only super_admin can approve privileged admin action', 'ADMIN_SUPER_ADMIN_REQUIRED', 5, '{}'),
  ('only super_admin can reject privileged admin action', 'ADMIN_SUPER_ADMIN_REQUIRED', 5, '{}')
on conflict do nothing;
