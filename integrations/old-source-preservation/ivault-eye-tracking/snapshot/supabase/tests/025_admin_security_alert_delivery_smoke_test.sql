do $$
declare
  v_actor_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_actor_auth_user_id,
    'alert-delivery-admin@example.com',
    'Alert Delivery Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_actor_auth_user_id,
    'super_admin',
    null,
    'alert delivery smoke bootstrap'
  );

  v_alert_id := create_admin_security_alert(
    'smoke_security_alert_delivery',
    'critical',
    v_actor_auth_user_id,
    null,
    'smoke_action',
    null,
    'Smoke critical admin security alert.',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_deliveries
    where admin_security_alert_event_id = v_alert_id
      and status = 'queued'
  ) then
    raise exception 'security alert delivery was not queued';
  end if;

  perform run_admin_security_alert_delivery_job(
    500,
    'smoke_alert_delivery_worker',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_deliveries
    where admin_security_alert_event_id = v_alert_id
      and status = 'delivered'
  ) then
    raise exception 'security alert delivery was not delivered';
  end if;

  perform run_audit_hash_backfill_job(
    1000,
    '{"test": true, "scope": "admin_security_alert_delivery"}'::jsonb
  );

  if exists (
    select 1
    from audit_hash_missing_records
    where source_type = 'admin_security_alert_delivery'
  ) then
    raise exception 'admin security alert delivery hash missing';
  end if;
end $$;
