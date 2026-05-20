do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_customer_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_room_id uuid;
  v_room_key text;
  v_artifact_key text;
  v_artifact_id uuid;
  v_session jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'viewer-private-room-admin@example.com',
    'Viewer Private Room Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'viewer private room bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Viewer Private Corp',
    'viewerprivate.example.com',
    null,
    'Viewer Private Room',
    'Viewer private room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'viewer-private-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'viewer-private-customer@example.com',
    'Viewer Private Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Viewer Private Corp',
    'viewerprivate.example.com',
    'viewer-private-room-invite',
    '{"test": true}'::jsonb
  );

  v_artifact_id := add_admin_security_private_trust_room_artifact(
    v_admin_auth_user_id,
    v_room_id,
    'security_document',
    'other',
    gen_random_uuid(),
    'viewer-private-source',
    'Private Viewer Artifact',
    'Private viewer artifact.',
    'customer_confidential',
    true,
    true,
    false,
    repeat('c', 64),
    'HMAC-SHA256',
    'test-key',
    repeat('d', 64),
    now(),
    now() + interval '30 days',
    1,
    'viewer-private-artifact',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'viewer-private-room-publish',
    '{"test": true}'::jsonb
  );

  select artifact_key into v_artifact_key
  from admin_security_private_trust_room_artifacts
  where id = v_artifact_id;

  v_session := create_private_room_artifact_viewer_session(
    v_customer_auth_user_id,
    v_room_key,
    v_artifact_key,
    null,
    'smoke-test',
    'viewer-private-session',
    '{"test": true}'::jsonb
  );

  if (v_session->>'viewerToken') is null then
    raise exception 'private room viewer session did not return token';
  end if;
end $$;
