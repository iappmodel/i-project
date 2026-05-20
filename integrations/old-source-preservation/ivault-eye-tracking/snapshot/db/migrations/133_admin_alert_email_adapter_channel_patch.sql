-- Step 9.15 — move seeded email channel onto the email adapter boundary.
update admin_security_alert_delivery_channels
set
  provider_key = 'email',
  metadata = metadata || jsonb_build_object(
    'provider_boundary',
    'typescript_email_adapter'
  ),
  updated_at = now()
where channel_key = 'email_security_critical_stub';
