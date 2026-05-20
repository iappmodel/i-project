do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_customer_auth_user_id uuid := gen_random_uuid();
  v_room_id uuid;
  v_room_key text;
  v_portal_session jsonb;
  v_portal_token text;
  v_dashboard jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'proof-portal-admin@example.com',
    'Proof Portal Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'proof portal bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Proof Portal Corp',
    'proofportal.example.com',
    null,
    'Proof Portal Room',
    'Proof portal room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'proof-portal-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'proof-customer@example.com',
    'Proof Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Proof Portal Corp',
    'proofportal.example.com',
    'proof-portal-room-invite',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'proof-portal-room-publish',
    '{"test": true}'::jsonb
  );

  v_portal_session := create_private_room_customer_trust_proof_portal_session(
    v_customer_auth_user_id,
    v_room_key,
    null,
    'smoke-test',
    'proof-portal-session',
    '{"test": true}'::jsonb
  );

  v_portal_token := v_portal_session->>'portalToken';

  v_dashboard := get_customer_trust_proof_portal_dashboard(
    v_portal_token,
    v_customer_auth_user_id,
    'proof-portal-dashboard'
  );

  if v_dashboard->'portal'->>'portalKey' is null then
    raise exception 'proof portal dashboard missing portal key';
  end if;

  if v_dashboard->'privateRoom'->>'privateRoomKey' <> v_room_key then
    raise exception 'proof portal dashboard room mismatch';
  end if;
end $$;
