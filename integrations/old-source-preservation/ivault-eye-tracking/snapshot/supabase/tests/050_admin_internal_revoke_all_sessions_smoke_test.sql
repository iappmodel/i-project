do $$
declare
  v_target_auth_user_id uuid := gen_random_uuid();
  v_target_user_id uuid;
  v_count integer;
begin
  v_target_user_id := upsert_admin_user(
    v_target_auth_user_id,
    'internal-revoke-sessions-target@example.com',
    'Internal Revoke Sessions Target',
    'active',
    '{"test": true}'::jsonb
  );

  perform touch_admin_session_control(
    v_target_auth_user_id,
    'internal-target-session-one',
    'internal-target-session-one',
    '{"test": true}'::jsonb
  );

  perform touch_admin_session_control(
    v_target_auth_user_id,
    'internal-target-session-two',
    'internal-target-session-two',
    '{"test": true}'::jsonb
  );

  v_count := revoke_all_admin_sessions_internal(
    v_target_auth_user_id,
    'internal security event',
    'smoke_internal_revoke',
    'internal-revoke-request',
    '{"test": true}'::jsonb
  );

  if v_count <> 2 then
    raise exception 'expected 2 internally revoked sessions, got %', v_count;
  end if;

  if not exists (
    select 1
    from admin_security_alert_events
    where alert_key = 'admin_all_sessions_revoked_internal'
      and target_auth_user_id = v_target_auth_user_id
  ) then
    raise exception 'internal session revocation alert missing';
  end if;
end $$;
