do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_auditor_id uuid;
  v_framework_id uuid;
  v_grant_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-admin@example.com',
    'Auditor Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'auditor admin bootstrap'
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
    'Auditor Admin Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'auditor-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'auditor-create-mfa',
    '{"test": true}'::jsonb
  );

  v_auditor_id := create_admin_security_auditor(
    v_admin_auth_user_id,
    v_auditor_auth_user_id,
    'external',
    'Example Audit Firm',
    'Example Auditor',
    'auditor@example.com',
    'SOC2 readiness review.',
    now(),
    now() + interval '30 days',
    'auditor-create',
    '{"test": true}'::jsonb
  );

  select id
  into v_framework_id
  from admin_security_control_frameworks
  where framework_key = 'soc2';

  v_grant_id := grant_admin_security_auditor_access(
    v_admin_auth_user_id,
    v_auditor_id,
    'framework',
    v_framework_id,
    null,
    null,
    null,
    null,
    null,
    null,
    true,
    'auditor-grant',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_auditors
    where id = v_auditor_id
      and status = 'active'
  ) then
    raise exception 'auditor was not created active';
  end if;

  if not exists (
    select 1
    from admin_security_auditor_access_grants
    where id = v_grant_id
      and status = 'active'
      and allow_export is true
  ) then
    raise exception 'auditor grant missing';
  end if;
end $$;
