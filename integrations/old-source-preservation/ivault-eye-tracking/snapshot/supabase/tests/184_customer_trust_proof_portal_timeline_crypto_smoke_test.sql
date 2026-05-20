do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_customer_auth_user_id uuid := gen_random_uuid();
  v_source_id uuid := gen_random_uuid();
  v_room_id uuid;
  v_room_key text;
  v_event_id uuid;
  v_portal_session jsonb;
  v_portal_token text;
  v_timeline jsonb;
  v_crypto jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'proof-portal-crypto-admin@example.com',
    'Proof Portal Crypto Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'proof portal crypto bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Proof Crypto Corp',
    'proofcrypto.example.com',
    null,
    'Proof Crypto Room',
    'Proof crypto room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'proof-crypto-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'proof-crypto-customer@example.com',
    'Proof Crypto Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Proof Crypto Corp',
    'proofcrypto.example.com',
    'proof-crypto-room-invite',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'proof-crypto-room-publish',
    '{"test": true}'::jsonb
  );

  v_event_id := record_admin_security_trust_timeline_event(
    'private_trust_room',
    v_room_id,
    v_room_key,
    'room',
    'proof_portal_crypto_smoke',
    'created',
    'other',
    v_source_id,
    'proof-crypto-source',
    'Proof Crypto Timeline Event',
    'Proof crypto timeline smoke test.',
    'system',
    null,
    null,
    null,
    null,
    'Proof Crypto Corp',
    'proofcrypto.example.com',
    v_room_id,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'info',
    'private_room_scoped',
    'customer_confidential',
    null,
    'smoke-test',
    'proof-crypto-event',
    '{"test": true}'::jsonb
  );

  perform chain_admin_security_trust_timeline_event(
    v_event_id,
    'proof-crypto-worker',
    '{"test": true}'::jsonb
  );

  v_portal_session := create_private_room_customer_trust_proof_portal_session(
    v_customer_auth_user_id,
    v_room_key,
    null,
    'smoke-test',
    'proof-crypto-session',
    '{"test": true}'::jsonb
  );

  v_portal_token := v_portal_session->>'portalToken';

  v_timeline := list_customer_trust_proof_portal_timeline_events(
    v_portal_token,
    v_customer_auth_user_id,
    50,
    'proof-crypto-timeline'
  );

  if jsonb_array_length(v_timeline->'items') < 1 then
    raise exception 'expected at least one portal timeline event';
  end if;

  v_crypto := get_customer_trust_proof_portal_crypto_status(
    v_portal_token,
    v_customer_auth_user_id,
    'proof-crypto-status'
  );

  if v_crypto->'chain'->>'lastChainHashSha256' is null then
    raise exception 'expected crypto chain hash';
  end if;
end $$;
