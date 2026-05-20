do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_customer_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_room_id uuid;
  v_room_key text;
  v_session jsonb;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'search-private-room-admin@example.com',
    'Search Private Room Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'search private room bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Search Private Corp',
    'searchprivate.example.com',
    null,
    'Search Private Room',
    'Search private room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'search-private-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'search-private-customer@example.com',
    'Search Private Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Search Private Corp',
    'searchprivate.example.com',
    'search-private-room-invite',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'search-private-room-publish',
    '{"test": true}'::jsonb
  );

  v_session := create_private_room_artifact_search_session(
    v_customer_auth_user_id,
    v_room_key,
    null,
    'smoke-test',
    'search-private-session',
    '{"test": true}'::jsonb
  );

  if (v_session->>'searchToken') is null then
    raise exception 'private room search session did not return token';
  end if;
end $$;
