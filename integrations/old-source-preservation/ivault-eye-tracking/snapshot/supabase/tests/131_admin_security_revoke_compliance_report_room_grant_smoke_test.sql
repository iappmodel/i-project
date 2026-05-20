do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_report_id uuid;
  v_room_id uuid;
  v_grant_id uuid;
  v_revocation_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'revoke-report-admin@example.com',
    'Revoke Report Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'revoke report bootstrap');

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
    'revoke_report_period',
    'Revoke Report Period',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Revoke report period.',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    repeat('a', 64),
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
    section_count,
    evidence_item_count,
    metadata
  )
  values (
    'revoke-compliance-report',
    v_period_id,
    'ready',
    'enterprise_security_review',
    'markdown',
    'Revoke Compliance Report',
    'enterprise_customer',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    'file:///tmp/revoke-compliance-report.md',
    repeat('b', 64),
    1000,
    'HMAC-SHA256',
    'compliance-report-signing-v1',
    repeat('c', 64),
    now(),
    'COMPLIANCE_REPORT=revoke-compliance-report',
    now() + interval '90 days',
    7,
    10,
    '{"test": true}'::jsonb
  )
  returning id into v_report_id;

  v_room_id := create_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    'Revoke Room Corp',
    'revokeroom.com',
    'revoke-room-corp',
    'Revoke Room Security Review',
    'Room for revocation smoke.',
    'enterprise_security_review',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    'revoke-room-create',
    '{"test": true}'::jsonb
  );

  v_grant_id := grant_admin_security_enterprise_review_room_document(
    v_admin_auth_user_id,
    v_room_id,
    'compliance_report',
    'Report',
    'Report summary.',
    v_report_id,
    null,
    null,
    'room_only',
    true,
    true,
    now(),
    now() + interval '30 days',
    1,
    'revoke-report-grant',
    '{"test": true}'::jsonb
  );

  v_revocation_id := revoke_admin_security_compliance_report(
    v_admin_auth_user_id,
    v_report_id,
    'incorrect_content',
    'Report content was incorrect.',
    'This report has been revoked.',
    true,
    false,
    'revoke-report',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_compliance_report_requests
    where id = v_report_id
      and status = 'revoked'
  ) then
    raise exception 'compliance report was not revoked';
  end if;

  if not exists (
    select 1
    from admin_security_enterprise_review_room_document_grants
    where id = v_grant_id
      and status = 'revoked'
  ) then
    raise exception 'room grant was not revoked';
  end if;

  if not exists (
    select 1
    from admin_security_revocation_records
    where id = v_revocation_id
  ) then
    raise exception 'revocation record missing';
  end if;
end $$;
