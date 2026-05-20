do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_request_id uuid;
  v_package_id uuid;
  v_grant_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'audit-package-access-admin@example.com',
    'Audit Package Access Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'audit package access bootstrap');

  perform register_admin_security_proof_retention_subject(
    'trust_proof_report',
    gen_random_uuid(),
    'audit-package-access-report',
    'trust_proof_report',
    'audit-package-access-report',
    repeat('c', 64),
    'Audit Access Corp',
    'auditaccess.example.com',
    null,
    null,
    null,
    null,
    repeat('c', 64),
    1000,
    'customer_confidential',
    'proof_artifact',
    true,
    true,
    false,
    false,
    'audit-package-access-subject',
    '{"test": true}'::jsonb
  );

  v_request_id := create_admin_security_audit_package_request(
    v_admin_auth_user_id,
    'regulator_bundle',
    'customer',
    'Audit Access Package',
    'Access smoke audit package.',
    'Audit Access Corp',
    'auditaccess.example.com',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    false,
    true,
    'Access smoke.',
    'ACCESS-1',
    false,
    'audit-package-access-request',
    '{"test": true}'::jsonb
  );

  v_package_id := build_admin_security_audit_package_from_request(
    v_request_id,
    'audit-package-worker',
    'audit-package-access-build',
    '{"test": true}'::jsonb
  );

  v_grant_id := grant_admin_security_audit_package_access(
    v_admin_auth_user_id,
    v_package_id,
    'regulator',
    'regulator@example.com',
    'Regulator Reviewer',
    'download',
    true,
    true,
    false,
    5,
    now() + interval '30 days',
    'audit-package-grant',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_audit_package_access_grants
    where id = v_grant_id
      and status = 'active'
  ) then
    raise exception 'audit package access grant missing';
  end if;
end $$;
