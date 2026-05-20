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
    'answer-private-room-admin@example.com',
    'Answer Private Room Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'answer private room bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Answer Private Corp',
    'answerprivate.example.com',
    null,
    'Answer Private Room',
    'Answer private room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'answer-private-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'answer-private-customer@example.com',
    'Answer Private Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Answer Private Corp',
    'answerprivate.example.com',
    'answer-private-room-invite',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'answer-private-room-publish',
    '{"test": true}'::jsonb
  );

  v_session := create_private_room_evidence_answer_session(
    v_customer_auth_user_id,
    v_room_key,
    null,
    'smoke-test',
    'answer-private-session',
    '{"test": true}'::jsonb
  );

  if (v_session->>'answerToken') is null then
    raise exception 'private room answer session did not return token';
  end if;
end $$;
