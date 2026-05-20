do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_check jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'entitlement-check-admin@example.com',
    'Entitlement Check Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'entitlement check bootstrap');

  perform create_admin_security_trust_billing_account(
    v_admin_auth_user_id,
    'Entitlement Corp',
    'entitlement.example.com',
    'trust_enterprise',
    'billing@entitlement.example.com',
    'Entitlement Contact',
    'monthly',
    null,
    null,
    null,
    null,
    'entitlement-account',
    '{"test": true}'::jsonb
  );

  v_check := check_admin_security_trust_entitlement(
    'Entitlement Corp',
    'entitlement.example.com',
    'audit_packages',
    'audit_package_built',
    1,
    'entitlement-check',
    '{"test": true}'::jsonb
  );

  if (v_check->>'allowed')::boolean is not true then
    raise exception 'expected entitlement allowed, got %', v_check;
  end if;
end $$;
