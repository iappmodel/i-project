do $$
declare
  v_channel_id uuid;
  v_delivery_id uuid;
  v_manifest_id uuid;
begin
  insert into admin_security_notification_channels (
    channel_key,
    channel_type,
    status,
    display_name,
    destination,
    min_severity,
    metadata
  )
  values (
    'deletion-candidate-smoke-channel',
    'webhook',
    'active',
    'Deletion Candidate Smoke Channel',
    'https://example.com/security',
    'critical',
    '{"test": true}'::jsonb
  )
  on conflict (channel_key)
  do update set status = 'active'
  returning id into v_channel_id;

  if v_channel_id is null then
    select id into v_channel_id
    from admin_security_notification_channels
    where channel_key = 'deletion-candidate-smoke-channel';
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
    created_at,
    metadata
  )
  values (
    v_channel_id,
    'admin_security_alert_event',
    gen_random_uuid(),
    'old_delivery',
    'critical',
    'sent',
    '{"test": true}'::jsonb,
    'https://example.com/security',
    now() - interval '400 days',
    '{"test": true}'::jsonb
  )
  returning id into v_delivery_id;

  if exists (
    select 1
    from admin_security_deletion_candidates
    where source_type = 'admin_security_notification_delivery'
      and source_id = v_delivery_id
  ) then
    raise exception 'delivery should not be deletion candidate before sealed archive';
  end if;

  v_manifest_id := create_admin_security_archive_manifest(
    'admin_security_notification_delivery',
    now() - interval '500 days',
    now() - interval '300 days',
    'external_archive_stub',
    null,
    null,
    null,
    'deletion-candidate-manifest',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_manifests
  set
    status = 'sealed',
    storage_uri = 's3://example/security/delivery-archive.json',
    checksum_sha256 = repeat('b', 64),
    sealed_at = now()
  where id = v_manifest_id;

  if not exists (
    select 1
    from admin_security_deletion_candidates
    where source_type = 'admin_security_notification_delivery'
      and source_id = v_delivery_id
  ) then
    raise exception 'delivery should be deletion candidate after sealed archive';
  end if;
end $$;
