do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_rejecter_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();

  v_privileged_request_id uuid;
begin
  perform upsert_admin_user(
    v_requester_auth_user_id,
    'requester-reject@example.com',
    'Requester Reject',
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
    v_rejecter_auth_user_id,
    'rejecter-super@example.com',
    'Rejecter Super',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_rejecter_auth_user_id,
    'super_admin',
    null,
    'smoke bootstrap rejecter'
  );

  perform upsert_admin_user(
    v_target_auth_user_id,
    'target-rejected-super@example.com',
    'Target Rejected Super',
    'active',
    '{"test": true}'::jsonb
  );

  v_privileged_request_id := admin_assign_admin_role(
    v_requester_auth_user_id,
    v_target_auth_user_id,
    'super_admin',
    'request target super admin rejected',
    'smoke-request-super-admin-rejected',
    '{"test": true}'::jsonb
  );

  perform reject_admin_privileged_action(
    v_rejecter_auth_user_id,
    v_privileged_request_id,
    'not enough justification',
    'smoke-reject-privileged-action',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_privileged_action_requests
    where id = v_privileged_request_id
      and status = 'rejected'
      and rejection_reason = 'not enough justification'
  ) then
    raise exception 'privileged request was not rejected';
  end if;

  if exists (
    select 1
    from admin_user_permission_detail
    where auth_user_id = v_target_auth_user_id
      and role_key = 'super_admin'
  ) then
    raise exception 'target should not receive super_admin after rejection';
  end if;
end $$;
