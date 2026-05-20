do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_session_id text := 'smoke-expire-session';
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'session-expire-admin@example.com',
    'Session Expire Admin',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'session expire smoke bootstrap'
  );

  perform touch_admin_session_control(
    v_admin_auth_user_id,
    v_session_id,
    'session-expire-touch',
    '{"test": true}'::jsonb
  );

  update admin_session_controls
  set last_seen_at = now() - interval '2 hours'
  where admin_auth_user_id = v_admin_auth_user_id
    and session_id = v_session_id;

  perform expire_admin_sessions(
    1000,
    '{"test": true, "scope": "session_expiration"}'::jsonb
  );

  if not exists (
    select 1
    from admin_session_controls
    where admin_auth_user_id = v_admin_auth_user_id
      and session_id = v_session_id
      and status = 'expired'
  ) then
    raise exception 'idle admin session was not expired';
  end if;
end $$;
