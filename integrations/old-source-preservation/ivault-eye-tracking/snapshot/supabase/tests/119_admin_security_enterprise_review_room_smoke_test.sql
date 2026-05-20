do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
  v_report_id uuid;
  v_room_id uuid;
  v_grant_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'enterprise-room-admin@example.com',
    'Enterprise Room Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'enterprise room bootstrap'
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
    'enterprise_room_period',
    'Enterprise Room Period',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Enterprise room smoke period.',
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
    'enterprise-room-report',
    v_period_id,
    'ready',
    'enterprise_security_review',
    'markdown',
    'Enterprise Room Report',
    'enterprise_customer',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    'file:///tmp/enterprise-room-report.md',
    repeat('b', 64),
    1234,
    'HMAC-SHA256',
    'compliance-report-signing-v1',
    repeat('c', 64),
    now(),
    'COMPLIANCE_REPORT=enterprise-room-report',
    now() + interval '90 days',
    7,
    20,
    '{"test": true}'::jsonb
  )
  returning id into v_report_id;

  v_room_id := create_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    'Example Corp',
    'example.com',
    'example-corp',
    'Example Corp Security Review',
    'Private security review room for Example Corp.',
    'enterprise_security_review',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    'enterprise-room-create',
    '{"test": true}'::jsonb
  );

  v_grant_id := grant_admin_security_enterprise_review_room_document(
    v_admin_auth_user_id,
    v_room_id,
    'compliance_report',
    'Enterprise Security Report',
    'Signed report for Example Corp review.',
    v_report_id,
    null,
    null,
    'room_only',
    true,
    true,
    now(),
    now() + interval '30 days',
    1,
    'enterprise-room-grant',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    v_room_id,
    'publish smoke room',
    'enterprise-room-publish',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_enterprise_review_rooms
    where id = v_room_id
      and status = 'published'
  ) then
    raise exception 'enterprise review room was not published';
  end if;

  if not exists (
    select 1
    from admin_security_enterprise_review_room_document_grants
    where id = v_grant_id
      and status = 'active'
  ) then
    raise exception 'enterprise review room document grant missing';
  end if;
end $$;
