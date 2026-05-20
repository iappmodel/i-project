do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_project_id uuid;
  v_export_id uuid;
  v_revocation_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'revoke-questionnaire-export-admin@example.com',
    'Revoke Questionnaire Export Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'revoke questionnaire export bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Revoke Export Corp',
    'revokeexport.com',
    'revoke-export-corp',
    'Revoke Export Questionnaire',
    'Revocation smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'revoke-export-project',
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
    'revoke-questionnaire-export',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/revoke-questionnaire-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=revoke-questionnaire-export',
    now() + interval '60 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  v_revocation_id := revoke_admin_security_questionnaire_export(
    v_admin_auth_user_id,
    v_export_id,
    'incorrect_content',
    'Incorrect answer content found.',
    'This questionnaire export was revoked because its content was superseded.',
    true,
    false,
    'revoke-questionnaire-export',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_questionnaire_exports
    where id = v_export_id
      and status = 'revoked'
  ) then
    raise exception 'questionnaire export was not revoked';
  end if;

  if not exists (
    select 1
    from admin_security_revocation_records
    where id = v_revocation_id
      and source_type = 'admin_security_questionnaire_export'
      and source_id = v_export_id
      and status = 'active'
  ) then
    raise exception 'revocation record missing';
  end if;
end $$;
