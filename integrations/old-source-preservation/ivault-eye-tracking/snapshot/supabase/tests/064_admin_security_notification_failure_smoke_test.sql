do $$
declare
  v_channel_id uuid;
  v_delivery_id uuid;
begin
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
    'smoke_failure_channel',
    'webhook',
    'active',
    'Smoke Failure Channel',
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
    where channel_key = 'smoke_failure_channel';
  end if;

  insert into admin_security_notification_deliveries (
    channel_id,
    source_type,
    source_id,
    event_key,
    severity,
    status,
    attempt_count,
    max_attempts,
    payload,
    destination_snapshot,
    metadata
  )
  values (
    v_channel_id,
    'admin_security_alert_event',
    gen_random_uuid(),
    'smoke_failure_event',
    'critical',
    'sending',
    5,
    5,
    '{"test": true}'::jsonb,
    'https://example.com/security',
    '{"test": true}'::jsonb
  )
  returning id into v_delivery_id;

  perform mark_admin_security_notification_delivery_failed(
    v_delivery_id,
    'provider unavailable',
    60,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_notification_deliveries
    where id = v_delivery_id
      and status = 'abandoned'
      and last_error = 'provider unavailable'
  ) then
    raise exception 'notification delivery was not abandoned after max attempts';
  end if;
end $$;
