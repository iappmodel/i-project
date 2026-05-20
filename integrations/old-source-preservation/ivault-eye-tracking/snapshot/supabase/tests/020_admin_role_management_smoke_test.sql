do $$
declare
  v_actor_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();

  v_actor_admin_user_id uuid;
  v_target_admin_user_id uuid;
  v_assignment_id uuid;
begin
  v_actor_admin_user_id := upsert_admin_user(
    v_actor_auth_user_id,
    'actor-admin@example.com',
    'Actor Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_actor_auth_user_id,
    'super_admin',
    null,
    'smoke bootstrap'
  );

  v_target_admin_user_id := admin_upsert_admin_user(
    v_actor_auth_user_id,
    v_target_auth_user_id,
    'target-admin@example.com',
    'Target Admin',
    'active',
    'smoke create target admin',
    'smoke-request-admin-upsert',
    '{"test": true}'::jsonb
  );

  v_assignment_id := admin_assign_admin_role(
    v_actor_auth_user_id,
    v_target_auth_user_id,
    'risk_analyst',
    'smoke assign role',
    'smoke-request-role-assign',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_user_permission_detail
    where auth_user_id = v_target_auth_user_id
      and role_key = 'risk_analyst'
      and permission_key = 'risk.read'
  ) then
    raise exception 'risk analyst permission was not assigned';
  end if;

  perform admin_revoke_admin_role(
    v_actor_auth_user_id,
    v_target_auth_user_id,
    'risk_analyst',
    'smoke revoke role',
    'smoke-request-role-revoke',
    '{"test": true}'::jsonb
  );

  if exists (
    select 1
    from admin_user_permission_detail
    where auth_user_id = v_target_auth_user_id
      and role_key = 'risk_analyst'
  ) then
    raise exception 'risk analyst role was not revoked';
  end if;

  if not exists (
    select 1
    from admin_action_audit_log
    where admin_auth_user_id = v_actor_auth_user_id
      and action_key in (
        'admin_upsert_admin_user',
        'admin_assign_admin_role',
        'admin_revoke_admin_role'
      )
      and decision = 'allowed'
  ) then
    raise exception 'admin role management audit logs missing';
  end if;
end $$;
