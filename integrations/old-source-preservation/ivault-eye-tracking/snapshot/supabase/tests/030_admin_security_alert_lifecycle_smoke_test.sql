do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'alert-lifecycle-admin@example.com',
    'Alert Lifecycle Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'alert lifecycle smoke bootstrap'
  );

  v_alert_id := create_admin_security_alert(
    'smoke_alert_lifecycle',
    'high',
    v_admin_auth_user_id,
    null,
    'smoke_action',
    null,
    'Smoke lifecycle alert.',
    '{"test": true}'::jsonb
  );

  perform acknowledge_admin_security_alert(
    v_admin_auth_user_id,
    v_alert_id,
    'acknowledged by smoke test',
    'smoke-alert-ack',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_events
    where id = v_alert_id
      and status = 'acknowledged'
      and acknowledged_by_auth_user_id = v_admin_auth_user_id
      and acknowledged_at is not null
  ) then
    raise exception 'alert was not acknowledged';
  end if;

  perform resolve_admin_security_alert(
    v_admin_auth_user_id,
    v_alert_id,
    'resolved by smoke test',
    'smoke-alert-resolve',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_events
    where id = v_alert_id
      and status = 'resolved'
      and resolved_by_auth_user_id = v_admin_auth_user_id
      and resolved_at is not null
      and resolution_note = 'resolved by smoke test'
  ) then
    raise exception 'alert was not resolved';
  end if;

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true, "scope": "admin_security_alert_lifecycle"}'::jsonb
  );

  if exists (
    select 1
    from audit_hash_missing_records
    where source_type = 'admin_security_alert_event'
      and source_id = v_alert_id
  ) then
    raise exception 'resolved alert hash is missing';
  end if;
end $$;
