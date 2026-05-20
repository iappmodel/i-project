do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_factor_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'last-mfa-factor-admin@example.com',
    'Last MFA Factor Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'last MFA factor smoke bootstrap'
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
  )
  returning id into v_factor_id;

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'admin_write',
    'last-factor-challenge',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'last-factor-verify',
    '{"test": true}'::jsonb
  );

  begin
    perform disable_admin_mfa_factor(
      v_admin_auth_user_id,
      v_factor_id,
      'try disable last factor',
      'last-factor-disable',
      '{"test": true}'::jsonb
    );

    raise exception 'disabling last active super_admin factor should fail';
  exception
    when others then
      if sqlerrm not like '%cannot disable last active MFA factor for super_admin%' then
        raise;
      end if;
  end;

  begin
    perform revoke_admin_mfa_factor(
      v_admin_auth_user_id,
      v_factor_id,
      'try revoke last factor',
      'last-factor-revoke',
      '{"test": true}'::jsonb
    );

    raise exception 'revoking last active super_admin factor should fail';
  exception
    when others then
      if sqlerrm not like '%cannot revoke last active MFA factor for super_admin%' then
        raise;
      end if;
  end;
end $$;
