do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_export_id uuid;
  v_download record;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'audit-period-download-admin@example.com',
    'Audit Period Download Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'audit period download bootstrap'
  );

  insert into admin_security_audit_periods (
    period_key,
    period_name,
    status,
    audit_type,
    period_start,
    period_end,
    owner_team,
    description,
    created_by_auth_user_id,
    created_by_admin_user_id,
    sealed_at,
    seal_checksum_sha256,
    metadata
  )
  values (
    'audit_period_download_smoke',
    'Audit Period Download Smoke',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Download smoke period.',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    repeat('e', 64),
    '{"test": true}'::jsonb
  )
  returning id into v_period_id;

  insert into admin_security_audit_period_export_requests (
    export_key,
    audit_period_id,
    status,
    export_type,
    export_format,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    generated_at,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    watermark,
    expires_at,
    metadata
  )
  values (
    'audit-period-download-smoke-export',
    v_period_id,
    'ready',
    'full_period_bundle',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    'file:///tmp/audit-period-download-smoke.json',
    repeat('f', 64),
    777,
    'AUDIT_PERIOD=audit_period_download_smoke',
    now() + interval '30 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  select *
  into v_download
  from register_admin_security_audit_period_export_download(
    v_admin_auth_user_id,
    v_export_id,
    'audit-period-download-register',
    '{"test": true}'::jsonb
  );

  if v_download.export_request_id is null then
    raise exception 'audit period export download registration failed';
  end if;

  if not exists (
    select 1
    from admin_security_audit_period_export_requests
    where id = v_export_id
      and download_count = 1
      and last_downloaded_at is not null
  ) then
    raise exception 'audit period export download count not updated';
  end if;
end $$;
