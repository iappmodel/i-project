do $$
declare
  v_actor_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
  v_delivery_id uuid;
begin
  perform upsert_admin_user(
    v_actor_auth_user_id,
    'provider-boundary-admin@example.com',
    'Provider Boundary Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_actor_auth_user_id,
    'super_admin',
    null,
    'provider boundary smoke bootstrap'
  );

  v_alert_id := create_admin_security_alert(
    'smoke_provider_boundary_alert',
    'critical',
    v_actor_auth_user_id,
    null,
    'smoke_action',
    null,
    'Smoke provider boundary alert.',
    '{"test": true}'::jsonb
  );

  select id
  into v_delivery_id
  from claim_admin_security_alert_deliveries(
    1,
    'smoke_provider_boundary_worker',
    300,
    '{"test": true}'::jsonb
  )
  limit 1;

  if v_delivery_id is null then
    raise exception 'delivery was not claimed';
  end if;

  perform mark_admin_security_alert_delivery_delivered(
    v_delivery_id,
    '{"provider": "smoke", "success": true}'::jsonb,
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_deliveries
    where id = v_delivery_id
      and status = 'delivered'
      and delivered_at is not null
  ) then
    raise exception 'delivery was not marked delivered';
  end if;
end $$;
