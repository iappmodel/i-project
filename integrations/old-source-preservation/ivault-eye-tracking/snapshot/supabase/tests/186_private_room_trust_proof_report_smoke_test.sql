do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_customer_auth_user_id uuid := gen_random_uuid();
  v_room_id uuid;
  v_room_key text;
  v_report_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'private-report-admin@example.com',
    'Private Report Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'private report bootstrap');

  v_room_id := create_admin_security_private_trust_room(
    v_admin_auth_user_id,
    'customer_security_review',
    'Private Report Corp',
    'privatereport.example.com',
    null,
    'Private Report Room',
    'Private report room.',
    now(),
    now() + interval '30 days',
    true,
    true,
    true,
    true,
    false,
    false,
    25,
    'private-report-room-create',
    '{"test": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  select private_room_key into v_room_key
  from admin_security_private_trust_rooms
  where id = v_room_id;

  perform invite_admin_security_private_trust_room_participant(
    v_admin_auth_user_id,
    v_room_id,
    'private-report-customer@example.com',
    'Private Report Customer',
    'security_reviewer',
    v_customer_auth_user_id,
    'Private Report Corp',
    'privatereport.example.com',
    'private-report-room-invite',
    '{"test": true}'::jsonb
  );

  perform publish_admin_security_private_trust_room(
    v_admin_auth_user_id,
    v_room_id,
    'ready',
    'private-report-room-publish',
    '{"test": true}'::jsonb
  );

  v_report_id := create_private_room_trust_proof_report(
    v_customer_auth_user_id,
    v_room_key,
    'html',
    now() - interval '1 day',
    now() + interval '1 day',
    'private-report-create',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_proof_reports
    where id = v_report_id
      and report_scope = 'private_room'
      and private_room_id = v_room_id
      and status = 'pending'
  ) then
    raise exception 'private room trust proof report was not created';
  end if;
end $$;
