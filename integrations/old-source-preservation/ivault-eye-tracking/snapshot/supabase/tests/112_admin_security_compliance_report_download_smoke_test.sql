do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_report_id uuid;
  v_download record;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'compliance-report-download@example.com',
    'Compliance Report Download',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'compliance report download bootstrap'
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
    'compliance_report_download_period',
    'Compliance Report Download Period',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Download smoke period.',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    repeat('c', 64),
    '{"test": true}'::jsonb
  )
  returning id into v_period_id;

  insert into admin_security_compliance_report_requests (
    report_key,
    audit_period_id,
    status,
    report_type,
    report_format,
    report_title,
    report_audience,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    generated_at,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    watermark,
    expires_at,
    metadata
  )
  values (
    'compliance-report-download-smoke',
    v_period_id,
    'ready',
    'audit_period_executive_summary',
    'markdown',
    'Download Smoke Report',
    'internal',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    'file:///tmp/compliance-report-download-smoke.md',
    repeat('d', 64),
    999,
    'HMAC-SHA256',
    'compliance-report-signing-v1',
    repeat('e', 64),
    now(),
    'COMPLIANCE_REPORT=compliance-report-download-smoke',
    now() + interval '90 days',
    '{"test": true}'::jsonb
  )
  returning id into v_report_id;

  select *
  into v_download
  from register_admin_security_compliance_report_download(
    v_admin_auth_user_id,
    v_report_id,
    'compliance-report-download-register',
    '{"test": true}'::jsonb
  );

  if v_download.compliance_report_request_id is null then
    raise exception 'compliance report download registration failed';
  end if;

  if not exists (
    select 1
    from admin_security_compliance_report_requests
    where id = v_report_id
      and download_count = 1
      and last_downloaded_at is not null
  ) then
    raise exception 'compliance report download count not updated';
  end if;
end $$;
