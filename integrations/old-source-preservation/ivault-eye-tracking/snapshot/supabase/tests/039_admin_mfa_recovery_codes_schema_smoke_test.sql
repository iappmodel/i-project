do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'recovery-code-admin@example.com',
    'Recovery Code Admin',
    'active',
    '{"test": true}'::jsonb
  );

  insert into admin_mfa_recovery_codes (
    admin_auth_user_id,
    admin_user_id,
    code_hash,
    hash_version,
    status,
    metadata
  )
  values (
    v_admin_auth_user_id,
    v_admin_user_id,
    repeat('a', 64),
    'sha256_v1',
    'active',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_mfa_recovery_code_dashboard
    where admin_auth_user_id = v_admin_auth_user_id
      and active_recovery_code_count = 1
  ) then
    raise exception 'recovery code dashboard did not count active code';
  end if;

  if admin_has_active_mfa_factor(v_admin_auth_user_id) is not true then
    raise exception 'active recovery code should count as active MFA factor';
  end if;
end $$;
