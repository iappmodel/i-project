do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_device_id uuid;
  v_network_id uuid;
  v_session_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'admin-risk-block@example.com',
    'Admin Risk Block',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'admin risk block smoke bootstrap'
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

  v_device_id := register_admin_device_observation(
    v_admin_auth_user_id,
    repeat('a', 64),
    'web',
    'Chrome',
    null,
    'macOS',
    null,
    'risk-block-request',
    '{"test": true}'::jsonb
  );

  update admin_devices
  set status = 'blocked', risk_score = 1.0000
  where id = v_device_id;

  v_network_id := record_admin_network_observation(
    v_admin_auth_user_id,
    v_device_id,
    repeat('b', 64),
    null,
    null,
    null,
    null,
    null,
    false,
    false,
    false,
    false,
    'risk-block-request',
    '{"test": true}'::jsonb
  );

  v_session_id := create_admin_session_context(
    v_admin_auth_user_id,
    v_device_id,
    v_network_id,
    'risk-block-request',
    null,
    repeat('c', 64),
    repeat('b', 64),
    repeat('a', 64),
    '{"test": true}'::jsonb
  );

  begin
    perform require_admin_action_risk_allowed(
      v_admin_auth_user_id,
      'admin_assign_admin_role',
      'admin.write',
      v_session_id,
      'admin_user',
      null,
      'risk-block-request',
      '{"test": true}'::jsonb
    );

    raise exception 'blocked device should have blocked action';
  exception
    when others then
      if sqlerrm not like '%admin action blocked by risk engine%' then
        raise;
      end if;
  end;
end $$;
