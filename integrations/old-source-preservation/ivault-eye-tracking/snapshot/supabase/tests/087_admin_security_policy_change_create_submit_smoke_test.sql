do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_change_request_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'policy-change-create@example.com',
    'Policy Change Create',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'policy change create bootstrap'
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
    'Policy Change Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'policy-change-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'policy-change-create-mfa',
    '{"test": true}'::jsonb
  );

  v_change_request_id := create_admin_security_policy_change_request(
    v_admin_auth_user_id,
    'create_policy',
    'policy_change_create_smoke',
    'Create smoke policy',
    'Testing policy change creation.',
    null,
    'smoke_policy_change_policy',
    'Smoke Policy Change Policy',
    'general',
    'high',
    'platform',
    'A smoke-test governance policy.',
    'high',
    'policy-change-create',
    '{"test": true}'::jsonb
  );

  perform submit_admin_security_policy_change_request(
    v_admin_auth_user_id,
    v_change_request_id,
    'ready for review',
    'policy-change-submit',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_policy_change_requests
    where id = v_change_request_id
      and status = 'submitted'
      and draft_policy_id is not null
  ) then
    raise exception 'policy change request was not submitted';
  end if;
end $$;
