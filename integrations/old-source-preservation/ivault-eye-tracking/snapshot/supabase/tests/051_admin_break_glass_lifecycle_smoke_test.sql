do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_approver_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();
  v_requester_admin_user_id uuid;
  v_approver_admin_user_id uuid;
  v_target_admin_user_id uuid;
  v_challenge_id uuid;
  v_break_glass_id uuid;
begin
  v_requester_admin_user_id := upsert_admin_user(
    v_requester_auth_user_id,
    'break-glass-requester@example.com',
    'Break Glass Requester',
    'active',
    '{"test": true}'::jsonb
  );

  v_approver_admin_user_id := upsert_admin_user(
    v_approver_auth_user_id,
    'break-glass-approver@example.com',
    'Break Glass Approver',
    'active',
    '{"test": true}'::jsonb
  );

  v_target_admin_user_id := upsert_admin_user(
    v_target_auth_user_id,
    'break-glass-target@example.com',
    'Break Glass Target',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_requester_auth_user_id,
    'super_admin',
    null,
    'break-glass requester bootstrap'
  );

  perform assign_admin_role(
    v_approver_auth_user_id,
    'super_admin',
    null,
    'break-glass approver bootstrap'
  );

  insert into admin_mfa_factors (
    admin_auth_user_id,
    admin_user_id,
    factor_type,
    provider,
    status,
    label,
    secret_ciphertext,
    secret_key_version,
    confirmed_at,
    metadata
  )
  values (
    v_approver_auth_user_id,
    v_approver_admin_user_id,
    'totp',
    'totp',
    'active',
    'Smoke Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_approver_auth_user_id,
    'stub',
    'privileged_action',
    'break-glass-approval-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_approver_auth_user_id,
    v_challenge_id,
    '000000',
    'break-glass-approval-mfa',
    '{"test": true}'::jsonb
  );

  v_break_glass_id := request_admin_break_glass_access(
    v_requester_auth_user_id,
    v_target_auth_user_id,
    'emergency recovery test',
    repeat('a', 64),
    'break-glass-request',
    '{"test": true}'::jsonb
  );

  perform approve_admin_break_glass_request(
    v_approver_auth_user_id,
    v_break_glass_id,
    'approved by smoke test',
    'break-glass-approve',
    '{"test": true}'::jsonb
  );

  perform execute_admin_break_glass_request(
    v_target_auth_user_id,
    v_break_glass_id,
    repeat('a', 64),
    'break-glass-execute',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_break_glass_requests
    where id = v_break_glass_id
      and status = 'executed'
      and granted_role_assignment_id is not null
  ) then
    raise exception 'break-glass request was not executed';
  end if;

  update admin_break_glass_requests
  set expires_at = now() - interval '1 minute'
  where id = v_break_glass_id;

  perform expire_admin_break_glass_requests(
    500,
    '{"test": true, "scope": "break_glass_expiry"}'::jsonb
  );

  if not exists (
    select 1
    from admin_break_glass_requests
    where id = v_break_glass_id
      and status = 'revoked'
      and revoked_at is not null
  ) then
    raise exception 'break-glass request was not revoked after expiry';
  end if;
end $$;
