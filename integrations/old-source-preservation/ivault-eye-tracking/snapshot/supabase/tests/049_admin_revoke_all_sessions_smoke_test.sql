do $$
declare
  v_admin_auth_user_id uuid := gen_random_uuid();
  v_target_auth_user_id uuid := gen_random_uuid();
  v_admin_user_id uuid;
  v_target_user_id uuid;
  v_challenge_id uuid;
  v_count integer;
begin
  v_admin_user_id := upsert_admin_user(
    v_admin_auth_user_id,
    'revoke-all-sessions-actor@example.com',
    'Revoke All Sessions Actor',
    'active',
    '{"test": true}'::jsonb
  );

  v_target_user_id := upsert_admin_user(
    v_target_auth_user_id,
    'revoke-all-sessions-target@example.com',
    'Revoke All Sessions Target',
    'active',
    '{"test": true}'::jsonb
  );

  perform assign_admin_role(
    v_admin_auth_user_id,
    'super_admin',
    null,
    'revoke all sessions actor bootstrap'
  );

  insert into admin_mfa_factors (
    admin_auth_user_id,
    admin_user_id,
    factor_type,
    provider,
    status,
    label,
    secret_ciphertext,
    secret_key_version,
    confirmed_at,
    metadata
  )
  values (
    v_admin_auth_user_id,
    v_admin_user_id,
    'totp',
    'totp',
    'active',
    'Smoke Factor',
    'v1.fake.fake.fake',
    'v1',
    now(),
    '{"test": true}'::jsonb
  );

  v_challenge_id := create_admin_mfa_challenge(
    v_admin_auth_user_id,
    'stub',
    'privileged_action',
    'revoke-all-sessions-mfa',
    '{"test": true}'::jsonb
  );

  perform verify_admin_mfa_challenge_stub(
    v_admin_auth_user_id,
    v_challenge_id,
    '000000',
    'revoke-all-sessions-mfa',
    '{"test": true}'::jsonb
  );

  perform touch_admin_session_control(
    v_target_auth_user_id,
    'target-session-one',
    'target-session-one',
    '{"test": true}'::jsonb
  );

  perform touch_admin_session_control(
    v_target_auth_user_id,
    'target-session-two',
    'target-session-two',
    '{"test": true}'::jsonb
  );

  v_count := admin_revoke_all_sessions_for_admin(
    v_admin_auth_user_id,
    v_target_auth_user_id,
    'security review',
    'revoke-all-sessions-request',
    '{"test": true}'::jsonb
  );

  if v_count <> 2 then
    raise exception 'expected 2 revoked sessions, got %', v_count;
  end if;

  if exists (
    select 1
    from admin_session_controls
    where admin_auth_user_id = v_target_auth_user_id
      and status in ('active', 'reauth_required')
  ) then
    raise exception 'target still has active sessions';
  end if;
end $$;
