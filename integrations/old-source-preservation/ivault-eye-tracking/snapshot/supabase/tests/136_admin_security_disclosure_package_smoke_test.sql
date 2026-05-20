do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_second_auth_user_id uuid := gen_random_uuid();
  v_requester_admin_id uuid;
  v_second_admin_id uuid;
  v_project_id uuid;
  v_export_id uuid;
  v_approval_id uuid;
  v_package_id uuid;
begin
  v_requester_admin_id := upsert_admin_user(
    v_requester_auth_user_id,
    'disclosure-package-requester@example.com',
    'Disclosure Package Requester',
    'active',
    '{"test": true}'::jsonb
  );

  v_second_admin_id := upsert_admin_user(
    v_second_auth_user_id,
    'disclosure-package-second@example.com',
    'Disclosure Package Second',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_requester_auth_user_id, 'super_admin', null, 'disclosure package requester bootstrap');
  perform assign_admin_role(v_second_auth_user_id, 'super_admin', null, 'disclosure package second bootstrap');

  v_project_id := create_admin_security_questionnaire_project(
    v_requester_auth_user_id,
    'Disclosure Package Corp',
    'packagecorp.com',
    'package-corp',
    'Disclosure Package Questionnaire',
    'Disclosure package smoke test.',
    'enterprise_security_questionnaire',
    null,
    now() + interval '14 days',
    null,
    null,
    null,
    'disclosure-package-project',
    '{"test": true}'::jsonb
  );

  update admin_security_questionnaire_projects
  set
    status = 'approved',
    approved_at = now(),
    approved_by_auth_user_id = v_requester_auth_user_id,
    approved_by_admin_user_id = v_requester_admin_id
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
    'disclosure-package-export',
    'ready',
    'json',
    v_requester_auth_user_id,
    v_requester_admin_id,
    true,
    true,
    false,
    now(),
    'file:///tmp/disclosure-package-export.json',
    repeat('a', 64),
    1000,
    1,
    0,
    'HMAC-SHA256',
    'questionnaire-export-signing-v1',
    repeat('b', 64),
    now(),
    'QUESTIONNAIRE_EXPORT=disclosure-package-export',
    now() + interval '60 days',
    '{"test": true}'::jsonb
  )
  returning id into v_export_id;

  v_approval_id := create_admin_security_disclosure_approval_request(
    v_requester_auth_user_id,
    'enterprise_room_publication',
    'high',
    'admin_security_questionnaire_export',
    v_export_id,
    'Publish questionnaire export',
    'Approve disclosure package publication.',
    'publish_to_enterprise_room',
    'Disclosure Package Corp',
    null,
    now() + interval '7 days',
    'disclosure-package-approval',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_requester_auth_user_id,
    v_approval_id,
    'approved',
    'security',
    'security approved',
    'disclosure-package-security',
    '{"test": true}'::jsonb
  );

  perform decide_admin_security_disclosure_approval_request(
    v_second_auth_user_id,
    v_approval_id,
    'approved',
    'second_admin',
    'second admin approved',
    'disclosure-package-second',
    '{"test": true}'::jsonb
  );

  v_package_id := create_admin_security_disclosure_package(
    v_requester_auth_user_id,
    'enterprise_room_publication',
    'high',
    'admin_security_questionnaire_export',
    v_export_id,
    'enterprise_review_room',
    null,
    'Questionnaire Response',
    'Signed questionnaire response disclosure package.',
    'Disclosure Package Corp',
    'packagecorp.com',
    null,
    'disclosure-package-create',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_disclosure_packages
    where id = v_package_id
      and status = 'active'
      and approval_request_id = v_approval_id
      and checksum_sha256 = repeat('a', 64)
      and signature = repeat('b', 64)
  ) then
    raise exception 'disclosure package was not created correctly';
  end if;

  if not exists (
    select 1
    from audit_hash_chain_entries
    where source_type = 'admin_security_disclosure_package'
      and source_id = v_package_id
  ) then
    raise exception 'disclosure package was not hash chained';
  end if;
end $$;
