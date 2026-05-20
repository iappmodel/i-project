do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_subscriber_id uuid;
  v_event_id uuid;
  v_source_id uuid := gen_random_uuid();
  v_count integer;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'trust-notification-admin@example.com',
    'Trust Notification Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'trust notification bootstrap');

  v_subscriber_id := create_admin_security_trust_notification_subscriber(
    v_admin_auth_user_id,
    'customer_security',
    'trust-subscriber@example.com',
    'Trust Subscriber',
    null,
    'Trust Corp',
    'trust.example.com',
    'Trust Corp',
    'trust.example.com',
    null,
    null,
    null,
    'email',
    'trust-subscriber-create',
    '{"test": true}'::jsonb
  );

  v_event_id := create_admin_security_trust_notification_event(
    'trust_timeline_updates',
    'trust_center_update',
    'notice',
    'customer_scoped',
    'other',
    v_source_id,
    'Trust update',
    'A trust update was published.',
    'A trust update was published.',
    'trust-update',
    'Trust Corp',
    'trust.example.com',
    null,
    null,
    null,
    true,
    'trust-event-create',
    '{"test": true}'::jsonb
  );

  v_count := fanout_admin_security_trust_notification_event(
    v_event_id,
    'trust-notification-worker',
    '{"test": true}'::jsonb
  );

  if v_count <> 1 then
    raise exception 'expected one fanout recipient, got %', v_count;
  end if;

  if not exists (
    select 1
    from admin_security_trust_notification_deliveries
    where notification_event_id = v_event_id
      and subscriber_id = v_subscriber_id
      and status = 'pending'
  ) then
    raise exception 'trust notification delivery was not created';
  end if;
end $$;
