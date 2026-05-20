do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_project_id uuid;
  v_export_id uuid;
  v_room_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'disclosure-block-admin@example.com',
    'Disclosure Block Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'disclosure block bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Disclosure Block Corp',
    'disclosureblock.com',
    'disclosure-block-corp',
    'Disclosure Block Questionnaire',
    'Disclosure block test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'disclosure-block-project',
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
    'disclosure-block-export',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/disclosure-block-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=disclosure-block-export',
    now() + interval '60 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  v_room_id := create_admin_security_enterprise_review_room(
    v_admin_auth_user_id,
    'Disclosure Block Corp',
    'disclosureblock.com',
    'disclosure-block-corp',
    'Disclosure Block Room',
    'Disclosure block room.',
    'enterprise_security_review',
    null,
    null,
    now(),
    now() + interval '30 days',
    true,
    true,
    'disclosure-block-room',
    '{"test": true}'::jsonb
  );

  begin
    perform publish_admin_security_questionnaire_export_to_enterprise_room(
      v_admin_auth_user_id,
      v_export_id,
      v_room_id,
      'Questionnaire Response',
      'Signed response.',
      true,
      true,
      now() + interval '30 days',
      1,
      'disclosure-block-publish',
      '{"test": true}'::jsonb
    );

    raise exception 'publication should require disclosure approval';
  exception
    when others then
      if sqlerrm not like '%approved disclosure request required%' then
        raise;
      end if;
  end;
end $$;
