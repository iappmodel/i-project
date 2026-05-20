do $$
declare
  v_alert_id uuid;
  v_notification_id uuid;
  v_attempt_id uuid;
begin
  v_alert_id := create_admin_security_trust_alert_event(
    'manual',
    'notification_result_smoke',
    'high',
    'high',
    'Notification result smoke alert',
    'Notification result smoke alert summary.',
    'Notification Corp',
    'notification.example.com',
    'smoke',
    gen_random_uuid(),
    'notification-result-source',
    null,
    null,
    null,
    null,
    null,
    null,
    'notification-result-dedupe',
    '{}'::jsonb,
    'notification-result-alert',
    '{"test": true}'::jsonb
  );

  insert into admin_security_trust_alert_notifications (
    alert_notification_key,
    status,
    alert_event_id,
    channel_type,
    recipient_name,
    recipient_address,
    title,
    body,
    severity,
    alert_priority,
    idempotency_key
  )
  values (
    'trust-alert-notification-result-smoke',
    'attempting',
    v_alert_id,
    'in_app',
    'Smoke Recipient',
    'smoke',
    'Smoke notification',
    'Smoke notification body',
    'high',
    'high',
    'trust-alert-notification-result-smoke'
  )
  on conflict (idempotency_key)
  do update set status = 'attempting'
  returning id into v_notification_id;

  v_attempt_id := record_admin_security_trust_alert_notification_result(
    v_notification_id,
    true,
    200,
    '{"ok":true}',
    null,
    null,
    50,
    'alert-result-worker',
    'alert-result',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_alert_notifications
    where id = v_notification_id
      and status = 'delivered'
  ) then
    raise exception 'alert notification was not delivered';
  end if;
end $$;
