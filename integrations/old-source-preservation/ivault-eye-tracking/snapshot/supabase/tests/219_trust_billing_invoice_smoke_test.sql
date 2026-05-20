do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_period_id uuid;
  v_invoice_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'invoice-admin@example.com',
    'Invoice Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'invoice bootstrap');

  v_account_id := create_admin_security_trust_billing_account(
    v_admin_auth_user_id,
    'Invoice Corp',
    'invoice.example.com',
    'trust_starter',
    'billing@invoice.example.com',
    'Invoice Contact',
    'monthly',
    null,
    null,
    null,
    null,
    'invoice-account',
    '{"test": true}'::jsonb
  );

  perform record_admin_security_trust_usage_meter_event(
    'Invoice Corp',
    'invoice.example.com',
    'proof_report_generated',
    'proofs',
    1,
    'smoke_test',
    gen_random_uuid(),
    'invoice-source',
    null,
    'trust_proof_report',
    'invoice-proof',
    now(),
    'invoice-usage-dedupe',
    'invoice-usage',
    '{"test": true}'::jsonb
  );

  v_period_id := open_admin_security_trust_billing_period(
    v_account_id,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    'invoice-period',
    '{"test": true}'::jsonb
  );

  perform finalize_admin_security_trust_billing_period(
    v_period_id,
    'invoice-finalize',
    '{"test": true}'::jsonb
  );

  v_invoice_id := create_admin_security_trust_invoice_from_period(
    v_period_id,
    30,
    'invoice-create',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_invoices
    where id = v_invoice_id
      and status = 'issued'
  ) then
    raise exception 'invoice was not issued';
  end if;
end $$;
