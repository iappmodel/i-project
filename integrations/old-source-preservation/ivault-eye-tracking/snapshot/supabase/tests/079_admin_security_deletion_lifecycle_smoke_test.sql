do $$
declare
  v_requester_auth_user_id uuid := gen_random_uuid();
  v_approver_auth_user_id uuid := gen_random_uuid();
  v_requester_admin_user_id uuid;
  v_approver_admin_user_id uuid;
  v_channel_id uuid;
  v_delivery_id uuid;
  v_manifest_id uuid;
  v_deletion_request_id uuid;
  v_challenge_id uuid;
begin
  v_requester_admin_user_id := upsert_admin_user(
    v_requester_auth_user_id,
    'deletion-requester@example.com',
    'Deletion Requester',
    'active',
    '{"test": true}'::jsonb
  );

  v_approver_admin_user_id := upsert_admin_user(
    v_approver_auth_user_id,
    'deletion-approver@example.com',
    'Deletion Approver',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_requester_auth_user_id,
    'super_admin',
    null,
    'deletion requester bootstrap'
  );

  perform assign_admin_role(
    v_approver_auth_user_id,
    'super_admin',
    null,
    'deletion approver bootstrap'
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
  values
    (
      v_requester_auth_user_id,
      v_requester_admin_user_id,
      'totp',
      'totp',
      'active',
      'Requester Factor',
      'v1.fake.fake.fake',
      'v1',
      now(),
      '{"test": true}'::jsonb
    ),
    (
      v_approver_auth_user_id,
      v_approver_admin_user_id,
      'totp',
      'totp',
      'active',
      'Approver Factor',
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
    'deletion-lifecycle-channel',
    'webhook',
    'active',
    'Deletion Lifecycle Channel',
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
    where channel_key = 'deletion-lifecycle-channel';
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
    'old_delivery_delete_me',
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
    's3://example/security/notification-deliveries.json',
    repeat('e', 64),
    null,
    'deletion-lifecycle-manifest',
    '{"test": true}'::jsonb
  );

  update admin_security_archive_manifests
  set status = 'verified',
      sealed_at = now(),
      verified_at = now()
  where id = v_manifest_id;

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'deletion-requester-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'deletion-requester-mfa',
    '{"test": true}'::jsonb
  );

  v_deletion_request_id := create_admin_security_deletion_request(
    v_requester_auth_user_id,
    'admin_security_notification_delivery',
    now() - interval '600 days',
    now() - interval '400 days',
    'delete old notification delivery after verified archive',
    'deletion-lifecycle-create',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_deletion_request_items
    where admin_security_deletion_request_id = v_deletion_request_id
      and source_id = v_delivery_id
      and status = 'pending'
  ) then
    raise exception 'deletion request item missing';
  end if;

  v_challenge_id := create_admin_mfa_challenge(
    v_approver_auth_user_id,
    'stub',
    'privileged_action',
    'deletion-approver-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_approver_auth_user_id,
    v_challenge_id,
    '000000',
    'deletion-approver-mfa',
    '{"test": true}'::jsonb
  );

  perform approve_admin_security_deletion_request(
    v_approver_auth_user_id,
    v_deletion_request_id,
    'approved old archived notification delivery deletion',
    'deletion-lifecycle-approve',
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_requester_auth_user_id,
    'stub',
    'privileged_action',
    'deletion-execute-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_requester_auth_user_id,
    v_challenge_id,
    '000000',
    'deletion-execute-mfa',
    '{"test": true}'::jsonb
  );

  perform execute_admin_security_deletion_request(
    v_requester_auth_user_id,
    v_deletion_request_id,
    'deletion-lifecycle-execute',
    '{"test": true}'::jsonb
  );

  if exists (
    select 1
    from admin_security_notification_deliveries
    where id = v_delivery_id
  ) then
    raise exception 'notification delivery was not deleted';
  end if;

  if not exists (
    select 1
    from admin_security_deletion_requests
    where id = v_deletion_request_id
      and status = 'executed'
      and deleted_record_count = 1
  ) then
    raise exception 'deletion request was not marked executed';
  end if;
end $$;
