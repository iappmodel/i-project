do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_project_id uuid;
  v_export_id uuid;
  v_room_id uuid;
  v_grant_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'questionnaire-export-room-admin@example.com',
    'Questionnaire Export Room Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'questionnaire export room bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Room Export Corp',
    'roomexport.com',
    'room-export-corp',
    'Room Export Questionnaire',
    'Publish export to room smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'room-export-project-create',
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
    'room-export-questionnaire',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/room-export-questionnaire.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=room-export-questionnaire',
    now() + interval '60 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  v_room_id := create_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    'Room Export Corp',
    'roomexport.com',
    'room-export-corp',
    'Room Export Security Review',
    'Room for questionnaire export.',
    'enterprise_security_review',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    'room-export-room-create',
    '{"test": true}'::jsonb
  );

  v_grant_id := publish_admin_security_questionnaire_export_to_enterprise_room(
    v_admin_auth_user_id,
    v_export_id,
    v_room_id,
    'Security Questionnaire Response',
    'Signed questionnaire response.',
    true,
    true,
    now() + interval '30 days',
    1,
    'room-export-publish',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_enterprise_review_room_document_grants
    where id = v_grant_id
      and document_type = 'questionnaire_response'
      and status = 'active'
  ) then
    raise exception 'questionnaire export was not published as room document grant';
  end if;

  if not exists (
    select 1
    from admin_security_questionnaire_exports
    where id = v_export_id
      and enterprise_review_room_document_grant_id = v_grant_id
      and published_to_enterprise_room_at is not null
  ) then
    raise exception 'questionnaire export was not marked as published to room';
  end if;
end $$;
