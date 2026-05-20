do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'security-center-alert@example.com',
    'Security Center Alert',
    'active',
    '{"test": true}'::jsonb
  );

  v_alert_id := create_admin_security_alert(
    'security_center_smoke_critical_alert',
    'critical',
    v_admin_auth_user_id,
    v_admin_auth_user_id,
    'security_center_smoke_action',
    null,
    'Security center smoke critical alert.',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_priority_queue
    where item_type = 'security_alert'
      and item_id = v_alert_id
      and reason_code = 'open_critical_alert'
      and priority_score = 900
  ) then
    raise exception 'critical alert missing from security priority queue';
  end if;
end $$;
