do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_change_request_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'policy-change-self@example.com',
    'Policy Change Self',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'policy change self bootstrap'
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
    v_admin_auth_user_id,
    v_admin_user_id,
    'totp',
    'totp',
    'active',
    'Policy Self Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'policy-change-self-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-change-self-create-mfa',
    '{"test": true}'::jsonb
  );

  v_change_request_id := create_admin_security_policy_change_request(
    v_admin_auth_user_id,
    'create_policy',
    'policy_change_self_smoke',
    'Self approval smoke policy',
    'Testing self approval blocking.',
    null,
    'self_approval_smoke_policy',
    'Self Approval Smoke Policy',
    'general',
    'high',
    'platform',
    'Self approval should fail.',
    'high',
    'policy-change-self-create',
    '{"test": true}'::jsonb
  );

  perform submit_admin_security_policy_change_request(
    v_admin_auth_user_id,
    v_change_request_id,
    'submit self approval test',
    'policy-change-self-submit',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'policy-change-self-approve-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-change-self-approve-mfa',
    '{"test": true}'::jsonb
  );

  begin
    perform approve_admin_security_policy_change_request(
      v_admin_auth_user_id,
      v_change_request_id,
      'self approval should fail',
      'policy-change-self-approve',
      '{"test": true}'::jsonb
    );

    raise exception 'policy change self approval should have failed';
  exception
    when others then
      if sqlerrm not like '%policy change request requires approval by a second admin%' then
        raise;
      end if;
  end;
end $$;
