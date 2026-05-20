-- Step 9.28 — Build automatic session expiration + revoke-all-sessions on critical admin events.
-- Runs after 142_admin_session_revocation_reauth.sql.

create table if not exists admin_session_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  status text not null default 'active',
  max_session_age_seconds integer not null default 43200,
  max_idle_seconds integer not null default 3600,
  expire_reauth_required_after_seconds integer not null default 1800,
  revoke_sessions_on_password_reset boolean not null default true,
  revoke_sessions_on_mfa_factor_revoked boolean not null default true,
  revoke_sessions_on_role_revoked boolean not null default true,
  revoke_sessions_on_admin_suspended boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_session_policies_status_check
    check (status in ('active', 'paused', 'archived')),
  constraint admin_session_policies_seconds_check
    check (
      max_session_age_seconds > 0
      and max_idle_seconds > 0
      and expire_reauth_required_after_seconds > 0
    )
);

create index if not exists admin_session_policies_status_idx
on admin_session_policies (status);

drop trigger if exists admin_session_policies_set_updated_at
on admin_session_policies;

create trigger admin_session_policies_set_updated_at
before update on admin_session_policies
for each row
execute function set_updated_at();

insert into admin_session_policies (
  policy_key,
  status,
  max_session_age_seconds,
  max_idle_seconds,
  expire_reauth_required_after_seconds,
  metadata
)
values (
  'default_admin_session_policy_v1',
  'active',
  43200,
  3600,
  1800,
  '{"meaning": "default admin session expiration and revocation policy"}'::jsonb
)
on conflict (policy_key)
do update set
  status = excluded.status,
  max_session_age_seconds = excluded.max_session_age_seconds,
  max_idle_seconds = excluded.max_idle_seconds,
  expire_reauth_required_after_seconds = excluded.expire_reauth_required_after_seconds,
  metadata = admin_session_policies.metadata || excluded.metadata,
  updated_at = now();

create or replace function get_active_admin_session_policy()
returns admin_session_policies
language plpgsql
stable
as $$
declare
  v_policy admin_session_policies%rowtype;
begin
  select *
  into v_policy
  from admin_session_policies
  where status = 'active'
  order by updated_at desc
  limit 1;

  if v_policy.id is null then
    raise exception 'no active admin session policy found';
  end if;

  return v_policy;
end;
$$;

create or replace function expire_admin_sessions(
  p_batch_size integer default 1000,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_policy admin_session_policies%rowtype;
  v_control record;
begin
  if p_batch_size <= 0 or p_batch_size > 5000 then
    raise exception 'batch size must be between 1 and 5000';
  end if;

  v_policy := get_active_admin_session_policy();

  for v_control in
    select *
    from admin_session_controls
    where status in ('active', 'reauth_required')
      and (
        created_at <= now() - make_interval(secs => v_policy.max_session_age_seconds)
        or last_seen_at <= now() - make_interval(secs => v_policy.max_idle_seconds)
        or (
          status = 'reauth_required'
          and updated_at <= now() - make_interval(secs => v_policy.expire_reauth_required_after_seconds)
        )
      )
    order by last_seen_at asc
    limit p_batch_size
    for update skip locked
  loop
    update admin_session_controls
    set
      status = 'expired',
      forced_reauth_required = true,
      metadata = metadata || p_metadata || jsonb_build_object(
        'expired_by_run_id',
        v_run_id,
        'expired_at',
        now()
      ),
      updated_at = now()
    where id = v_control.id;

    perform create_admin_security_alert(
      'admin_session_expired',
      'medium',
      null,
      v_control.admin_auth_user_id,
      'expire_admin_sessions',
      null,
      'Admin session expired by session policy.',
      p_metadata || jsonb_build_object(
        'run_id',
        v_run_id,
        'admin_session_control_id',
        v_control.id,
        'session_id',
        v_control.session_id
      )
    );
  end loop;

  return v_run_id;
end;
$$;

create or replace function admin_revoke_all_sessions_for_admin(
  p_admin_auth_user_id uuid,
  p_target_admin_auth_user_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_actor_admin admin_users%rowtype;
  v_target_admin admin_users%rowtype;
  v_count integer := 0;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_admin_auth_user_id is null then
    raise exception 'target admin auth user id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
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
      'admin_revoke_all_sessions_for_admin'
    )
  );

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id,
    'admin_revoke_all_sessions_for_admin',
    'admin.write',
    null,
    'admin_user',
    null,
    p_request_id,
    p_metadata || jsonb_build_object(
      'target_admin_auth_user_id',
      p_target_admin_auth_user_id
    )
  );

  v_actor_admin := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_admin_auth_user_id
  order by created_at desc
  limit 1;

  if v_target_admin.id is null then
    raise exception 'target admin user not found';
  end if;

  update admin_session_controls
  set
    status = 'revoked',
    forced_reauth_required = true,
    revoked_at = now(),
    revoked_by_auth_user_id = p_admin_auth_user_id,
    revoked_by_admin_user_id = v_actor_admin.id,
    revoked_reason = p_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'bulk_revoked',
      true,
      'request_id',
      p_request_id
    ),
    updated_at = now()
  where admin_auth_user_id = p_target_admin_auth_user_id
    and status in ('active', 'reauth_required');

  get diagnostics v_count = row_count;

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_revoke_all_sessions_for_admin',
    'admin.write',
    'admin_user',
    v_target_admin.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'target_admin_auth_user_id',
      p_target_admin_auth_user_id,
      'revoked_session_count',
      v_count
    )
  );

  perform create_admin_security_alert(
    'admin_all_sessions_revoked',
    'critical',
    p_admin_auth_user_id,
    p_target_admin_auth_user_id,
    'admin_revoke_all_sessions_for_admin',
    null,
    'All active admin sessions were revoked.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'revoked_session_count',
      v_count,
      'reason',
      p_reason
    )
  );

  return v_count;
end;
$$;

create or replace function revoke_all_admin_sessions_internal(
  p_target_admin_auth_user_id uuid,
  p_reason text,
  p_source_action_key text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_count integer := 0;
begin
  if p_target_admin_auth_user_id is null then
    raise exception 'target admin auth user id is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  update admin_session_controls
  set
    status = 'revoked',
    forced_reauth_required = true,
    revoked_at = now(),
    revoked_by_auth_user_id = null,
    revoked_by_admin_user_id = null,
    revoked_reason = p_reason,
    metadata = metadata || p_metadata || jsonb_build_object(
      'internal_revocation',
      true,
      'source_action_key',
      p_source_action_key,
      'request_id',
      p_request_id
    ),
    updated_at = now()
  where admin_auth_user_id = p_target_admin_auth_user_id
    and status in ('active', 'reauth_required');

  get diagnostics v_count = row_count;

  perform create_admin_security_alert(
    'admin_all_sessions_revoked_internal',
    'critical',
    null,
    p_target_admin_auth_user_id,
    coalesce(p_source_action_key, 'revoke_all_admin_sessions_internal'),
    null,
    'All active admin sessions were revoked by internal security policy.',
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id,
      'revoked_session_count',
      v_count,
      'reason',
      p_reason
    )
  );

  return v_count;
end;
$$;

create or replace function disable_admin_mfa_factor(
  p_admin_auth_user_id uuid,
  p_factor_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_factor admin_mfa_factors%rowtype;
  v_active_factor_count integer;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;
  if p_factor_id is null then
    raise exception 'MFA factor id is required';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  select *
  into v_factor
  from admin_mfa_factors
  where id = p_factor_id
    and admin_auth_user_id = p_admin_auth_user_id
  for update;

  if v_factor.id is null then
    raise exception 'admin MFA factor not found: %', p_factor_id;
  end if;

  if v_factor.status <> 'active' then
    raise exception 'admin MFA factor is not active';
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is true then
    select count(*)
    into v_active_factor_count
    from admin_mfa_factors
    where admin_auth_user_id = p_admin_auth_user_id
      and status = 'active'
      and id <> p_factor_id;

    if v_active_factor_count <= 0 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'disable_admin_mfa_factor',
        null,
        'admin_mfa_factor',
        p_factor_id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot disable last active MFA factor for super_admin',
        p_metadata
      );
      raise exception 'cannot disable last active MFA factor for super_admin';
    end if;
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'disable_admin_mfa_factor',
      'factor_id',
      p_factor_id
    )
  );

  update admin_mfa_factors
  set
    status = 'disabled',
    disabled_at = now(),
    metadata = metadata || p_metadata || jsonb_build_object(
      'disabled_reason',
      p_reason,
      'disabled_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = p_factor_id;

  perform revoke_all_admin_sessions_internal(
    p_admin_auth_user_id,
    'MFA factor disabled',
    'disable_admin_mfa_factor',
    p_request_id,
    p_metadata || jsonb_build_object(
      'factor_id',
      p_factor_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'disable_admin_mfa_factor',
    null,
    'admin_mfa_factor',
    p_factor_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata
  );

  return p_factor_id;
end;
$$;

create or replace function revoke_admin_mfa_factor(
  p_admin_auth_user_id uuid,
  p_factor_id uuid,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_factor admin_mfa_factors%rowtype;
  v_active_factor_count integer;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;
  if p_factor_id is null then
    raise exception 'MFA factor id is required';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  select *
  into v_factor
  from admin_mfa_factors
  where id = p_factor_id
    and admin_auth_user_id = p_admin_auth_user_id
  for update;

  if v_factor.id is null then
    raise exception 'admin MFA factor not found: %', p_factor_id;
  end if;

  if v_factor.status not in ('pending', 'active', 'disabled') then
    raise exception 'admin MFA factor cannot be revoked from status: %', v_factor.status;
  end if;

  if is_active_super_admin(p_admin_auth_user_id) is true
    and v_factor.status = 'active' then
    select count(*)
    into v_active_factor_count
    from admin_mfa_factors
    where admin_auth_user_id = p_admin_auth_user_id
      and status = 'active'
      and id <> p_factor_id;

    if v_active_factor_count <= 0 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'revoke_admin_mfa_factor',
        null,
        'admin_mfa_factor',
        p_factor_id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot revoke last active MFA factor for super_admin',
        p_metadata
      );
      raise exception 'cannot revoke last active MFA factor for super_admin';
    end if;
  end if;

  perform require_admin_mfa(
    p_admin_auth_user_id,
    'admin_write',
    p_request_id,
    p_metadata || jsonb_build_object(
      'action_key',
      'revoke_admin_mfa_factor',
      'factor_id',
      p_factor_id
    )
  );

  update admin_mfa_factors
  set
    status = 'revoked',
    disabled_at = coalesce(disabled_at, now()),
    metadata = metadata || p_metadata || jsonb_build_object(
      'revoked_reason',
      p_reason,
      'revoked_request_id',
      p_request_id
    ),
    updated_at = now()
  where id = p_factor_id;

  perform revoke_all_admin_sessions_internal(
    p_admin_auth_user_id,
    'MFA factor revoked',
    'revoke_admin_mfa_factor',
    p_request_id,
    p_metadata || jsonb_build_object(
      'factor_id',
      p_factor_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'revoke_admin_mfa_factor',
    null,
    'admin_mfa_factor',
    p_factor_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata
  );

  return p_factor_id;
end;
$$;

create or replace function admin_revoke_admin_role(
  p_admin_auth_user_id uuid,
  p_target_auth_user_id uuid,
  p_role_key text,
  p_reason text,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_target_admin admin_users%rowtype;
  v_role admin_roles%rowtype;
  v_assignment admin_user_roles%rowtype;
  v_super_admin_count integer;
  v_privileged_request_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;
  if p_target_auth_user_id is null then
    raise exception 'target auth user id is required';
  end if;
  if p_role_key is null or length(trim(p_role_key)) = 0 then
    raise exception 'role key is required';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  v_permission := admin_has_permission(p_admin_auth_user_id, 'admin.write');
  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user',
      null, p_request_id, null, null, 'denied', 'missing admin.write permission', p_metadata
    );
    raise exception 'missing required permission: admin.write';
  end if;

  perform require_admin_action_risk_allowed(
    p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', null, 'admin_user', null,
    p_request_id, p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key
    )
  );

  perform require_admin_mfa(
    p_admin_auth_user_id,
    case when p_role_key = 'super_admin' then 'privileged_action' else 'admin_write' end,
    p_request_id,
    p_metadata || jsonb_build_object('action_key', 'admin_revoke_admin_role', 'role_key', p_role_key)
  );

  select * into v_target_admin from admin_users where user_id = p_target_auth_user_id;
  if v_target_admin.id is null then
    raise exception 'target admin user not found';
  end if;

  select * into v_role from admin_roles where role_key = p_role_key;
  if v_role.id is null then
    raise exception 'admin role not found: %', p_role_key;
  end if;

  select * into v_assignment
  from admin_user_roles
  where admin_user_id = v_target_admin.id
    and admin_role_id = v_role.id
    and status = 'active'
  for update;
  if v_assignment.id is null then
    raise exception 'admin role assignment not found';
  end if;

  if p_role_key = 'super_admin' then
    v_super_admin_count := count_active_super_admins();
    if v_super_admin_count <= 1 then
      perform record_admin_action(
        p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user',
        v_target_admin.id, p_request_id, null, null, 'denied',
        'cannot revoke last active super_admin', p_metadata
      );
      raise exception 'cannot revoke last active super_admin';
    end if;

    if p_admin_auth_user_id = p_target_auth_user_id then
      perform record_admin_action(
        p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user',
        v_target_admin.id, p_request_id, null, null, 'denied',
        'cannot self-revoke super_admin role', p_metadata
      );
      raise exception 'cannot self-revoke super_admin role';
    end if;

    v_privileged_request_id := request_admin_privileged_action(
      p_admin_auth_user_id,
      'revoke_super_admin',
      p_target_auth_user_id,
      'super_admin',
      null,
      p_reason,
      jsonb_build_object(
        'target_auth_user_id', p_target_auth_user_id,
        'role_key', p_role_key,
        'assignment_id', v_assignment.id
      ),
      p_request_id,
      p_metadata
    );
    return v_privileged_request_id;
  end if;

  update admin_user_roles
  set
    status = 'revoked',
    assigned_by = p_admin_auth_user_id,
    assigned_reason = p_reason,
    updated_at = now()
  where id = v_assignment.id;

  perform record_admin_action(
    p_admin_auth_user_id, 'admin_revoke_admin_role', 'admin.write', 'admin_user', v_target_admin.id,
    p_request_id, null, null, 'allowed', p_reason,
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key,
      'assignment_id', v_assignment.id
    )
  );

  if p_role_key = 'super_admin' then
    perform revoke_all_admin_sessions_internal(
      p_target_auth_user_id,
      'super_admin role revoked',
      'admin_revoke_admin_role',
      p_request_id,
      p_metadata || jsonb_build_object(
        'role_key',
        p_role_key
      )
    );
  end if;

  return v_assignment.id;
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

    perform revoke_all_admin_sessions_internal(
      v_request.target_auth_user_id,
      'super_admin role revoked by privileged action',
      'revoke_super_admin',
      p_request_id,
      p_metadata || jsonb_build_object(
        'privileged_action_request_id',
        v_request.id
      )
    );

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

    perform revoke_all_admin_sessions_internal(
      v_request.target_auth_user_id,
      'super_admin account suspended',
      'suspend_super_admin',
      p_request_id,
      p_metadata || jsonb_build_object(
        'privileged_action_request_id',
        v_request.id
      )
    );

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

    perform revoke_all_admin_sessions_internal(
      v_request.target_auth_user_id,
      'admin user revoked',
      'revoke_admin_user',
      p_request_id,
      p_metadata || jsonb_build_object(
        'privileged_action_request_id',
        v_request.id
      )
    );

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
  'admin_sessions_expire_every_5_minutes',
  'Expire stale admin sessions',
  'admin',
  true,
  '*/5 * * * *',
  'expire_admin_sessions',
  '{"batch_size": 1000}'::jsonb,
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

  elsif v_job.function_name = 'expire_admin_sessions' then
    v_uuid_result := expire_admin_sessions(
      coalesce((v_job.function_args->>'batch_size')::integer, 1000),
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

create or replace view admin_session_integrity as
select
  (
    select count(*)
    from admin_session_controls
    where status = 'active'
  ) as active_session_count,
  (
    select count(*)
    from admin_session_controls
    where status = 'reauth_required'
  ) as reauth_required_session_count,
  (
    select count(*)
    from admin_session_controls
    where status = 'revoked'
      and revoked_at >= now() - interval '24 hours'
  ) as revoked_session_count_24h,
  (
    select count(*)
    from admin_session_controls
    where status = 'expired'
      and updated_at >= now() - interval '24 hours'
  ) as expired_session_count_24h,
  (
    select count(*)
    from admin_session_controls
    where status = 'active'
      and last_seen_at <= now() - interval '1 hour'
  ) as idle_active_session_count,
  now() as checked_at;

grant select on admin_session_integrity to admin_api_role;

alter table system_health_snapshots
add column if not exists active_admin_session_count bigint not null default 0,
add column if not exists reauth_required_admin_session_count bigint not null default 0,
add column if not exists revoked_admin_session_count_24h bigint not null default 0,
add column if not exists expired_admin_session_count_24h bigint not null default 0,
add column if not exists idle_active_admin_session_count bigint not null default 0;

create or replace function create_system_health_snapshot(
  p_snapshot_type text default 'scheduled',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_snapshot_id uuid;
  v_wallet_count bigint := 0;
  v_active_wallet_count bigint := 0;
  v_available bigint := 0;
  v_pending bigint := 0;
  v_locked bigint := 0;
  v_total bigint := 0;
  v_reward_pending bigint := 0;
  v_reward_completed_24h bigint := 0;
  v_reward_failed_24h bigint := 0;
  v_attention_events_1h bigint := 0;
  v_attention_passed_1h bigint := 0;
  v_attention_fraud_1h bigint := 0;
  v_unbalanced_journals bigint := 0;
  v_missing_reward_mirrors bigint := 0;
  v_wallet_accounting_delta bigint := 0;
  v_audit_missing bigint := 0;
  v_audit_broken_24h bigint := 0;
  v_failed_jobs_24h bigint := 0;
  v_critical_errors_1h bigint := 0;
  v_high_errors_1h bigint := 0;
  v_withdrawal_requested bigint := 0;
  v_withdrawal_reserved bigint := 0;
  v_withdrawal_submitted bigint := 0;
  v_withdrawal_paid_24h bigint := 0;
  v_withdrawal_failed_24h bigint := 0;
  v_withdrawal_integrity_issues bigint := 0;
  v_active_admin_session_count bigint := 0;
  v_reauth_required_admin_session_count bigint := 0;
  v_revoked_admin_session_count_24h bigint := 0;
  v_expired_admin_session_count_24h bigint := 0;
  v_idle_active_admin_session_count bigint := 0;
  v_attention_pass_rate_1h numeric := 0;
  v_attention_fraud_rate_1h numeric := 0;
  v_status text := 'healthy';
begin
  select
    count(*),
    count(*) filter (where status = 'active'),
    coalesce(sum(available_balance_minor), 0),
    coalesce(sum(pending_balance_minor), 0),
    coalesce(sum(locked_balance_minor), 0),
    coalesce(sum(total_balance_minor), 0)
  into
    v_wallet_count,
    v_active_wallet_count,
    v_available,
    v_pending,
    v_locked,
    v_total
  from wallets;

  select
    count(*) filter (where status in ('pending', 'processing')),
    count(*) filter (
      where status = 'completed'
        and completed_at >= now() - interval '24 hours'
    ),
    count(*) filter (
      where status = 'failed'
        and failed_at >= now() - interval '24 hours'
    )
  into
    v_reward_pending,
    v_reward_completed_24h,
    v_reward_failed_24h
  from reward_issuance_groups;

  select
    count(*),
    count(*) filter (where decision = 'passed'),
    count(*) filter (where decision = 'fraud_suspected')
  into
    v_attention_events_1h,
    v_attention_passed_1h,
    v_attention_fraud_1h
  from attention_verification_events
  where occurred_at >= now() - interval '1 hour';

  v_attention_pass_rate_1h :=
    case
      when v_attention_events_1h > 0
      then v_attention_passed_1h::numeric / v_attention_events_1h
      else 0
    end;

  v_attention_fraud_rate_1h :=
    case
      when v_attention_events_1h > 0
      then v_attention_fraud_1h::numeric / v_attention_events_1h
      else 0
    end;

  select count(*)
  into v_unbalanced_journals
  from accounting_unbalanced_journals;

  select count(*)
  into v_missing_reward_mirrors
  from accounting_missing_reward_mirrors;

  select coalesce(wallet_vs_accounting_delta_minor, 0)
  into v_wallet_accounting_delta
  from money_integrity_dashboard
  limit 1;

  select count(*)
  into v_audit_missing
  from audit_hash_missing_records;

  select count(*)
  into v_audit_broken_24h
  from audit_hash_chain_verification_runs
  where status = 'completed'
    and broken_entry_count > 0
    and started_at >= now() - interval '24 hours';

  select count(*)
  into v_failed_jobs_24h
  from scheduled_job_runs
  where status = 'failed'
    and started_at >= now() - interval '24 hours';

  select
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'high')
  into
    v_critical_errors_1h,
    v_high_errors_1h
  from error_events
  where occurred_at >= now() - interval '1 hour';

  select
    count(*) filter (where status = 'approved'),
    count(*) filter (where status = 'reserved'),
    count(*) filter (where status in ('submitted', 'processing')),
    count(*) filter (where status = 'paid' and paid_at >= now() - interval '24 hours'),
    count(*) filter (where status = 'failed' and failed_at >= now() - interval '24 hours')
  into
    v_withdrawal_requested,
    v_withdrawal_reserved,
    v_withdrawal_submitted,
    v_withdrawal_paid_24h,
    v_withdrawal_failed_24h
  from withdrawal_requests;

  select count(*)
  into v_withdrawal_integrity_issues
  from withdrawal_integrity_check
  where has_integrity_issue is true;

  select
    active_session_count,
    reauth_required_session_count,
    revoked_session_count_24h,
    expired_session_count_24h,
    idle_active_session_count
  into
    v_active_admin_session_count,
    v_reauth_required_admin_session_count,
    v_revoked_admin_session_count_24h,
    v_expired_admin_session_count_24h,
    v_idle_active_admin_session_count
  from admin_session_integrity;

  v_status :=
    case
      when v_unbalanced_journals > 0
        or v_wallet_accounting_delta <> 0
        or v_audit_broken_24h > 0
        or v_critical_errors_1h > 0
        or v_withdrawal_integrity_issues > 0
      then 'critical'

      when v_missing_reward_mirrors > 0
        or v_audit_missing > 0
        or v_failed_jobs_24h >= 3
        or v_high_errors_1h >= 5
      then 'degraded'

      when v_reauth_required_admin_session_count > 0
        or v_idle_active_admin_session_count > 0
        or v_reward_failed_24h > 0
        or v_failed_jobs_24h > 0
        or v_attention_fraud_rate_1h >= 0.10
      then 'warning'

      else 'healthy'
    end;

  insert into system_health_snapshots (
    snapshot_type,
    status,
    wallet_count,
    active_wallet_count,
    total_available_balance_minor,
    total_pending_balance_minor,
    total_locked_balance_minor,
    total_wallet_balance_minor,
    reward_pending_count,
    reward_completed_count_24h,
    reward_failed_count_24h,
    attention_event_count_1h,
    attention_passed_count_1h,
    attention_fraud_suspected_count_1h,
    unbalanced_journal_count,
    missing_reward_mirror_count,
    wallet_accounting_delta_minor,
    audit_missing_hash_record_count,
    audit_broken_verification_count_24h,
    failed_scheduled_job_count_24h,
    critical_error_count_1h,
    high_error_count_1h,
    withdrawal_requested_count,
    withdrawal_reserved_count,
    withdrawal_submitted_count,
    withdrawal_paid_count_24h,
    withdrawal_failed_count_24h,
    withdrawal_integrity_issue_count,
    active_admin_session_count,
    reauth_required_admin_session_count,
    revoked_admin_session_count_24h,
    expired_admin_session_count_24h,
    idle_active_admin_session_count,
    metrics,
    metadata
  )
  values (
    coalesce(p_snapshot_type, 'scheduled'),
    v_status,
    v_wallet_count,
    v_active_wallet_count,
    v_available,
    v_pending,
    v_locked,
    v_total,
    v_reward_pending,
    v_reward_completed_24h,
    v_reward_failed_24h,
    v_attention_events_1h,
    v_attention_passed_1h,
    v_attention_fraud_1h,
    v_unbalanced_journals,
    v_missing_reward_mirrors,
    v_wallet_accounting_delta,
    v_audit_missing,
    v_audit_broken_24h,
    v_failed_jobs_24h,
    v_critical_errors_1h,
    v_high_errors_1h,
    v_withdrawal_requested,
    v_withdrawal_reserved,
    v_withdrawal_submitted,
    v_withdrawal_paid_24h,
    v_withdrawal_failed_24h,
    v_withdrawal_integrity_issues,
    v_active_admin_session_count,
    v_reauth_required_admin_session_count,
    v_revoked_admin_session_count_24h,
    v_expired_admin_session_count_24h,
    v_idle_active_admin_session_count,
    jsonb_build_object(
      'attention_pass_rate_1h', v_attention_pass_rate_1h,
      'attention_fraud_rate_1h', v_attention_fraud_rate_1h
    ),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_snapshot_id;

  perform emit_platform_event(
    'system_health_snapshot_created',
    'system',
    case
      when v_status = 'critical' then 'critical'
      when v_status = 'degraded' then 'high'
      when v_status = 'warning' then 'warning'
      else 'info'
    end,
    'observability_engine',
    null,
    null,
    null,
    'system_health_snapshot',
    v_snapshot_id,
    null,
    null,
    'System health snapshot created',
    jsonb_build_object(
      'status', v_status,
      'wallet_accounting_delta_minor', v_wallet_accounting_delta,
      'unbalanced_journal_count', v_unbalanced_journals,
      'audit_missing_hash_record_count', v_audit_missing,
      'failed_scheduled_job_count_24h', v_failed_jobs_24h,
      'critical_error_count_1h', v_critical_errors_1h,
      'withdrawal_integrity_issue_count', v_withdrawal_integrity_issues
    ),
    p_metadata
  );

  return v_snapshot_id;
end;
$$;

create or replace view platform_operations_dashboard as
select
  shs.id as latest_snapshot_id,
  shs.status as system_status,
  shs.created_at as snapshot_at,
  shs.wallet_count,
  shs.active_wallet_count,
  shs.total_available_balance_minor,
  shs.total_pending_balance_minor,
  shs.total_locked_balance_minor,
  shs.total_wallet_balance_minor,
  shs.reward_pending_count,
  shs.reward_completed_count_24h,
  shs.reward_failed_count_24h,
  shs.attention_event_count_1h,
  shs.attention_passed_count_1h,
  shs.attention_fraud_suspected_count_1h,
  shs.unbalanced_journal_count,
  shs.missing_reward_mirror_count,
  shs.wallet_accounting_delta_minor,
  shs.audit_missing_hash_record_count,
  shs.audit_broken_verification_count_24h,
  shs.failed_scheduled_job_count_24h,
  shs.critical_error_count_1h,
  shs.high_error_count_1h,
  shs.withdrawal_requested_count,
  shs.withdrawal_reserved_count,
  shs.withdrawal_submitted_count,
  shs.withdrawal_paid_count_24h,
  shs.withdrawal_failed_count_24h,
  shs.withdrawal_integrity_issue_count,
  shs.active_admin_session_count,
  shs.reauth_required_admin_session_count,
  shs.revoked_admin_session_count_24h,
  shs.expired_admin_session_count_24h,
  shs.idle_active_admin_session_count,
  shs.metrics,
  (
    select jsonb_agg(
      jsonb_build_object(
        'job_key', job_key,
        'job_name', job_name,
        'job_group', job_group,
        'last_status', last_status,
        'last_failed_at', last_failed_at,
        'last_completed_at', last_completed_at,
        'alert_type', alert_type
      )
      order by last_failed_at desc nulls last
    )
    from scheduled_job_alerts
  ) as job_alerts,
  (
    select jsonb_agg(
      jsonb_build_object(
        'error_code', error_code,
        'category', category,
        'severity', severity,
        'owner_team', owner_team,
        'count_1h', count_1h,
        'count_24h', count_24h,
        'last_seen_at', last_seen_at
      )
      order by
        case severity
          when 'critical' then 1
          when 'high' then 2
          when 'medium' then 3
          else 4
        end,
        count_1h desc,
        count_24h desc
    )
    from error_event_dashboard
    where count_1h > 0
       or count_24h > 0
  ) as error_summary
from system_health_snapshots shs
order by shs.created_at desc
limit 1;

create or replace view admin_system_command_center as
select
  pod.latest_snapshot_id,
  pod.system_status,
  pod.snapshot_at,
  pod.wallet_count,
  pod.active_wallet_count,
  pod.total_available_balance_minor,
  pod.total_pending_balance_minor,
  pod.total_locked_balance_minor,
  pod.total_wallet_balance_minor,
  pod.reward_pending_count,
  pod.reward_completed_count_24h,
  pod.reward_failed_count_24h,
  pod.attention_event_count_1h,
  pod.attention_passed_count_1h,
  pod.attention_fraud_suspected_count_1h,
  pod.unbalanced_journal_count,
  pod.missing_reward_mirror_count,
  pod.wallet_accounting_delta_minor,
  pod.audit_missing_hash_record_count,
  pod.audit_broken_verification_count_24h,
  pod.failed_scheduled_job_count_24h,
  pod.critical_error_count_1h,
  pod.high_error_count_1h,
  pod.withdrawal_requested_count,
  pod.withdrawal_reserved_count,
  pod.withdrawal_submitted_count,
  pod.withdrawal_paid_count_24h,
  pod.withdrawal_failed_count_24h,
  pod.withdrawal_integrity_issue_count,
  pod.active_admin_session_count,
  pod.reauth_required_admin_session_count,
  pod.revoked_admin_session_count_24h,
  pod.expired_admin_session_count_24h,
  pod.idle_active_admin_session_count,
  pod.metrics,
  pod.job_alerts,
  pod.error_summary,
  (
    select jsonb_agg(
      jsonb_build_object(
        'alert_event_id', alert_event_id,
        'alert_key', alert_key,
        'alert_name', alert_name,
        'category', category,
        'severity', severity,
        'status', status,
        'metric_name', metric_name,
        'metric_value', metric_value,
        'threshold', threshold,
        'message', message,
        'created_at', created_at
      )
      order by
        case severity
          when 'critical' then 1
          when 'high' then 2
          else 3
        end,
        created_at desc
    )
    from alert_dashboard
    where status in ('open', 'acknowledged')
  ) as active_alerts
from platform_operations_dashboard pod;

alter table admin_session_policies enable row level security;

drop policy if exists admin_session_policies_no_user_direct_access
on admin_session_policies;
create policy admin_session_policies_no_user_direct_access
on admin_session_policies
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_read_admin_session_policies
on admin_session_policies;
create policy admin_api_read_admin_session_policies
on admin_session_policies
for select
to admin_api_role
using (true);

drop policy if exists worker_read_admin_session_policies
on admin_session_policies;
create policy worker_read_admin_session_policies
on admin_session_policies
for select
to worker_role
using (true);

grant execute on function get_active_admin_session_policy()
to admin_api_role, worker_role;

grant execute on function expire_admin_sessions(integer, jsonb)
to worker_role;

grant execute on function admin_revoke_all_sessions_for_admin(
  uuid,
  uuid,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function revoke_all_admin_sessions_internal(
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role, worker_role;

alter function get_active_admin_session_policy() security definer;
alter function get_active_admin_session_policy() set search_path = public;

alter function expire_admin_sessions(integer, jsonb) security definer;
alter function expire_admin_sessions(integer, jsonb) set search_path = public;

alter function admin_revoke_all_sessions_for_admin(
  uuid,
  uuid,
  text,
  text,
  jsonb
) security definer;
alter function admin_revoke_all_sessions_for_admin(
  uuid,
  uuid,
  text,
  text,
  jsonb
) set search_path = public;

alter function revoke_all_admin_sessions_internal(
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;
alter function revoke_all_admin_sessions_internal(
  uuid,
  text,
  text,
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
    'ADMIN_SESSION_POLICY_MISSING',
    'system',
    'critical',
    500,
    false,
    false,
    'Admin session policy unavailable.',
    'No active admin session policy found.',
    'platform'
  ),
  (
    'ADMIN_REVOKE_ALL_SESSIONS_FAILED',
    'system',
    'high',
    500,
    true,
    false,
    'Failed to revoke admin sessions.',
    'Admin bulk session revocation failed.',
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
  ('no active admin session policy found', 'ADMIN_SESSION_POLICY_MISSING', 5, '{}'),
  ('target admin user not found', 'ADMIN_REVOKE_ALL_SESSIONS_FAILED', 5, '{}')
on conflict do nothing;
