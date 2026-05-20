do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_subscriber_id uuid;
  v_event_id uuid;
  v_source_id uuid := gen_random_uuid();
  v_delivery_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'trust-delivery-admin@example.com',
    'Trust Delivery Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(v_admin_auth_user_id, 'super_admin', null, 'trust delivery bootstrap');

  v_subscriber_id := create_admin_security_trust_notification_subscriber(
    v_admin_auth_user_id,
    'customer_security',
    'trust-delivery@example.com',
    'Trust Delivery',
    null,
    'Delivery Corp',
    'delivery.example.com',
    'Delivery Corp',
    'delivery.example.com',
    null,
    null,
    null,
    'email',
    'trust-delivery-subscriber',
    '{"test": true}'::jsonb
  );

  v_event_id := create_admin_security_trust_notification_event(
    'trust_timeline_updates',
    'trust_center_update',
    'notice',
    'customer_scoped',
    'other',
    v_source_id,
    'Delivery update',
    'A delivery update was published.',
    'A delivery update was published.',
    'delivery-update',
    'Delivery Corp',
    'delivery.example.com',
    null,
    null,
    null,
    true,
    'trust-delivery-event',
    '{"test": true}'::jsonb
  );

  perform fanout_admin_security_trust_notification_event(
    v_event_id,
    'trust-delivery-worker',
    '{"test": true}'::jsonb
  );

  select delivery_id
  into v_delivery_id
  from claim_admin_security_trust_notification_deliveries(
    10,
    'trust-delivery-worker',
    '{"test": true}'::jsonb
  )
  limit 1;

  if v_delivery_id is null then
    raise exception 'delivery was not claimed';
  end if;

  perform complete_admin_security_trust_notification_delivery(
    v_delivery_id,
    'smoke-provider',
    'provider-message-123',
    'trust-delivery-worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_trust_notification_deliveries
    where id = v_delivery_id
      and status = 'sent'
      and provider_message_id = 'provider-message-123'
  ) then
    raise exception 'delivery was not completed';
  end if;
end $$;
