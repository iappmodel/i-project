do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_device_id uuid;
  v_network_id uuid;
  v_session_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'admin-risk-challenge@example.com',
    'Admin Risk Challenge',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'admin risk challenge smoke bootstrap'
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
    'Smoke Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'risk-challenge-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'risk-challenge-mfa',
    '{"test": true}'::jsonb
  );

  v_device_id := register_admin_device_observation(
    v_admin_auth_user_id,
    repeat('d', 64),
    'web',
    'Chrome',
    null,
    'macOS',
    null,
    'risk-challenge-request',
    '{"test": true}'::jsonb
  );

  v_network_id := record_admin_network_observation(
    v_admin_auth_user_id,
    v_device_id,
    repeat('e', 64),
    null,
    null,
    null,
    null,
    null,
    true,
    false,
    false,
    true,
    'risk-challenge-request',
    '{"test": true}'::jsonb
  );

  v_session_id := create_admin_session_context(
    v_admin_auth_user_id,
    v_device_id,
    v_network_id,
    'risk-challenge-request',
    null,
    repeat('f', 64),
    repeat('e', 64),
    repeat('d', 64),
    '{"test": true}'::jsonb
  );

  perform require_admin_action_risk_allowed(
    v_admin_auth_user_id,
    'admin_assign_admin_role',
    'admin.write',
    v_session_id,
    'admin_user',
    null,
    'risk-challenge-request',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_action_risk_evaluations
    where admin_auth_user_id = v_admin_auth_user_id
      and decision = 'challenge'
      and reason_code = 'admin_action_risk_challenge'
  ) then
    raise exception 'risk challenge evaluation missing';
  end if;
end $$;
