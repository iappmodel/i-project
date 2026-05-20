do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_period_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'compliance-report-unsealed@example.com',
    'Compliance Report Unsealed',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'compliance report unsealed bootstrap'
  );

  v_period_id := create_admin_security_audit_period(
    v_admin_auth_user_id,
    'compliance_report_unsealed_period',
    'Compliance Report Unsealed Period',
    'internal',
    now() - interval '30 days',
    now(),
    'Report should fail while unsealed.',
    'platform',
    'compliance-report-unsealed-create',
    '{"test": true}'::jsonb
  );

  begin
    perform request_admin_security_compliance_report(
      v_admin_auth_user_id,
      v_period_id,
      null,
      'audit_period_executive_summary',
      'markdown',
      'Should Fail',
      'internal',
      null,
      'compliance-report-unsealed-request',
      '{"test": true}'::jsonb
    );

    raise exception 'compliance report should require sealed audit period';
  exception
    when others then
      if sqlerrm not like '%compliance report requires sealed audit period%' then
        raise;
      end if;
  end;
end $$;
