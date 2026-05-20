do $$
begin
  update admin_security_alert_delivery_channels
  set
    provider_key = 'slack',
    target = 'security_alerts',
    status = 'paused',
    min_severity = 'high'
  where channel_key = 'slack_security_high_stub';

  if not exists (
    select 1
    from admin_security_alert_delivery_channels
    where channel_key = 'slack_security_high_stub'
      and provider_key = 'slack'
      and channel_type = 'slack'
      and target = 'security_alerts'
  ) then
    raise exception 'slack alert delivery channel is not configured for slack adapter';
  end if;
end $$;
