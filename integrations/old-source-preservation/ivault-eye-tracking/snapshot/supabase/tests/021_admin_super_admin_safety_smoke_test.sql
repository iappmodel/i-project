do $$
declare
  v_actor_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();

  v_request_id uuid;
begin
  perform upsert_admin_user(
    v_actor_auth_user_id,
    'only-super@example.com',
    'Only Super',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_actor_auth_user_id,
    'super_admin',
    null,
    'smoke bootstrap'
  );

  begin
    perform admin_revoke_admin_role(
      v_actor_auth_user_id,
      v_actor_auth_user_id,
      'super_admin',
      'try to self revoke last super',
      'smoke-request-self-revoke',
      '{"test": true}'::jsonb
    );

    raise exception 'self revoke last super_admin should have failed';
  exception
    when others then
      if sqlerrm not like '%cannot revoke last active super_admin%'
         and sqlerrm not like '%cannot self-revoke super_admin role%' then
        raise;
      end if;
  end;

  perform upsert_admin_user(
    v_target_auth_user_id,
    'target-super@example.com',
    'Target Super',
    'active',
    '{"test": true}'::jsonb
  );

  v_request_id := admin_assign_admin_role(
    v_actor_auth_user_id,
    v_target_auth_user_id,
    'super_admin',
    'request super admin assignment',
    'smoke-request-assign-super',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_privileged_action_requests
    where id = v_request_id
      and action_key = 'assign_super_admin'
      and status = 'pending'
  ) then
    raise exception 'assign super_admin did not create privileged action request';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where privileged_action_request_id = v_request_id
      and severity = 'critical'
      and status = 'open'
  ) then
    raise exception 'critical admin security alert missing';
  end if;
end $$;
