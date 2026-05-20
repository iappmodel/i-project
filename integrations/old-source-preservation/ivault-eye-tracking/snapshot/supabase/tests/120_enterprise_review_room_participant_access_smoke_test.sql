do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_participant_auth_user_id uuid := gen_random_uuid();
  v_period_id uuid;
  v_report_id uuid;
  v_room_id uuid;
  v_room_key text;
  v_participant_id uuid;
  v_result jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'enterprise-room-participant-admin@example.com',
    'Enterprise Room Participant Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'enterprise participant bootstrap');

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
    'enterprise_participant_period',
    'Enterprise Participant Period',
    'sealed',
    'internal',
    now() - interval '30 days',
    now(),
    'platform',
    'Enterprise participant period.',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    repeat('d', 64),
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
    'enterprise-participant-report',
    v_period_id,
    'ready',
    'enterprise_security_review',
    'markdown',
    'Enterprise Participant Report',
    'enterprise_customer',
    v_admin_auth_user_id,
    v_admin_user_id,
    now(),
    'file:///tmp/enterprise-participant-report.md',
    repeat('e', 64),
    1234,
    'HMAC-SHA256',
    'compliance-report-signing-v1',
    repeat('f', 64),
    now(),
    'COMPLIANCE_REPORT=enterprise-participant-report',
    now() + interval '90 days',
    7,
    20,
    '{"test": true}'::jsonb
  )
  returning id into v_report_id;

  v_room_id := create_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    'Participant Corp',
    'participant.com',
    'participant-corp',
    'Participant Corp Security Review',
    'Private review room.',
    'enterprise_security_review',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    'enterprise-participant-create',
    '{"test": true}'::jsonb
  );

  select room_key
  into v_room_key
  from admin_security_enterprise_review_rooms
  where id = v_room_id;

  perform grant_admin_security_enterprise_review_room_document(
    v_admin_auth_user_id,
    v_room_id,
    'compliance_report',
    'Participant Security Report',
    'Signed report.',
    v_report_id,
    null,
    null,
    'room_only',
    true,
    true,
    now(),
    now() + interval '30 days',
    1,
    'enterprise-participant-grant',
    '{"test": true}'::jsonb
  );

  v_participant_id := invite_admin_security_enterprise_review_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'reviewer@participant.com',
    'Reviewer',
    'Participant Corp',
    'customer_reviewer',
    'Security Reviewer',
    v_participant_auth_user_id,
    'enterprise-participant-invite',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    v_room_id,
    'publish',
    'enterprise-participant-publish',
    '{"test": true}'::jsonb
  );

  perform accept_enterprise_review_room_nda(
    v_participant_auth_user_id,
    v_room_key,
    'reviewer@participant.com',
    'nda-v1',
    null,
    'smoke-test',
    'enterprise-participant-nda',
    '{"test": true}'::jsonb
  );

  v_result := list_enterprise_review_room_for_participant(
    v_participant_auth_user_id,
    v_room_key,
    null,
    'smoke-test',
    'enterprise-participant-list'
  );

  if jsonb_array_length(v_result->'documents') = 0 then
    raise exception 'participant should see room documents';
  end if;

  if not exists (
    select 1
    from admin_security_enterprise_review_room_access_events
    where review_room_id = v_room_id
      and participant_id = v_participant_id
      and event_key = 'enterprise_review_room_viewed'
  ) then
    raise exception 'room view event missing';
  end if;
end $$;
