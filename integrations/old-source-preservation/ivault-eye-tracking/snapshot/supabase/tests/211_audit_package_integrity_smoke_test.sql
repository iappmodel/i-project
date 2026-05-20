do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_request_id uuid;
  v_package_id uuid;
  v_result jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'audit-package-verify-admin@example.com',
    'Audit Package Verify Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'audit package verify bootstrap');

  perform register_admin_security_proof_retention_subject(
    'answer_receipt',
    gen_random_uuid(),
    'audit-package-verify-receipt',
    'answer_receipt',
    'audit-package-verify-receipt',
    repeat('b', 64),
    'Audit Verify Corp',
    'auditverify.example.com',
    null,
    null,
    null,
    null,
    repeat('b', 64),
    1000,
    'customer_confidential',
    'proof_artifact',
    true,
    true,
    false,
    false,
    'audit-package-verify-subject',
    '{"test": true}'::jsonb
  );

  v_request_id := create_admin_security_audit_package_request(
    v_admin_auth_user_id,
    'auditor_package',
    'customer',
    'Audit Verify Package',
    'Verify smoke audit package.',
    'Audit Verify Corp',
    'auditverify.example.com',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    false,
    true,
    'Verify smoke.',
    'VERIFY-1',
    false,
    'audit-package-verify-request',
    '{"test": true}'::jsonb
  );

  v_package_id := build_admin_security_audit_package_from_request(
    v_request_id,
    'audit-package-worker',
    'audit-package-verify-build',
    '{"test": true}'::jsonb
  );

  v_result := verify_admin_security_audit_package_integrity(
    v_package_id,
    'audit-package-verify',
    '{"test": true}'::jsonb
  );

  if (v_result->>'verified')::boolean is not true then
    raise exception 'audit package integrity not verified: %', v_result;
  end if;
end $$;
