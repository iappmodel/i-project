do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_report_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'security-report-admin@example.com',
    'Security Report Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'security report smoke bootstrap'
  );

  perform create_admin_security_daily_snapshot(
    current_date,
    '{"test": true, "scope": "report_generation"}'::jsonb
  );

  v_report_id := generate_admin_security_report(
    'daily',
    current_date,
    current_date,
    v_admin_auth_user_id,
    'security-report-smoke',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_report_exports
    where id = v_report_id
      and report_type = 'daily'
      and status = 'generated'
      and period_start = current_date
      and period_end = current_date
  ) then
    raise exception 'admin security report was not generated';
  end if;
end $$;
