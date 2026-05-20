do $$
begin
  update admin_security_alert_delivery_channels
  set
    provider_key = 'email',
    status = 'active',
    target = 'security@example.com',
    min_severity = 'critical'
  where channel_key = 'email_security_critical_stub';

  if not exists (
    select 1
    from admin_security_alert_delivery_channels
    where channel_key = 'email_security_critical_stub'
      and provider_key = 'email'
      and channel_type = 'email'
      and status = 'active'
  ) then
    raise exception 'email alert delivery channel is not configured for email adapter';
  end if;
end $$;
