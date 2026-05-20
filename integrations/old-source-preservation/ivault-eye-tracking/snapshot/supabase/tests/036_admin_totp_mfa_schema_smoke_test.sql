do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_factor_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'totp-schema-admin@example.com',
    'TOTP Schema Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'totp schema smoke bootstrap'
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
    metadata
  )
  values (
    v_admin_auth_user_id,
    v_admin_user_id,
    'totp',
    'totp',
    'pending',
    'Smoke TOTP',
    'v1.fake.fake.fake',
    'v1',
    '{"test": true}'::jsonb
  )
  returning id into v_factor_id;

  if not exists (
    select 1
    from admin_mfa_factor_dashboard
    where admin_mfa_factor_id = v_factor_id
      and factor_type = 'totp'
      and status = 'pending'
  ) then
    raise exception 'TOTP factor dashboard missing factor';
  end if;
end $$;
