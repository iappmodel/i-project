do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_project_id uuid;
  v_export_id uuid;
  v_result jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'verify-revoked-export-admin@example.com',
    'Verify Revoked Export Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'verify revoked export bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Verify Revoked Corp',
    'verifyrevoked.com',
    'verify-revoked-corp',
    'Verify Revoked Questionnaire',
    'Verify revoked export.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'verify-revoked-project',
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
    'verify-revoked-questionnaire-export',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/verify-revoked-questionnaire-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=verify-revoked-questionnaire-export',
    now() + interval '60 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  perform append_audit_hash_chain_entry(
    'admin_security_questionnaire_export',
    v_export_id,
    jsonb_build_object('test', true),
    'global_audit_chain',
    '{"test": true}'::jsonb
  );

  perform revoke_admin_security_questionnaire_export(
    v_admin_auth_user_id,
    v_export_id,
    'incorrect_content',
    'Export revoked for test.',
    'This questionnaire export was revoked.',
    false,
    false,
    'verify-revoked-export',
    '{"test": true}'::jsonb
  );

  v_result := verify_admin_security_questionnaire_export_public(
    'verify-revoked-questionnaire-export',
    repeat('a', 64),
    repeat('b', 64),
    true,
    null,
    'smoke-test',
    'verify-revoked-export',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'revoked' then
    raise exception 'expected revoked verification, got %', v_result;
  end if;
end $$;
