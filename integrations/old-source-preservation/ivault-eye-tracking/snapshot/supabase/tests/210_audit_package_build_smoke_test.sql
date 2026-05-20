do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_request_id uuid;
  v_package_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'audit-package-admin@example.com',
    'Audit Package Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'audit package bootstrap');

  perform register_admin_security_proof_retention_subject(
    'trust_proof_report',
    gen_random_uuid(),
    'audit-package-report-smoke',
    'trust_proof_report',
    'audit-package-report-smoke',
    repeat('a', 64),
    'Audit Package Corp',
    'auditpackage.example.com',
    null,
    null,
    null,
    'file:///tmp/audit-package-report.html',
    repeat('a', 64),
    1000,
    'customer_confidential',
    'proof_artifact',
    true,
    true,
    false,
    false,
    'audit-package-subject',
    '{"test": true}'::jsonb
  );

  v_request_id := create_admin_security_audit_package_request(
    v_admin_auth_user_id,
    'customer_evidence',
    'customer',
    'Audit Package Smoke',
    'Smoke audit package.',
    'Audit Package Corp',
    'auditpackage.example.com',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    false,
    true,
    'Smoke test.',
    'SMOKE-1',
    false,
    'audit-package-request',
    '{"test": true}'::jsonb
  );

  v_package_id := build_admin_security_audit_package_from_request(
    v_request_id,
    'audit-package-worker',
    'audit-package-build',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_audit_packages
    where id = v_package_id
      and status = 'ready'
      and manifest_hash_sha256 is not null
      and item_count >= 1
  ) then
    raise exception 'audit package was not built';
  end if;
end $$;
