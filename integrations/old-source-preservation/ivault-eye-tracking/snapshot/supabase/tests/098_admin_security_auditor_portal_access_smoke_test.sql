do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_auditor_id uuid;
  v_framework_id uuid;
  v_challenge_id uuid;
  v_count integer;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-portal-admin@example.com',
    'Auditor Portal Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'auditor portal admin bootstrap');

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
    'Auditor Portal Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'auditor-portal-create-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'auditor-portal-create-mfa',
    '{"test": true}'::jsonb
  );

  v_auditor_id := create_admin_security_auditor(
    v_admin_auth_user_id,
    v_auditor_auth_user_id,
    'external',
    'Portal Audit Firm',
    'Portal Auditor',
    'portal-auditor@example.com',
    'Portal smoke review.',
    now(),
    now() + interval '30 days',
    'auditor-portal-create',
    '{"test": true}'::jsonb
  );

  select id
  into v_framework_id
  from admin_security_control_frameworks
  where framework_key = 'soc2';

  perform grant_admin_security_auditor_access(
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
    false,
    'auditor-portal-grant',
    '{"test": true}'::jsonb
  );

  select count(*)
  into v_count
  from list_auditor_control_coverage(
    v_auditor_auth_user_id,
    'soc2',
    100,
    'auditor-portal-list'
  );

  if v_count = 0 then
    raise exception 'auditor should see granted SOC2 coverage';
  end if;
end $$;
