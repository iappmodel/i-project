do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_rollup jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'usage-rollup-admin@example.com',
    'Usage Rollup Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'usage rollup bootstrap');

  perform create_admin_security_trust_billing_account(
    v_admin_auth_user_id,
    'Usage Rollup Corp',
    'usagerollup.example.com',
    'trust_starter',
    'billing@usagerollup.example.com',
    'Usage Contact',
    'monthly',
    null,
    null,
    null,
    null,
    'usage-rollup-account',
    '{"test": true}'::jsonb
  );

  perform record_admin_security_trust_usage_meter_event(
    'Usage Rollup Corp',
    'usagerollup.example.com',
    'proof_report_generated',
    'proofs',
    2,
    'smoke_test',
    gen_random_uuid(),
    'usage-rollup-source',
    null,
    'trust_proof_report',
    'usage-rollup-proof',
    now(),
    'usage-rollup-dedupe',
    'usage-rollup-meter',
    '{"test": true}'::jsonb
  );

  v_rollup := refresh_admin_security_trust_usage_rollups(
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    5000,
    'usage-rollup-worker',
    '{"test": true}'::jsonb
  );

  if v_rollup is null then
    raise exception 'usage rollup refresh returned null';
  end if;

  if not exists (
    select 1
    from admin_security_trust_usage_rollups
    where customer_name = 'Usage Rollup Corp'
      and meter_name = 'proof_report_generated'
      and total_quantity >= 2
  ) then
    raise exception 'usage rollup missing';
  end if;
end $$;
