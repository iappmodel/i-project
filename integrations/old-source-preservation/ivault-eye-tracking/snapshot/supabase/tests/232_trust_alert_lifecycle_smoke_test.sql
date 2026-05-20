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

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'alert lifecycle bootstrap');

  v_alert_id := create_admin_security_trust_alert_event(
    'manual',
    'lifecycle_smoke',
    'high',
    'high',
    'Alert lifecycle smoke',
    'Alert lifecycle smoke summary.',
    'Alert Lifecycle Corp',
    'alertlifecycle.example.com',
    'smoke',
    gen_random_uuid(),
    'alert-lifecycle-source',
    null,
    null,
    null,
    null,
    null,
    null,
    'alert-lifecycle-dedupe',
    '{}'::jsonb,
    'alert-lifecycle-create',
    '{"test": true}'::jsonb
  );

  perform acknowledge_admin_security_trust_alert_event(
    v_admin_auth_user_id,
    v_alert_id,
    'alert-lifecycle-ack',
    '{"test": true}'::jsonb
  );

  perform resolve_admin_security_trust_alert_event(
    v_admin_auth_user_id,
    v_alert_id,
    'Resolved in smoke test.',
    'alert-lifecycle-resolve',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_alert_events
    where id = v_alert_id
      and status = 'resolved'
  ) then
    raise exception 'alert event was not resolved';
  end if;
end $$;
