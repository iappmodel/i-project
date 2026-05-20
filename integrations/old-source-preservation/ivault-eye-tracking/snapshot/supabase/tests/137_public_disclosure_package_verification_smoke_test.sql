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
  v_package_key text;
  v_result jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'verify-disclosure-package-admin@example.com',
    'Verify Disclosure Package Admin',
    'active',
    '{"test": true}'::jsonb
  );

  v_second_admin_id := upsert_admin_user(
    v_second_auth_user_id,
    'verify-disclosure-package-second@example.com',
    'Verify Disclosure Package Second',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'verify disclosure package admin bootstrap');
  perform assign_admin_role(v_second_auth_user_id, 'super_admin', null, 'verify disclosure package second bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Verify Package Corp',
    'verifypackage.com',
    'verify-package-corp',
    'Verify Package Questionnaire',
    'Verify disclosure package.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'verify-package-project',
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
    'verify-disclosure-package-export',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/verify-disclosure-package-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=verify-disclosure-package-export',
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
    'Approve disclosure package publication.',
    'publish_to_enterprise_room',
    'Verify Package Corp',
    null,
    now() + interval '7 days',
    'verify-package-approval',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_admin_auth_user_id,
    v_approval_id,
    'approved',
    'security',
    'security approved',
    'verify-package-security',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_second_auth_user_id,
    v_approval_id,
    'approved',
    'second_admin',
    'second admin approved',
    'verify-package-second',
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
    'Signed questionnaire response disclosure package.',
    'Verify Package Corp',
    'verifypackage.com',
    null,
    'verify-package-create',
    '{"test": true}'::jsonb
  );

  select package_key
  into v_package_key
  from admin_security_disclosure_packages
  where id = v_package_id;

  v_result := verify_admin_security_disclosure_package_public(
    v_package_key,
    repeat('a', 64),
    repeat('b', 64),
    true,
    null,
    'smoke-test',
    'verify-package',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verificationStatus') <> 'verified' then
    raise exception 'expected verified disclosure package, got %', v_result;
  end if;
end $$;
