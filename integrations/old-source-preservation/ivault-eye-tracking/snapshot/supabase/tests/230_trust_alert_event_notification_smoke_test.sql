do $$
declare
  v_recipient_id uuid;
  v_alert_id uuid;
  v_result jsonb;
begin
  insert into admin_security_trust_alert_recipients (
    alert_recipient_key,
    status,
    recipient_type,
    team_key,
    recipient_name,
    recipient_email,
    severity_floor,
    allow_email,
    allow_in_app,
    enabled,
    metadata
  )
  values (
    'trust-alert-recipient:smoke-trust-team',
    'active',
    'team',
    'trust',
    'Smoke Trust Team',
    'trust-smoke@example.com',
    'medium',
    true,
    true,
    true,
    '{"test": true}'::jsonb
  )
  on conflict (alert_recipient_key)
  do update set
    status = 'active',
    enabled = true,
    updated_at = now()
  returning id into v_recipient_id;

  v_alert_id := create_admin_security_trust_alert_event(
    'manual',
    'smoke_alert',
    'critical',
    'critical',
    'Smoke critical trust alert',
    'Smoke critical trust alert summary.',
    'Alert Corp',
    'alert.example.com',
    'smoke',
    gen_random_uuid(),
    'smoke-alert-source',
    null,
    null,
    null,
    null,
    null,
    null,
    'smoke-alert-dedupe',
    '{"test": true}'::jsonb,
    'alert-smoke',
    '{"test": true}'::jsonb
  );

  v_result := build_admin_security_trust_alert_notifications(
    500,
    'alert-smoke-worker',
    'alert-build',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_alert_notifications
    where alert_event_id = v_alert_id
      and status = 'pending'
  ) then
    raise exception 'alert notification missing';
  end if;
end $$;
