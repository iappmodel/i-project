-- Step 9.9 — Admin role management endpoints with audited writes.
-- Runs after 126_admin_audited_actions.sql.

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
  for update;

  if v_assignment.id is null then
    raise exception 'admin role assignment not found';
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

create or replace view admin_role_catalog as
select
  ar.id as admin_role_id,
  ar.role_key,
  ar.role_name,
  ar.description,
  ar.status,
  ar.created_at,
  ar.updated_at,

  (
    select jsonb_agg(
      jsonb_build_object(
        'permissionKey', ap.permission_key,
        'permissionName', ap.permission_name,
        'permissionGroup', ap.permission_group
      )
      order by ap.permission_group, ap.permission_key
    )
    from admin_role_permissions arp
    join admin_permissions ap
      on ap.id = arp.admin_permission_id
    where arp.admin_role_id = ar.id
      and arp.status = 'active'
      and ap.status = 'active'
  ) as permissions

from admin_roles ar
order by ar.role_key;

create or replace view admin_user_management_detail as
select
  au.id as admin_user_id,
  au.user_id as auth_user_id,
  au.email,
  au.display_name,
  au.status,
  au.last_seen_at,
  au.created_at,
  au.updated_at,

  (
    select jsonb_agg(
      jsonb_build_object(
        'roleAssignmentId', aur.id,
        'roleKey', ar.role_key,
        'roleName', ar.role_name,
        'status', aur.status,
        'assignedBy', aur.assigned_by,
        'assignedReason', aur.assigned_reason,
        'createdAt', aur.created_at,
        'updatedAt', aur.updated_at
      )
      order by ar.role_key
    )
    from admin_user_roles aur
    join admin_roles ar
      on ar.id = aur.admin_role_id
    where aur.admin_user_id = au.id
  ) as roles,

  (
    select jsonb_agg(
      distinct jsonb_build_object(
        'permissionKey', ap.permission_key,
        'permissionName', ap.permission_name,
        'permissionGroup', ap.permission_group
      )
    )
    from admin_user_roles aur
    join admin_roles ar
      on ar.id = aur.admin_role_id
     and ar.status = 'active'
    join admin_role_permissions arp
      on arp.admin_role_id = ar.id
     and arp.status = 'active'
    join admin_permissions ap
      on ap.id = arp.admin_permission_id
     and ap.status = 'active'
    where aur.admin_user_id = au.id
      and aur.status = 'active'
  ) as active_permissions

from admin_users au
order by au.created_at desc;

grant select on admin_role_catalog to admin_api_role;
grant select on admin_user_management_detail to admin_api_role;

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
    'ADMIN_ROLE_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid admin role.',
    'Admin role invalid or not found.',
    'platform'
  ),
  (
    'ADMIN_ROLE_ASSIGNMENT_NOT_FOUND',
    'validation',
    'medium',
    404,
    false,
    true,
    'Admin role assignment not found.',
    'Admin role assignment not found.',
    'platform'
  ),
  (
    'ADMIN_TARGET_USER_INVALID',
    'validation',
    'medium',
    400,
    false,
    true,
    'Invalid target admin user.',
    'Target admin user invalid.',
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
  ('admin role not found', 'ADMIN_ROLE_INVALID', 5, '{}'),
  ('role key is required', 'ADMIN_ROLE_INVALID', 5, '{}'),
  ('admin role assignment not found', 'ADMIN_ROLE_ASSIGNMENT_NOT_FOUND', 5, '{}'),
  ('target auth user id is required', 'ADMIN_TARGET_USER_INVALID', 5, '{}'),
  ('target admin user not found', 'ADMIN_TARGET_USER_INVALID', 5, '{}'),
  ('invalid admin user status', 'ADMIN_TARGET_USER_INVALID', 5, '{}')
on conflict do nothing;
