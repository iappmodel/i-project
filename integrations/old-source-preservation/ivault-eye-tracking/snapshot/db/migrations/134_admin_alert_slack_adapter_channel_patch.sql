-- Step 9.16 — move seeded Slack channel onto the Slack adapter boundary.
update admin_security_alert_delivery_channels
set
  provider_key = 'slack',
  target = 'security_alerts',
  status = 'paused',
  metadata = metadata || jsonb_build_object(
    'provider_boundary',
    'typescript_slack_adapter',
    'target_type',
    'server_side_channel_key'
  ),
  updated_at = now()
where channel_key = 'slack_security_high_stub';
