do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_customer_auth_user_id uuid := gen_random_uuid();
  v_room_id uuid;
  v_room_key text;
  v_artifact_id uuid;
  v_grant jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'download-private-room-admin@example.com',
    'Download Private Room Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'download private room bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Download Private Corp',
    'downloadprivate.example.com',
    null,
    'Download Private Room',
    'Download private room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'download-private-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'download-private-customer@example.com',
    'Download Private Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Download Private Corp',
    'downloadprivate.example.com',
    'download-private-room-invite',
    '{"test": true}'::jsonb
  );

  v_artifact_id := add_admin_security_private_trust_room_artifact(
    v_admin_auth_user_id,
    v_room_id,
    'security_document',
    'other',
    gen_random_uuid(),
    'download-private-source',
    'Private Download Artifact',
    'Private download artifact.',
    'customer_confidential',
    true,
    true,
    false,
    repeat('d', 64),
    'HMAC-SHA256',
    'test-key',
    repeat('e', 64),
    now(),
    now() + interval '30 days',
    1,
    'download-private-artifact',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'download-private-room-publish',
    '{"test": true}'::jsonb
  );

  v_grant := create_private_room_artifact_download_grant(
    v_customer_auth_user_id,
    v_room_key,
    (
      select artifact_key
      from admin_security_private_trust_room_artifacts
      where id = v_artifact_id
    ),
    null,
    'smoke-test',
    'download-private-grant',
    '{"test": true}'::jsonb
  );

  if (v_grant->>'downloadToken') is null then
    raise exception 'private room download grant did not return token';
  end if;
end $$;
