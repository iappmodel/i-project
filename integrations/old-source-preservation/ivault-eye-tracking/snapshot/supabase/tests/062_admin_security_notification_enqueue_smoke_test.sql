do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
  v_channel_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'notification-enqueue-admin@example.com',
    'Notification Enqueue Admin',
    'active',
    '{"test": true}'::jsonb
  );

  insert into admin_security_notification_channels (
    channel_key,
    channel_type,
    status,
    display_name,
    destination,
    secret_ref,
    min_severity,
    metadata
  )
  values (
    'smoke_notification_channel',
    'webhook',
    'active',
    'Smoke Notification Channel',
    'https://example.com/security',
    'SMOKE_SECURITY_WEBHOOK_SECRET',
    'critical',
    '{"test": true}'::jsonb
  )
  on conflict (channel_key)
  do update set status = 'active'
  returning id into v_channel_id;

  if v_channel_id is null then
    select id into v_channel_id
    from admin_security_notification_channels
    where channel_key = 'smoke_notification_channel';
  end if;

  insert into admin_security_notification_rules (
    rule_key,
    status,
    channel_id,
    source_type,
    min_severity,
    metadata
  )
  values (
    'smoke_notification_rule',
    'active',
    v_channel_id,
    'any',
    'critical',
    '{"test": true}'::jsonb
  )
  on conflict (rule_key)
  do update set status = 'active';

  v_alert_id := create_admin_security_alert(
    'smoke_notification_critical_alert',
    'critical',
    v_admin_auth_user_id,
    v_admin_auth_user_id,
    'smoke_notification_action',
    null,
    'Smoke notification critical alert.',
    '{"test": true}'::jsonb
  );

  perform enqueue_notifications_from_security_alerts(
    500,
    '{"test": true, "scope": "notification_enqueue"}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_notification_deliveries
    where source_type = 'admin_security_alert_event'
      and source_id = v_alert_id
      and event_key = 'smoke_notification_critical_alert'
      and status = 'pending'
  ) then
    raise exception 'notification delivery was not enqueued';
  end if;
end $$;
