do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_auditor_id uuid;
  v_export_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-expired-download-admin@example.com',
    'Auditor Expired Download Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'auditor expired download bootstrap'
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
    'Auditor Expired Download Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'auditor-expired-download-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'auditor-expired-download-mfa',
    '{"test": true}'::jsonb
  );

  v_auditor_id := create_admin_security_auditor(
    v_admin_auth_user_id,
    v_auditor_auth_user_id,
    'external',
    'Expired Download Audit Firm',
    'Expired Download Auditor',
    'expired-download-auditor@example.com',
    'Expired download smoke.',
    now(),
    now() + interval '30 days',
    'auditor-expired-download-create',
    '{"test": true}'::jsonb
  );

  insert into admin_security_auditor_export_requests (
    export_key,
    auditor_id,
    status,
    export_type,
    requested_by_auth_user_id,
    generated_at,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    watermark,
    expires_at,
    metadata
  )
  values (
    'auditor-expired-download-smoke',
    v_auditor_id,
    'ready',
    'audit_summary_bundle',
    v_auditor_auth_user_id,
    now() - interval '15 days',
    'file:///tmp/auditor-expired-download-smoke.json',
    repeat('c', 64),
    999,
    'AUDITOR=expired-download-auditor@example.com',
    now() - interval '1 day',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  begin
    perform register_admin_security_auditor_export_download(
      v_auditor_auth_user_id,
      v_export_id,
      'auditor-expired-download-register',
      '{"test": true}'::jsonb
    );

    raise exception 'expired auditor export download should have failed';
  exception
    when others then
      if sqlerrm not like '%auditor export has expired%' then
        raise;
      end if;
  end;
end $$;
