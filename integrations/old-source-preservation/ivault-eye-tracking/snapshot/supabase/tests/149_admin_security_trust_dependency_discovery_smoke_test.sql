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
  v_run_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'dependency-discovery-admin@example.com',
    'Dependency Discovery Admin',
    'active',
    '{"test": true}'::jsonb
  );

  v_second_admin_id := upsert_admin_user(
    v_second_auth_user_id,
    'dependency-discovery-second@example.com',
    'Dependency Discovery Second',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'dependency discovery bootstrap');
  perform assign_admin_role(v_second_auth_user_id, 'super_admin', null, 'dependency discovery second bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_admin_auth_user_id,
    'Dependency Discovery Corp',
    'dependencydiscovery.com',
    'dependency-discovery-corp',
    'Dependency Discovery Questionnaire',
    'Dependency discovery smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'dependency-discovery-project',
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
    'dependency-discovery-export',
    'ready',
    'json',
    v_admin_auth_user_id,
    v_admin_user_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/dependency-discovery-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=dependency-discovery-export',
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
    'Approve dependency package publication.',
    'publish_to_enterprise_room',
    'Dependency Discovery Corp',
    null,
    now() + interval '7 days',
    'dependency-discovery-approval',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_admin_auth_user_id,
    v_approval_id,
    'approved',
    'security',
    'security approved',
    'dependency-discovery-security',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_second_auth_user_id,
    v_approval_id,
    'approved',
    'second_admin',
    'second admin approved',
    'dependency-discovery-second',
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
    'Dependency Discovery Corp',
    'dependencydiscovery.com',
    null,
    'dependency-package-create',
    '{"test": true}'::jsonb
  );

  v_run_id := discover_admin_security_trust_artifact_dependencies(
    1000,
    'dependency-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_artifact_dependencies
    where parent_source_type = 'admin_security_questionnaire_export'
      and parent_source_id = v_export_id
      and child_source_type = 'admin_security_disclosure_package'
      and child_source_id = v_package_id
      and relationship_type = 'published_as'
  ) then
    raise exception 'dependency discovery did not create export -> package dependency';
  end if;
end $$;
