do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_channel_id uuid;
  v_delivery_id uuid;
  v_manifest_id uuid;
  v_hold_id uuid;
  v_challenge_id uuid;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'legal-hold-record@example.com',
    'Legal Hold Record',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'legal hold record bootstrap'
  );

  insert into admin_mfa_factors (
    admin_auth_user_id,
    admin_user_id,
    factor_type,
    provider,
    status,
    label,
    secret_ciphertext,
    secret_key_version,
    confirmed_at,
    metadata
  )
  values (
    v_admin_auth_user_id,
    v_admin_user_id,
    'totp',
    'totp',
    'active',
    'Legal Hold Record Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

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
    'legal-hold-record-channel',
    'webhook',
    'active',
    'Legal Hold Record Channel',
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
    where channel_key = 'legal-hold-record-channel';
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
    'legal_hold_record_delivery',
    'critical',
    'sent',
    '{"test": true}'::jsonb,
    'https://example.com/security',
    now() - interval '500 days',
    '{"test": true}'::jsonb
  )
  returning id into v_delivery_id;

  v_manifest_id := create_admin_security_archive_manifest(
    'admin_security_notification_delivery',
    now() - interval '600 days',
    now() - interval '400 days',
    'external_archive_stub',
    's3://example/security/legal-hold-record.json',
    repeat('a', 64),
    null,
    'legal-hold-record-manifest',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_manifests
  set status = 'verified',
      sealed_at = now(),
      verified_at = now()
  where id = v_manifest_id;

  if not exists (
    select 1
    from admin_security_deletion_candidates
    where source_type = 'admin_security_notification_delivery'
      and source_id = v_delivery_id
  ) then
    raise exception 'record should be deletion candidate before legal hold';
  end if;

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'legal-hold-record-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'legal-hold-record-mfa',
    '{"test": true}'::jsonb
  );

  v_hold_id := create_admin_security_legal_hold(
    v_admin_auth_user_id,
    'legal_hold_record_smoke',
    'investigation',
    'Record hold smoke',
    'Hold one notification delivery.',
    'security',
    'INV-001',
    now() - interval '1 day',
    null,
    'legal-hold-record-create',
    '{"test": true}'::jsonb
  );

  perform add_admin_security_legal_hold_target(
    v_admin_auth_user_id,
    v_hold_id,
    'source_record',
    'admin_security_notification_delivery',
    v_delivery_id,
    null,
    null,
    null,
    null,
    'legal-hold-record-target',
    '{"test": true}'::jsonb
  );

  if exists (
    select 1
    from admin_security_deletion_candidates
    where source_type = 'admin_security_notification_delivery'
      and source_id = v_delivery_id
  ) then
    raise exception 'record should not be deletion candidate under legal hold';
  end if;
end $$;
