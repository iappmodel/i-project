do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();
  v_requester_admin_user_id uuid;
  v_target_admin_user_id uuid;
  v_challenge_id uuid;
  v_break_glass_id uuid;
begin
  v_requester_admin_user_id := upsert_admin_user(
    v_requester_auth_user_id,
    'break-glass-self-approver@example.com',
    'Break Glass Self Approver',
    'active',
    '{"test": true}'::jsonb
  );

  v_target_admin_user_id := upsert_admin_user(
    v_target_auth_user_id,
    'break-glass-self-target@example.com',
    'Break Glass Self Target',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_requester_auth_user_id,
    'super_admin',
    null,
    'break-glass self approver bootstrap'
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
    v_requester_auth_user_id,
    v_requester_admin_user_id,
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
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'break-glass-self-approval-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'break-glass-self-approval-mfa',
    '{"test": true}'::jsonb
  );

  v_break_glass_id := request_admin_break_glass_access(
    v_requester_auth_user_id,
    v_target_auth_user_id,
    'emergency recovery self approval test',
    repeat('b', 64),
    'break-glass-self-request',
    '{"test": true}'::jsonb
  );

  begin
    perform approve_admin_break_glass_request(
      v_requester_auth_user_id,
      v_break_glass_id,
      'self approval should fail',
      'break-glass-self-approve',
      '{"test": true}'::jsonb
    );

    raise exception 'self approval should have failed';
  exception
    when others then
      if sqlerrm not like '%requires approval by a second admin%' then
        raise;
      end if;
  end;
end $$;
