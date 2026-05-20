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
    'public-verification-expired-admin@example.com',
    'Public Verification Expired Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'public verification expired bootstrap'
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
    'public_verification_expired_period',
    'Public Verification Expired Period',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Public verification expired smoke period.',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    repeat('1', 64),
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
    'public-verification-expired-report',
    v_period_id,
    'ready',
    'audit_period_executive_summary',
    'markdown',
    'Public Verification Expired Report',
    'internal',
    v_admin_auth_user_id,
    v_admin_user_id,
    now() - interval '100 days',
    'file:///tmp/public-verification-expired-report.md',
    repeat('2', 64),
    999,
    'HMAC-SHA256',
    'compliance-report-signing-v1',
    repeat('3', 64),
    now() - interval '100 days',
    'COMPLIANCE_REPORT=public-verification-expired-report',
    now() - interval '1 day',
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
    'public-verification-expired-report',
    repeat('2', 64),
    repeat('3', 64),
    repeat('1', 64),
    true,
    null,
    'smoke-test',
    'public-verification-expired-smoke',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'expired' then
    raise exception 'expected expired verification, got %', v_result;
  end if;
end $$;
