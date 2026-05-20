do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'alert-dismiss-admin@example.com',
    'Alert Dismiss Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'alert dismiss smoke bootstrap'
  );

  v_alert_id := create_admin_security_alert(
    'smoke_alert_dismiss',
    'medium',
    v_admin_auth_user_id,
    null,
    'smoke_action',
    null,
    'Smoke dismiss alert.',
    '{"test": true}'::jsonb
  );

  perform dismiss_admin_security_alert(
    v_admin_auth_user_id,
    v_alert_id,
    'duplicate smoke alert',
    'smoke-alert-dismiss',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_events
    where id = v_alert_id
      and status = 'dismissed'
      and resolved_by_auth_user_id = v_admin_auth_user_id
      and resolved_at is not null
      and resolution_note = 'duplicate smoke alert'
  ) then
    raise exception 'alert was not dismissed';
  end if;
end $$;
