do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_auditor_id uuid;
  v_framework_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-export-denied-admin@example.com',
    'Auditor Export Denied Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'auditor export denied bootstrap');

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
    'Auditor Export Denied Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'auditor-export-denied-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'auditor-export-denied-mfa',
    '{"test": true}'::jsonb
  );

  v_auditor_id := create_admin_security_auditor(
    v_admin_auth_user_id,
    v_auditor_auth_user_id,
    'external',
    'Denied Audit Firm',
    'Denied Auditor',
    'denied-auditor@example.com',
    'Export denied smoke review.',
    now(),
    now() + interval '30 days',
    'auditor-export-denied-create',
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
    'auditor-export-denied-grant',
    '{"test": true}'::jsonb
  );

  begin
    perform request_admin_security_auditor_export(
      v_auditor_auth_user_id,
      'framework_evidence_bundle',
      'soc2',
      null,
      null,
      null,
      'auditor-export-denied',
      '{"test": true}'::jsonb
    );

    raise exception 'auditor export should have been denied';
  exception
    when others then
      if sqlerrm not like '%auditor export not allowed by access grant%' then
        raise;
      end if;
  end;

  if not exists (
    select 1
    from admin_security_auditor_access_events
    where auditor_auth_user_id = v_auditor_auth_user_id
      and event_key = 'auditor_export_denied'
      and allowed is false
  ) then
    raise exception 'auditor export denied event missing';
  end if;
end $$;
