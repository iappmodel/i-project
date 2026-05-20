-- Step 9.10 — Add super-admin safety rails + admin action alerts.
-- Runs after 127_admin_role_management.sql.

create table if not exists admin_privileged_action_requests (
  id uuid primary key default gen_random_uuid(),

  requested_by_auth_user_id uuid not null,
  requested_by_admin_user_id uuid references admin_users(id),

  action_key text not null,

  target_auth_user_id uuid,
  target_admin_user_id uuid references admin_users(id),

  target_role_key text,
  target_permission_key text,

  status text not null default 'pending',

  reason text not null,

  requested_payload jsonb not null default '{}'::jsonb,

  approved_by_auth_user_id uuid,
  approved_by_admin_user_id uuid references admin_users(id),
  approved_at timestamptz,

  rejected_by_auth_user_id uuid,
  rejected_by_admin_user_id uuid references admin_users(id),
  rejected_at timestamptz,

  rejection_reason text,

  executed_at timestamptz,
  execution_result jsonb,

  expires_at timestamptz not null default (now() + interval '24 hours'),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_privileged_action_requests_action_check
  check (
    action_key in (
      'assign_super_admin',
      'revoke_super_admin',
      'suspend_super_admin',
      'revoke_admin_user',
      'grant_admin_write',
      'revoke_admin_write'
    )
  ),

  constraint admin_privileged_action_requests_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected',
      'expired',
      'executed',
      'cancelled'
    )
  )
);

create index if not exists admin_privileged_action_requests_status_idx
on admin_privileged_action_requests (status, created_at asc);

create index if not exists admin_privileged_action_requests_requester_idx
on admin_privileged_action_requests (requested_by_auth_user_id, created_at desc);

create index if not exists admin_privileged_action_requests_target_idx
on admin_privileged_action_requests (target_auth_user_id, created_at desc);

drop trigger if exists admin_privileged_action_requests_set_updated_at
on admin_privileged_action_requests;

create trigger admin_privileged_action_requests_set_updated_at
before update on admin_privileged_action_requests
for each row
execute function set_updated_at();

create table if not exists admin_security_alert_events (
  id uuid primary key default gen_random_uuid(),

  alert_key text not null,
  severity text not null default 'high',

  actor_auth_user_id uuid,
  actor_admin_user_id uuid references admin_users(id),

  target_auth_user_id uuid,
  target_admin_user_id uuid references admin_users(id),

  action_key text,
  privileged_action_request_id uuid references admin_privileged_action_requests(id),

  status text not null default 'open',

  message text not null,

  metadata jsonb not null default '{}'::jsonb,

  acknowledged_by_auth_user_id uuid,
  acknowledged_at timestamptz,

  resolved_by_auth_user_id uuid,
  resolved_at timestamptz,
  resolution_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_security_alert_events_severity_check
  check (
    severity in (
      'low',
      'medium',
      'high',
      'critical'
    )
  ),

  constraint admin_security_alert_events_status_check
  check (
    status in (
      'open',
      'acknowledged',
      'resolved',
      'dismissed'
    )
  )
);

create index if not exists admin_security_alert_events_status_idx
on admin_security_alert_events (status, severity, created_at desc);

create index if not exists admin_security_alert_events_actor_idx
on admin_security_alert_events (actor_auth_user_id, created_at desc);

create index if not exists admin_security_alert_events_target_idx
on admin_security_alert_events (target_auth_user_id, created_at desc);

drop trigger if exists admin_security_alert_events_set_updated_at
on admin_security_alert_events;

create trigger admin_security_alert_events_set_updated_at
before update on admin_security_alert_events
for each row
execute function set_updated_at();

create or replace function count_active_super_admins()
returns integer
language plpgsql
stable
as $$
declare
  v_count integer;
begin
  select count(distinct au.id)
  into v_count
  from admin_users au
  join admin_user_roles aur
    on aur.admin_user_id = au.id
   and aur.status = 'active'
  join admin_roles ar
    on ar.id = aur.admin_role_id
   and ar.status = 'active'
  where au.status = 'active'
    and ar.role_key = 'super_admin';

  return coalesce(v_count, 0);
end;
$$;

create or replace function is_active_super_admin(
  p_auth_user_id uuid
)
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from admin_users au
    join admin_user_roles aur
      on aur.admin_user_id = au.id
     and aur.status = 'active'
    join admin_roles ar
      on ar.id = aur.admin_role_id
     and ar.status = 'active'
    where au.user_id = p_auth_user_id
      and au.status = 'active'
      and ar.role_key = 'super_admin'
  );
end;
$$;

create or replace function create_admin_security_alert(
  p_alert_key text,
  p_severity text,
  p_actor_auth_user_id uuid default null,
  p_target_auth_user_id uuid default null,
  p_action_key text default null,
  p_privileged_action_request_id uuid default null,
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_actor_admin admin_users%rowtype;
  v_target_admin admin_users%rowtype;
  v_alert_id uuid;
begin
  if p_alert_key is null or length(trim(p_alert_key)) = 0 then
    raise exception 'alert key is required';
  end if;

  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'alert message is required';
  end if;

  if p_actor_auth_user_id is not null then
    v_actor_admin := get_active_admin_user(p_actor_auth_user_id);
  end if;

  if p_target_auth_user_id is not null then
    select *
    into v_target_admin
    from admin_users
    where user_id = p_target_auth_user_id
    order by created_at desc
    limit 1;
  end if;

  insert into admin_security_alert_events (
    alert_key,
    severity,
    actor_auth_user_id,
    actor_admin_user_id,
    target_auth_user_id,
    target_admin_user_id,
    action_key,
    privileged_action_request_id,
    status,
    message,
    metadata
  )
  values (
    p_alert_key,
    coalesce(p_severity, 'high'),
    p_actor_auth_user_id,
    v_actor_admin.id,
    p_target_auth_user_id,
    v_target_admin.id,
    p_action_key,
    p_privileged_action_request_id,
    'open',
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_alert_id;

  return v_alert_id;
end;
$$;

create or replace function request_admin_privileged_action(
  p_admin_auth_user_id uuid,
  p_action_key text,
  p_target_auth_user_id uuid,
  p_target_role_key text default null,
  p_target_permission_key text default null,
  p_reason text default null,
  p_requested_payload jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_requester admin_users%rowtype;
  v_target_admin admin_users%rowtype;
  v_request_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_action_key is null then
    raise exception 'action key is required';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required';
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'request_admin_privileged_action',
      'admin.write',
      'admin_user',
      null,
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
    perform record_admin_action(
      p_admin_auth_user_id,
      'request_admin_privileged_action',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'only super_admin can request privileged admin action',
      p_metadata
    );

    raise exception 'only super_admin can request privileged admin action';
  end if;

  v_requester := get_active_admin_user(p_admin_auth_user_id);

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
  order by created_at desc
  limit 1;

  insert into admin_privileged_action_requests (
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    action_key,
    target_auth_user_id,
    target_admin_user_id,
    target_role_key,
    target_permission_key,
    status,
    reason,
    requested_payload,
    metadata
  )
  values (
    p_admin_auth_user_id,
    v_requester.id,
    p_action_key,
    p_target_auth_user_id,
    v_target_admin.id,
    p_target_role_key,
    p_target_permission_key,
    'pending',
    p_reason,
    coalesce(p_requested_payload, '{}'::jsonb),
    p_metadata || jsonb_build_object(
      'request_id',
      p_request_id
    )
  )
  returning id into v_request_id;

  perform record_admin_action(
    p_admin_auth_user_id,
    'request_admin_privileged_action',
    'admin.write',
    'admin_privileged_action_request',
    v_request_id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'action_key',
      p_action_key,
      'target_auth_user_id',
      p_target_auth_user_id,
      'target_role_key',
      p_target_role_key
    )
  );

  perform create_admin_security_alert(
    'privileged_admin_action_requested',
    case
      when p_action_key in ('assign_super_admin', 'revoke_super_admin', 'suspend_super_admin')
      then 'critical'
      else 'high'
    end,
    p_admin_auth_user_id,
    p_target_auth_user_id,
    p_action_key,
    v_request_id,
    'Privileged admin action requested: ' || p_action_key,
    p_metadata
  );

  return v_request_id;
end;
$$;

create or replace function admin_assign_admin_role(
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
  v_assignment_id uuid;
  v_target_admin admin_users%rowtype;
  v_role admin_roles%rowtype;
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

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_assign_admin_role',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
    and status = 'active';

  if v_target_admin.id is null then
    raise exception 'target admin user not found or inactive';
  end if;

  select *
  into v_role
  from admin_roles
  where role_key = p_role_key
    and status = 'active';

  if v_role.id is null then
    raise exception 'admin role not found: %', p_role_key;
  end if;

  if p_role_key = 'super_admin' then
    v_privileged_request_id := request_admin_privileged_action(
      p_admin_auth_user_id,
      'assign_super_admin',
      p_target_auth_user_id,
      'super_admin',
      null,
      p_reason,
      jsonb_build_object(
        'target_auth_user_id',
        p_target_auth_user_id,
        'role_key',
        p_role_key
      ),
      p_request_id,
      p_metadata
    );

    return v_privileged_request_id;
  end if;

  v_assignment_id := assign_admin_role(
    p_target_auth_user_id,
    p_role_key,
    p_admin_auth_user_id,
    p_reason
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_assign_admin_role',
    'admin.write',
    'admin_user',
    v_target_admin.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key,
      'assignment_id', v_assignment_id
    )
  );

  return v_assignment_id;
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

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_revoke_admin_role',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id;

  if v_target_admin.id is null then
    raise exception 'target admin user not found';
  end if;

  select *
  into v_role
  from admin_roles
  where role_key = p_role_key;

  if v_role.id is null then
    raise exception 'admin role not found: %', p_role_key;
  end if;

  select *
  into v_assignment
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
        p_admin_auth_user_id,
        'admin_revoke_admin_role',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot revoke last active super_admin',
        p_metadata
      );

      raise exception 'cannot revoke last active super_admin';
    end if;

    if p_admin_auth_user_id = p_target_auth_user_id then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_revoke_admin_role',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot self-revoke super_admin role',
        p_metadata
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
        'target_auth_user_id',
        p_target_auth_user_id,
        'role_key',
        p_role_key,
        'assignment_id',
        v_assignment.id
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
    p_admin_auth_user_id,
    'admin_revoke_admin_role',
    'admin.write',
    'admin_user',
    v_target_admin.id,
    p_request_id,
    null,
    null,
    'allowed',
    p_reason,
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'role_key', p_role_key,
      'assignment_id', v_assignment.id
    )
  );

  return v_assignment.id;
end;
$$;

create or replace function admin_upsert_admin_user(
  p_admin_auth_user_id uuid,
  p_target_auth_user_id uuid,
  p_email text default null,
  p_display_name text default null,
  p_status text default 'active',
  p_reason text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_permission boolean;
  v_admin_user_id uuid;
  v_target_admin admin_users%rowtype;
  v_target_is_super boolean;
  v_super_admin_count integer;
  v_privileged_request_id uuid;
begin
  if p_admin_auth_user_id is null then
    raise exception 'admin auth user id is required';
  end if;

  if p_target_auth_user_id is null then
    raise exception 'target auth user id is required';
  end if;

  if p_status not in ('active', 'suspended', 'revoked') then
    raise exception 'invalid admin user status: %', p_status;
  end if;

  v_permission := admin_has_permission(
    p_admin_auth_user_id,
    'admin.write'
  );

  if v_permission is not true then
    perform record_admin_action(
      p_admin_auth_user_id,
      'admin_upsert_admin_user',
      'admin.write',
      'admin_user',
      null,
      p_request_id,
      null,
      null,
      'denied',
      'missing admin.write permission',
      p_metadata
    );

    raise exception 'missing required permission: admin.write';
  end if;

  select *
  into v_target_admin
  from admin_users
  where user_id = p_target_auth_user_id
  order by created_at desc
  limit 1;

  v_target_is_super := is_active_super_admin(p_target_auth_user_id);

  if p_status in ('suspended', 'revoked')
    and v_target_is_super is true then
    v_super_admin_count := count_active_super_admins();

    if v_super_admin_count <= 1 then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_upsert_admin_user',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot suspend or revoke last active super_admin',
        p_metadata
      );

      raise exception 'cannot suspend or revoke last active super_admin';
    end if;

    if p_admin_auth_user_id = p_target_auth_user_id then
      perform record_admin_action(
        p_admin_auth_user_id,
        'admin_upsert_admin_user',
        'admin.write',
        'admin_user',
        v_target_admin.id,
        p_request_id,
        null,
        null,
        'denied',
        'cannot suspend or revoke own super_admin account',
        p_metadata
      );

      raise exception 'cannot suspend or revoke own super_admin account';
    end if;

    v_privileged_request_id := request_admin_privileged_action(
      p_admin_auth_user_id,
      case
        when p_status = 'suspended' then 'suspend_super_admin'
        else 'revoke_admin_user'
      end,
      p_target_auth_user_id,
      'super_admin',
      null,
      coalesce(p_reason, 'Privileged admin user status change requested'),
      jsonb_build_object(
        'target_auth_user_id',
        p_target_auth_user_id,
        'status',
        p_status,
        'email',
        p_email,
        'display_name',
        p_display_name
      ),
      p_request_id,
      p_metadata
    );

    return v_privileged_request_id;
  end if;

  v_admin_user_id := upsert_admin_user(
    p_target_auth_user_id,
    p_email,
    p_display_name,
    p_status,
    p_metadata || jsonb_build_object(
      'managed_by_admin_auth_user_id', p_admin_auth_user_id,
      'reason', p_reason,
      'request_id', p_request_id
    )
  );

  perform record_admin_action(
    p_admin_auth_user_id,
    'admin_upsert_admin_user',
    'admin.write',
    'admin_user',
    v_admin_user_id,
    p_request_id,
    null,
    null,
    'allowed',
    coalesce(p_reason, 'admin user upserted'),
    p_metadata || jsonb_build_object(
      'target_auth_user_id', p_target_auth_user_id,
      'status', p_status,
      'email', p_email
    )
  );

  return v_admin_user_id;
end;
$$;

create or replace view admin_privileged_action_request_detail as
select
  par.id as privileged_action_request_id,

  par.requested_by_auth_user_id,
  requester.email as requested_by_email,
  requester.display_name as requested_by_display_name,

  par.action_key,

  par.target_auth_user_id,
  target.email as target_email,
  target.display_name as target_display_name,

  par.target_role_key,
  par.target_permission_key,

  par.status,
  par.reason,
  par.requested_payload,

  par.approved_by_auth_user_id,
  approver.email as approved_by_email,
  par.approved_at,

  par.rejected_by_auth_user_id,
  rejecter.email as rejected_by_email,
  par.rejected_at,
  par.rejection_reason,

  par.executed_at,
  par.execution_result,

  par.expires_at,
  par.created_at,
  par.updated_at,
  par.metadata
from admin_privileged_action_requests par
left join admin_users requester
  on requester.id = par.requested_by_admin_user_id
left join admin_users target
  on target.id = par.target_admin_user_id
left join admin_users approver
  on approver.id = par.approved_by_admin_user_id
left join admin_users rejecter
  on rejecter.id = par.rejected_by_admin_user_id;

create or replace view admin_security_alert_dashboard as
select
  ase.id as admin_security_alert_event_id,

  ase.alert_key,
  ase.severity,
  ase.status,
  ase.message,

  ase.actor_auth_user_id,
  actor.email as actor_email,
  actor.display_name as actor_display_name,

  ase.target_auth_user_id,
  target.email as target_email,
  target.display_name as target_display_name,

  ase.action_key,
  ase.privileged_action_request_id,

  ase.acknowledged_by_auth_user_id,
  ase.acknowledged_at,

  ase.resolved_by_auth_user_id,
  ase.resolved_at,
  ase.resolution_note,

  ase.created_at,
  ase.updated_at,
  ase.metadata
from admin_security_alert_events ase
left join admin_users actor
  on actor.id = ase.actor_admin_user_id
left join admin_users target
  on target.id = ase.target_admin_user_id;

grant select on admin_privileged_action_request_detail to admin_api_role;
grant select on admin_security_alert_dashboard to admin_api_role;

alter table admin_privileged_action_requests enable row level security;
alter table admin_security_alert_events enable row level security;

drop policy if exists admin_privileged_action_requests_no_user_direct_access
on admin_privileged_action_requests;

create policy admin_privileged_action_requests_no_user_direct_access
on admin_privileged_action_requests
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_security_alert_events_no_user_direct_access
on admin_security_alert_events;

create policy admin_security_alert_events_no_user_direct_access
on admin_security_alert_events
for all
to authenticated
using (false)
with check (false);

drop policy if exists admin_api_all_admin_privileged_action_requests
on admin_privileged_action_requests;

create policy admin_api_all_admin_privileged_action_requests
on admin_privileged_action_requests
for all
to admin_api_role
using (true)
with check (true);

drop policy if exists admin_api_all_admin_security_alert_events
on admin_security_alert_events;

create policy admin_api_all_admin_security_alert_events
on admin_security_alert_events
for all
to admin_api_role
using (true)
with check (true);

grant execute on function count_active_super_admins()
to admin_api_role;

grant execute on function is_active_super_admin(uuid)
to admin_api_role;

grant execute on function create_admin_security_alert(
  text,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  jsonb
) to admin_api_role;

grant execute on function request_admin_privileged_action(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_assign_admin_role(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_revoke_admin_role(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

grant execute on function admin_upsert_admin_user(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to admin_api_role;

alter function count_active_super_admins() security definer;
alter function count_active_super_admins() set search_path = public;

alter function is_active_super_admin(uuid) security definer;
alter function is_active_super_admin(uuid) set search_path = public;

alter function create_admin_security_alert(
  text,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  jsonb
) security definer;

alter function create_admin_security_alert(
  text,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  jsonb
) set search_path = public;

alter function request_admin_privileged_action(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  jsonb
) security definer;

alter function request_admin_privileged_action(
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  jsonb
) set search_path = public;

alter function admin_assign_admin_role(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function admin_assign_admin_role(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function admin_revoke_admin_role(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) security definer;

alter function admin_revoke_admin_role(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) set search_path = public;

alter function admin_upsert_admin_user(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) security definer;

alter function admin_upsert_admin_user(
  uuid,
  uuid,
  text,
  text,
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
    'ADMIN_LAST_SUPER_ADMIN_PROTECTED',
    'permission',
    'critical',
    409,
    false,
    true,
    'Cannot remove the last super admin.',
    'Last active super_admin protection triggered.',
    'platform'
  ),
  (
    'ADMIN_SELF_DEMOTION_BLOCKED',
    'permission',
    'high',
    409,
    false,
    true,
    'You cannot remove your own super admin access.',
    'Self-demotion protection triggered.',
    'platform'
  ),
  (
    'ADMIN_PRIVILEGED_ACTION_REQUIRES_APPROVAL',
    'permission',
    'high',
    202,
    false,
    true,
    'This privileged admin action requires approval.',
    'Privileged admin action request created instead of immediate execution.',
    'platform'
  ),
  (
    'ADMIN_SUPER_ADMIN_REQUIRED',
    'permission',
    'high',
    403,
    false,
    true,
    'Only a super admin can perform this action.',
    'Super admin required.',
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
  ('cannot revoke last active super_admin', 'ADMIN_LAST_SUPER_ADMIN_PROTECTED', 5, '{}'),
  ('cannot suspend or revoke last active super_admin', 'ADMIN_LAST_SUPER_ADMIN_PROTECTED', 5, '{}'),
  ('cannot self-revoke super_admin role', 'ADMIN_SELF_DEMOTION_BLOCKED', 5, '{}'),
  ('cannot suspend or revoke own super_admin account', 'ADMIN_SELF_DEMOTION_BLOCKED', 5, '{}'),
  ('only super_admin can request privileged admin action', 'ADMIN_SUPER_ADMIN_REQUIRED', 5, '{}')
on conflict do nothing;
