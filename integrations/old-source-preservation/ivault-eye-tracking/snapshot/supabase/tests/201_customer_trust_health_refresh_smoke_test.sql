do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_room_id uuid;
  v_result jsonb;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'customer-health-admin@example.com',
    'Customer Health Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'customer health bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Health Corp',
    'health.example.com',
    null,
    'Health Room',
    'Health room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'health-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'health-room-publish',
    '{"test": true}'::jsonb
  );

  v_result := refresh_admin_security_customer_trust_health(
    500,
    'health-worker',
    '{"test": true}'::jsonb
  );

  if (v_result->>'processed')::integer < 1 then
    raise exception 'expected customer health refresh to process rooms';
  end if;

  if not exists (
    select 1
    from admin_security_customer_trust_health
    where private_room_id = v_room_id
      and status = 'active'
  ) then
    raise exception 'customer trust health was not created';
  end if;
end $$;
