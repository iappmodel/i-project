do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_customer_auth_user_id uuid := gen_random_uuid();
  v_room_id uuid;
  v_room_key text;
  v_subscription_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'proof-digest-admin@example.com',
    'Proof Digest Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'proof digest bootstrap'
  );

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Digest Corp',
    'digest.example.com',
    null,
    'Digest Room',
    'Digest room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'digest-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'digest-customer@example.com',
    'Digest Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Digest Corp',
    'digest.example.com',
    'digest-room-invite',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'digest-room-publish',
    '{"test": true}'::jsonb
  );

  v_subscription_id := upsert_private_room_proof_digest_subscription(
    v_customer_auth_user_id,
    v_room_key,
    'digest-customer@example.com',
    'Digest Customer',
    'daily',
    'email',
    'UTC',
    'digest-subscription-create',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_proof_digest_subscriptions
    where id = v_subscription_id
      and private_room_id = v_room_id
      and status = 'active'
  ) then
    raise exception 'private room proof digest subscription was not created';
  end if;
end $$;
