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
    'public-verification-failure-admin@example.com',
    'Public Verification Failure Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'public verification failure bootstrap'
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
    'public_verification_failure_period',
    'Public Verification Failure Period',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Public verification failure smoke period.',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    repeat('d', 64),
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
    'public-verification-failure-report',
    v_period_id,
    'ready',
    'audit_period_executive_summary',
    'markdown',
    'Public Verification Failure Report',
    'internal',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    'file:///tmp/public-verification-failure-report.md',
    repeat('e', 64),
    999,
    'HMAC-SHA256',
    'compliance-report-signing-v1',
    repeat('f', 64),
    now(),
    'COMPLIANCE_REPORT=public-verification-failure-report',
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
    'public-verification-failure-report',
    repeat('0', 64),
    repeat('f', 64),
    repeat('d', 64),
    true,
    null,
    'smoke-test',
    'public-verification-failure-smoke',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'failed' then
    raise exception 'expected failed verification, got %', v_result;
  end if;

  if (v_result->>'failureReason') <> 'checksum mismatch' then
    raise exception 'expected checksum mismatch, got %', v_result->>'failureReason';
  end if;
end $$;
