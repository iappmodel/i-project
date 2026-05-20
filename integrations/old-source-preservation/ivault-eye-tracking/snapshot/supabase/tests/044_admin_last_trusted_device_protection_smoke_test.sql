do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_device_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'last-trusted-device@example.com',
    'Last Trusted Device',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'last trusted device smoke bootstrap'
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
    'last-trusted-device-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'last-trusted-device-mfa',
    '{"test": true}'::jsonb
  );

  v_device_id := register_admin_device_observation(
    v_admin_auth_user_id,
    repeat('b', 64),
    'web',
    'Chrome',
    null,
    'macOS',
    null,
    'last-trusted-device-request',
    '{"test": true}'::jsonb
  );

  update admin_devices
  set status = 'trusted', trust_score = 1.0000, risk_score = 0.0500
  where id = v_device_id;

  begin
    perform admin_block_admin_device(
      v_admin_auth_user_id,
      v_device_id,
      'try blocking last trusted device',
      'last-trusted-device-request',
      '{"test": true}'::jsonb
    );

    raise exception 'blocking last trusted admin device should fail';
  exception
    when others then
      if sqlerrm not like '%cannot block or revoke last trusted admin device%' then
        raise;
      end if;
  end;

  begin
    perform admin_revoke_admin_device(
      v_admin_auth_user_id,
      v_device_id,
      'try revoking last trusted device',
      'last-trusted-device-request',
      '{"test": true}'::jsonb
    );

    raise exception 'revoking last trusted admin device should fail';
  exception
    when others then
      if sqlerrm not like '%cannot block or revoke last trusted admin device%' then
        raise;
      end if;
  end;
end $$;
