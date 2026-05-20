do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'trust-billing-admin@example.com',
    'Trust Billing Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'trust billing bootstrap');

  perform create_admin_security_trust_billing_account(
    v_admin_auth_user_id,
    'Billing Corp',
    'billing.example.com',
    'trust_enterprise',
    'billing@example.com',
    'Billing Contact',
    'monthly',
    null,
    null,
    null,
    null,
    'trust-billing-account-create',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_customer_trust_entitlements
    where customer_name = 'Billing Corp'
      and customer_domain = 'billing.example.com'
      and status = 'active'
      and allow_audit_packages is true
  ) then
    raise exception 'billing entitlement was not created';
  end if;
end $$;
