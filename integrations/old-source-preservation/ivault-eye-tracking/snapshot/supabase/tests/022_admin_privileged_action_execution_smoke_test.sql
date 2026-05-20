do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_approver_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();

  v_privileged_request_id uuid;
begin
  perform upsert_admin_user(
    v_requester_auth_user_id,
    'requester-super@example.com',
    'Requester Super',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_requester_auth_user_id,
    'super_admin',
    null,
    'smoke bootstrap requester'
  );

  perform upsert_admin_user(
    v_approver_auth_user_id,
    'approver-super@example.com',
    'Approver Super',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_approver_auth_user_id,
    'super_admin',
    null,
    'smoke bootstrap approver'
  );

  perform upsert_admin_user(
    v_target_auth_user_id,
    'target-new-super@example.com',
    'Target New Super',
    'active',
    '{"test": true}'::jsonb
  );

  v_privileged_request_id := admin_assign_admin_role(
    v_requester_auth_user_id,
    v_target_auth_user_id,
    'super_admin',
    'request target super admin',
    'smoke-request-super-admin',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_privileged_action_requests
    where id = v_privileged_request_id
      and status = 'pending'
      and action_key = 'assign_super_admin'
  ) then
    raise exception 'super_admin assignment did not create pending privileged request';
  end if;

  begin
    perform approve_admin_privileged_action(
      v_requester_auth_user_id,
      v_privileged_request_id,
      'trying to approve own request',
      'smoke-self-approval',
      '{"test": true}'::jsonb
    );

    raise exception 'self approval should have failed';
  exception
    when others then
      if sqlerrm not like '%requester cannot approve own privileged action%' then
        raise;
      end if;
  end;

  perform approve_admin_privileged_action(
    v_approver_auth_user_id,
    v_privileged_request_id,
    'approved by second super admin',
    'smoke-second-approval',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_privileged_action_requests
    where id = v_privileged_request_id
      and status = 'executed'
      and executed_at is not null
  ) then
    raise exception 'privileged request was not executed';
  end if;

  if not exists (
    select 1
    from admin_user_permission_detail
    where auth_user_id = v_target_auth_user_id
      and role_key = 'super_admin'
  ) then
    raise exception 'target did not receive super_admin role after approval';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where privileged_action_request_id = v_privileged_request_id
      and alert_key = 'privileged_admin_action_executed'
  ) then
    raise exception 'executed security alert missing';
  end if;
end $$;
