do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_device_one_id uuid;
  v_device_two_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'block-admin-device@example.com',
    'Block Admin Device',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'block admin device smoke bootstrap'
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
    'block-admin-device-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'block-admin-device-mfa',
    '{"test": true}'::jsonb
  );

  v_device_one_id := register_admin_device_observation(
    v_admin_auth_user_id,
    repeat('c', 64),
    'web',
    'Chrome',
    null,
    'macOS',
    null,
    'block-admin-device-request',
    '{"test": true}'::jsonb
  );

  v_device_two_id := register_admin_device_observation(
    v_admin_auth_user_id,
    repeat('d', 64),
    'web',
    'Chrome',
    null,
    'macOS',
    null,
    'block-admin-device-request',
    '{"test": true}'::jsonb
  );

  update admin_devices
  set status = 'trusted', trust_score = 1.0000, risk_score = 0.0500
  where id in (v_device_one_id, v_device_two_id);

  perform admin_block_admin_device(
    v_admin_auth_user_id,
    v_device_one_id,
    'block compromised device',
    'block-admin-device-request',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_devices
    where id = v_device_one_id
      and status = 'blocked'
      and risk_score = 1.0000
  ) then
    raise exception 'admin device was not blocked';
  end if;

  if not exists (
    select 1
    from admin_devices
    where id = v_device_two_id
      and status = 'trusted'
  ) then
    raise exception 'second trusted device should remain trusted';
  end if;
end $$;
