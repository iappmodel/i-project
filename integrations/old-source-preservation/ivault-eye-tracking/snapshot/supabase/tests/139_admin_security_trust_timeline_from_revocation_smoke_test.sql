do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_project_id uuid;
  v_export_id uuid;
  v_revocation_id uuid;
  v_event_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'timeline-revocation-admin@example.com',
    'Timeline Revocation Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'timeline revocation bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Timeline Revocation Corp',
    'timelinerevocation.com',
    'timeline-revocation-corp',
    'Timeline Revocation Questionnaire',
    'Timeline revocation smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'timeline-revocation-project',
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
    'timeline-revocation-export',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/timeline-revocation-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=timeline-revocation-export',
    now() + interval '60 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  v_revocation_id := revoke_admin_security_questionnaire_export(
    v_admin_auth_user_id,
    v_export_id,
    'incorrect_content',
    'Incorrect content.',
    'This questionnaire response was revoked.',
    false,
    false,
    'timeline-revocation',
    '{"test": true}'::jsonb
  );

  v_event_id := create_external_trust_timeline_event_from_revocation(
    v_admin_auth_user_id,
    v_revocation_id,
    'customer_only',
    'timeline-revocation-event',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_external_trust_timeline_events
    where id = v_event_id
      and revocation_record_id = v_revocation_id
      and event_type = 'artifact_revoked'
      and verification_status = 'revoked'
  ) then
    raise exception 'timeline event was not created from revocation';
  end if;
end $$;
