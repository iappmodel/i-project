do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_snapshot_id uuid;
  v_report_id uuid;
  v_claimed_id uuid;
  v_challenge_id uuid;
  v_content jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'compliance-report-admin@example.com',
    'Compliance Report Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'compliance report bootstrap'
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
    'Compliance Report Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_period_id := create_admin_security_audit_period(
    v_admin_auth_user_id,
    'compliance_report_smoke_period',
    'Compliance Report Smoke Period',
    'internal',
    now() - interval '30 days',
    now(),
    'Smoke test compliance report period.',
    'platform',
    'compliance-report-period-create',
    '{"test": true}'::jsonb
  );

  perform open_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'open',
    'compliance-report-period-open',
    '{"test": true}'::jsonb
  );

  v_snapshot_id := build_admin_security_audit_period_snapshot(
    v_admin_auth_user_id,
    v_period_id,
    'control_coverage',
    'compliance_report_smoke_control_coverage',
    'Control coverage snapshot',
    'compliance-report-snapshot',
    '{"test": true}'::jsonb
  );

  perform seal_admin_security_audit_period_snapshot(
    v_admin_auth_user_id,
    v_snapshot_id,
    'seal snapshot',
    'compliance-report-snapshot-seal',
    '{"test": true}'::jsonb
  );

  perform close_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'close',
    'compliance-report-period-close',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'compliance-report-period-seal-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'compliance-report-period-seal-mfa',
    '{"test": true}'::jsonb
  );

  perform seal_admin_security_audit_period(
    v_admin_auth_user_id,
    v_period_id,
    'seal period',
    'compliance-report-period-seal',
    '{"test": true}'::jsonb
  );

  v_report_id := request_admin_security_compliance_report(
    v_admin_auth_user_id,
    v_period_id,
    null,
    'audit_period_executive_summary',
    'markdown',
    'Compliance Report Smoke',
    'internal',
    null,
    'compliance-report-request',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_compliance_report(
    v_admin_auth_user_id,
    v_report_id,
    'approved smoke report',
    'compliance-report-approve',
    '{"test": true}'::jsonb
  );

  select compliance_report_request_id
  into v_claimed_id
  from claim_admin_security_compliance_reports(
    5,
    'compliance-report-worker',
    '{"test": true}'::jsonb
  )
  where compliance_report_request_id = v_report_id;

  if v_claimed_id is null then
    raise exception 'compliance report was not claimed';
  end if;

  v_content := build_admin_security_compliance_report_content(
    v_report_id,
    '{"test": true}'::jsonb
  );

  if (v_content->>'section_count')::integer = 0 then
    raise exception 'compliance report sections missing';
  end if;

  perform complete_admin_security_compliance_report(
    v_report_id,
    'file:///tmp/compliance-report-smoke.md',
    repeat('a', 64),
    4321,
    repeat('b', 64),
    'compliance-report-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_compliance_report_requests
    where id = v_report_id
      and status = 'ready'
      and checksum_sha256 = repeat('a', 64)
      and signature = repeat('b', 64)
      and signed_at is not null
  ) then
    raise exception 'compliance report was not completed ready';
  end if;
end $$;
