do $$
declare
  v_result jsonb;
begin
  insert into admin_security_customer_trust_entitlements (
    entitlement_key,
    status,
    customer_name,
    customer_domain,
    entitlement_scope
  )
  values (
    'trust-entitlement-risk-score-smoke',
    'active',
    'Risk Score Corp',
    'riskscore.example.com',
    'customer'
  )
  on conflict (entitlement_key) do nothing;

  v_result := compute_admin_security_customer_trust_risk_scores(
    now() - interval '7 days',
    now(),
    'risk-score-worker',
    'risk-score-smoke',
    '{"test": true}'::jsonb
  );

  if v_result is null then
    raise exception 'risk score rpc returned null';
  end if;

  if not exists (
    select 1
    from admin_security_customer_trust_risk_scores
    where customer_name = 'Risk Score Corp'
      and customer_domain = 'riskscore.example.com'
  ) then
    raise exception 'risk score missing';
  end if;
end $$;
