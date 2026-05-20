do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_device_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'admin-device-trust@example.com',
    'Admin Device Trust',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'admin device trust smoke bootstrap'
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
    'admin_write',
    'admin-device-trust-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'admin-device-trust-mfa',
    '{"test": true}'::jsonb
  );

  v_device_id := register_admin_device_observation(
    v_admin_auth_user_id,
    repeat('a', 64),
    'web',
    'Chrome',
    null,
    'macOS',
    null,
    'admin-device-trust-request',
    '{"test": true}'::jsonb
  );

  perform admin_trust_admin_device(
    v_admin_auth_user_id,
    v_device_id,
    'trust smoke test device',
    'admin-device-trust-request',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_devices
    where id = v_device_id
      and status = 'trusted'
      and trust_score = 1.0000
      and risk_score = 0.0500
  ) then
    raise exception 'admin device was not trusted';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where alert_key = 'admin_device_status_changed'
      and metadata->>'admin_device_id' = v_device_id::text
      and metadata->>'new_status' = 'trusted'
  ) then
    raise exception 'admin device trust alert missing';
  end if;
end $$;
