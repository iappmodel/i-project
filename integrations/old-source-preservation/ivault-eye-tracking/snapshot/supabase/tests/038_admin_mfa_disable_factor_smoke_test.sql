do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_factor_one_id uuid;
  v_factor_two_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'disable-mfa-factor-admin@example.com',
    'Disable MFA Factor Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'disable MFA factor smoke bootstrap'
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
    'Smoke Factor One',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  )
  returning id into v_factor_one_id;

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
    'Smoke Factor Two',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  )
  returning id into v_factor_two_id;

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'admin_write',
    'disable-factor-challenge',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'disable-factor-verify',
    '{"test": true}'::jsonb
  );

  perform disable_admin_mfa_factor(
    v_admin_auth_user_id,
    v_factor_one_id,
    'disable old device',
    'disable-factor-test',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_mfa_factors
    where id = v_factor_one_id
      and status = 'disabled'
      and disabled_at is not null
  ) then
    raise exception 'MFA factor was not disabled';
  end if;

  if not exists (
    select 1
    from admin_mfa_factors
    where id = v_factor_two_id
      and status = 'active'
  ) then
    raise exception 'second factor should remain active';
  end if;
end $$;
