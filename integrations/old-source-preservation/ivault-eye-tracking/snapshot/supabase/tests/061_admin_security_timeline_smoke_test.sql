do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'security-timeline@example.com',
    'Security Timeline',
    'active',
    '{"test": true}'::jsonb
  );

  v_alert_id := create_admin_security_alert(
    'security_timeline_smoke_alert',
    'high',
    v_admin_auth_user_id,
    v_admin_auth_user_id,
    'security_timeline_action',
    null,
    'Security timeline smoke alert.',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_timeline
    where event_type = 'security_alert'
      and event_id = v_alert_id
      and event_key = 'security_timeline_smoke_alert'
  ) then
    raise exception 'security alert missing from security timeline';
  end if;
end $$;
