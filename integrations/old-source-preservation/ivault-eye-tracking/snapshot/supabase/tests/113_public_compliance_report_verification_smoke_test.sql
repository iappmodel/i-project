do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_report_id uuid;
  v_result jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'public-verification-admin@example.com',
    'Public Verification Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'public verification bootstrap'
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
    'public_verification_period',
    'Public Verification Period',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Public verification smoke period.',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    repeat('a', 64),
    '{"test": true}'::jsonb
  )
  returning id into v_period_id;

  perform append_audit_hash_chain_entry(
    'admin_security_audit_period',
    v_period_id,
    jsonb_build_object('test', true),
    'global_audit_chain',
    '{"test": true}'::jsonb
  );

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
    section_count,
    evidence_item_count,
    metadata
  )
  values (
    'public-verification-report',
    v_period_id,
    'ready',
    'audit_period_executive_summary',
    'markdown',
    'Public Verification Report',
    'internal',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    'file:///tmp/public-verification-report.md',
    repeat('b', 64),
    999,
    'HMAC-SHA256',
    'compliance-report-signing-v1',
    repeat('c', 64),
    now(),
    'COMPLIANCE_REPORT=public-verification-report',
    now() + interval '90 days',
    7,
    12,
    '{"test": true}'::jsonb
  )
  returning id into v_report_id;

  perform append_audit_hash_chain_entry(
    'admin_security_compliance_report',
    v_report_id,
    jsonb_build_object('test', true),
    'global_audit_chain',
    '{"test": true}'::jsonb
  );

  v_result := verify_admin_security_compliance_report_public(
    'public-verification-report',
    repeat('b', 64),
    repeat('c', 64),
    repeat('a', 64),
    true,
    null,
    'smoke-test',
    'public-verification-smoke',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'verified' then
    raise exception 'expected verified public report, got %', v_result;
  end if;

  if not exists (
    select 1
    from admin_security_compliance_report_verification_attempts
    where report_key = 'public-verification-report'
      and verification_status = 'verified'
  ) then
    raise exception 'verification attempt not logged';
  end if;
end $$;
