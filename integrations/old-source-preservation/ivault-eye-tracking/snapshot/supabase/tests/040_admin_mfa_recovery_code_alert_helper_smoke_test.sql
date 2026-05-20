do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_alert_id uuid;
begin
  perform upsert_admin_user(
    v_admin_auth_user_id,
    'recovery-alert-admin@example.com',
    'Recovery Alert Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'recovery alert smoke bootstrap'
  );

  v_alert_id := create_admin_mfa_recovery_code_security_alert(
    v_admin_auth_user_id,
    'smoke_recovery_code_alert',
    'high',
    'smoke_recovery_action',
    'Smoke recovery-code security alert.',
    'smoke-recovery-alert',
    '{"test": true}'::jsonb
  );

  if not exists (
    select 1
    from admin_security_alert_events
    where id = v_alert_id
      and alert_key = 'smoke_recovery_code_alert'
      and severity = 'high'
      and actor_auth_user_id = v_admin_auth_user_id
      and target_auth_user_id = v_admin_auth_user_id
      and metadata->>'mfa_event_type' = 'recovery_code'
  ) then
    raise exception 'recovery-code security alert was not created correctly';
  end if;
end $$;
