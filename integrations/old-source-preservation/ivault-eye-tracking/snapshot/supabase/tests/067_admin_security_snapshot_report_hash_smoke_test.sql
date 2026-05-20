do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_snapshot_id uuid;
  v_report_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'security-report-hash-admin@example.com',
    'Security Report Hash Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'security report hash smoke bootstrap'
  );

  v_snapshot_id := create_admin_security_daily_snapshot(
    current_date - 1,
    '{"test": true, "scope": "snapshot_hash"}'::jsonb
  );

  v_report_id := generate_admin_security_report(
    'daily',
    current_date - 1,
    current_date - 1,
    v_admin_auth_user_id,
    'security-report-hash-smoke',
    '{"test": true}'::jsonb
  );

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true, "scope": "snapshot_report_hash"}'::jsonb
  );

  if exists (
    select 1
    from audit_hash_missing_records
    where source_type = 'admin_security_daily_snapshot'
      and source_id = v_snapshot_id
  ) then
    raise exception 'admin security daily snapshot hash missing';
  end if;

  if exists (
    select 1
    from audit_hash_missing_records
    where source_type = 'admin_security_report_export'
      and source_id = v_report_id
  ) then
    raise exception 'admin security report export hash missing';
  end if;
end $$;
