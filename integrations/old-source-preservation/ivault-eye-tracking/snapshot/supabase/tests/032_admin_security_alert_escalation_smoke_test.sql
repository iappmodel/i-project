do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'alert-escalation-admin@example.com',
    'Alert Escalation Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'alert escalation smoke bootstrap'
  );

  v_alert_id := create_admin_security_alert(
    'smoke_stale_critical_alert',
    'critical',
    v_admin_auth_user_id,
    null,
    'smoke_action',
    null,
    'Smoke stale critical alert.',
    '{"test": true}'::jsonb
  );

  update admin_security_alert_events
  set created_at = now() - interval '1 hour'
  where id = v_alert_id;

  perform run_admin_security_alert_escalation_job(
    500,
    '{"test": true, "scope": "stale_critical"}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_escalation_events
    where admin_security_alert_event_id = v_alert_id
      and escalation_key = 'open_critical_alert_stale'
  ) then
    raise exception 'stale critical alert escalation event missing';
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where alert_key = 'escalation_open_critical_alert_stale'
      and metadata->>'source_alert_id' = v_alert_id::text
  ) then
    raise exception 'stale critical escalation alert missing';
  end if;
end $$;
