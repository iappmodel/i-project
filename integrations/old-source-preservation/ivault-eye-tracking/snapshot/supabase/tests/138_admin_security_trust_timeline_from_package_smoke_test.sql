do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_second_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_second_admin_id uuid;
  v_project_id uuid;
  v_export_id uuid;
  v_approval_id uuid;
  v_package_id uuid;
  v_event_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'timeline-package-admin@example.com',
    'Timeline Package Admin',
    'active',
    '{"test": true}'::jsonb
  );

  v_second_admin_id := upsert_admin_user(
    v_second_auth_user_id,
    'timeline-package-second@example.com',
    'Timeline Package Second',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'timeline package admin bootstrap');
  perform assign_admin_role(v_second_auth_user_id, 'super_admin', null, 'timeline package second bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Timeline Package Corp',
    'timelinepackage.com',
    'timeline-package-corp',
    'Timeline Package Questionnaire',
    'Timeline package smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'timeline-package-project',
    '{"test": true}'::jsonb
  );

  update admin_security_questionnaire_projects
  set
    status = 'approved',
    approved_at = now(),
    approved_by_auth_user_id = v_admin_auth_user_id,
    approved_by_admin_user_id = v_admin_user_id
  where id = v_project_id;

  insert into admin_security_questionnaire_exports (
    questionnaire_project_id,
    export_key,
    status,
    export_format,
    requested_by_auth_user_id,
    requested_by_admin_user_id,
    approved_only,
    include_evidence,
    include_internal_notes,
    generated_at,
    storage_uri,
    checksum_sha256,
    payload_bytes,
    question_count,
    evidence_count,
    signature_algorithm,
    signing_key_version,
    signature,
    signed_at,
    watermark,
    expires_at,
    metadata
  )
  values (
    v_project_id,
    'timeline-package-export',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/timeline-package-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=timeline-package-export',
    now() + interval '60 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  v_approval_id := create_admin_security_disclosure_approval_request(
    v_admin_auth_user_id,
    'enterprise_room_publication',
    'high',
    'admin_security_questionnaire_export',
    v_export_id,
    'Publish questionnaire export',
    'Approve timeline package.',
    'publish_to_enterprise_room',
    'Timeline Package Corp',
    null,
    now() + interval '7 days',
    'timeline-package-approval',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_admin_auth_user_id,
    v_approval_id,
    'approved',
    'security',
    'security approved',
    'timeline-package-security',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_second_auth_user_id,
    v_approval_id,
    'approved',
    'second_admin',
    'second admin approved',
    'timeline-package-second',
    '{"test": true}'::jsonb
  );

  v_package_id := create_admin_security_disclosure_package(
    v_admin_auth_user_id,
    'enterprise_room_publication',
    'high',
    'admin_security_questionnaire_export',
    v_export_id,
    'enterprise_review_room',
    null,
    'Questionnaire Response',
    'Signed questionnaire response package.',
    'Timeline Package Corp',
    'timelinepackage.com',
    null,
    'timeline-package-create',
    '{"test": true}'::jsonb
  );

  v_event_id := create_external_trust_timeline_event_from_disclosure_package(
    v_admin_auth_user_id,
    v_package_id,
    'room_only',
    null,
    'info',
    null,
    'timeline-package-event',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_external_trust_timeline_events
    where id = v_event_id
      and disclosure_package_id = v_package_id
      and event_type = 'questionnaire_response_issued'
      and verification_status = 'verified'
  ) then
    raise exception 'timeline event was not created from disclosure package';
  end if;
end $$;
