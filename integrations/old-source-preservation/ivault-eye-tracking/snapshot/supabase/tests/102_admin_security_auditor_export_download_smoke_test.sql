do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_auditor_auth_user_id uuid := gen_random_uuid();
  v_auditor_id uuid;
  v_export_id uuid;
  v_challenge_id uuid;
  v_download record;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'auditor-download-admin@example.com',
    'Auditor Download Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'auditor download bootstrap'
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
    'Auditor Download Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'auditor-download-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'auditor-download-mfa',
    '{"test": true}'::jsonb
  );

  v_auditor_id := create_admin_security_auditor(
    v_admin_auth_user_id,
    v_auditor_auth_user_id,
    'external',
    'Download Audit Firm',
    'Download Auditor',
    'download-auditor@example.com',
    'Download smoke.',
    now(),
    now() + interval '30 days',
    'auditor-download-create',
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
    'auditor-download-smoke',
    v_auditor_id,
    'ready',
    'audit_summary_bundle',
    v_auditor_auth_user_id,
    now(),
    'file:///tmp/auditor-download-smoke.json',
    repeat('b', 64),
    999,
    'AUDITOR=download-auditor@example.com',
    now() + interval '14 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  select *
  into v_download
  from register_admin_security_auditor_export_download(
    v_auditor_auth_user_id,
    v_export_id,
    'auditor-download-register',
    '{"test": true}'::jsonb
  );

  if v_download.export_request_id is null then
    raise exception 'download registration did not return export';
  end if;

  if not exists (
    select 1
    from admin_security_auditor_export_requests
    where id = v_export_id
      and download_count = 1
      and last_downloaded_at is not null
  ) then
    raise exception 'download count was not updated';
  end if;

  if not exists (
    select 1
    from admin_security_auditor_access_events
    where auditor_auth_user_id = v_auditor_auth_user_id
      and event_key = 'auditor_export_downloaded'
      and source_id = v_export_id
  ) then
    raise exception 'download access event missing';
  end if;
end $$;
