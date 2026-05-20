do $$
declare
  v_channel_id uuid;
  v_delivery_id uuid;
  v_claimed_id uuid;
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
    'smoke_claim_channel',
    'webhook',
    'active',
    'Smoke Claim Channel',
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
    where channel_key = 'smoke_claim_channel';
  end if;

  insert into admin_security_notification_deliveries (
    channel_id,
    source_type,
    source_id,
    event_key,
    severity,
    status,
    payload,
    destination_snapshot,
    metadata
  )
  values (
    v_channel_id,
    'admin_security_alert_event',
    gen_random_uuid(),
    'smoke_claim_event',
    'critical',
    'pending',
    '{"test": true}'::jsonb,
    'https://example.com/security',
    '{"test": true}'::jsonb
  )
  returning id into v_delivery_id;

  select delivery_id
  into v_claimed_id
  from claim_admin_security_notification_deliveries(
    10,
    'smoke-worker',
    '{"test": true}'::jsonb
  )
  where delivery_id = v_delivery_id;

  if v_claimed_id is null then
    raise exception 'notification delivery was not claimed';
  end if;

  perform mark_admin_security_notification_delivery_sent(
    v_delivery_id,
    '{"status": 200}'::jsonb,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_notification_deliveries
    where id = v_delivery_id
      and status = 'sent'
      and sent_at is not null
  ) then
    raise exception 'notification delivery was not marked sent';
  end if;
end $$;
