do $$
begin
  insert into admin_security_alert_delivery_channels (
    channel_key,
    channel_type,
    status,
    display_name,
    target,
    provider_key,
    min_severity,
    metadata
  )
  values (
    'webhook_security_critical_stub',
    'webhook',
    'paused',
    'Security Webhook Critical Stub',
    'https://hooks.yourdomain.com/i/admin-security-alerts',
    'generic_webhook',
    'critical',
    '{"test": true}'::jsonb
  )
  on conflict (channel_key)
  do update set
    channel_type = excluded.channel_type,
    status = excluded.status,
    display_name = excluded.display_name,
    target = excluded.target,
    provider_key = excluded.provider_key,
    min_severity = excluded.min_severity,
    metadata = admin_security_alert_delivery_channels.metadata || excluded.metadata,
    updated_at = now();

  if not exists (
    select 1
    from admin_security_alert_delivery_channels
    where channel_key = 'webhook_security_critical_stub'
      and channel_type = 'webhook'
      and provider_key = 'generic_webhook'
      and status = 'paused'
  ) then
    raise exception 'webhook alert delivery channel is not correctly configured';
  end if;
end $$;
